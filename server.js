require("dotenv").config();

const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");
const Chat = require("./models/Chat");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const friendsRoutes = require("./routes/friends");
const chatRoutes = require("./routes/chat");
const adminRoutes = require("./routes/admin");
const gifRoutes = require("./routes/gifs");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ===============================
// Connect MongoDB
// ===============================

connectDB();

// ===============================
// Middleware
// ===============================

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===============================
// API Routes
// ===============================

app.use("/api/auth", authRoutes);

app.use("/api/profile", profileRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/gifs", gifRoutes);

app.use((error, req, res, next) => {
    if (error) {
        console.error(error.message);
        const isCloudinaryAuthError = error.http_code === 401 || error.http_code === 403;
        return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
            success: false,
            message: error.code === "LIMIT_FILE_SIZE"
                ? "Files must be 10 MB or smaller."
                : isCloudinaryAuthError
                    ? "Image hosting rejected this upload. In Render, replace the Cloudinary credentials with the current values from your Cloudinary dashboard, then redeploy."
                    : (error.message || "Request could not be completed.")
        });
    }
    next();
});

// ===============================
// Home
// ===============================

app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "public", "index.html"));

});

// ===============================
// Socket.IO
// ===============================

const activeRooms = new Map();

io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("Authentication required"));
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        next(new Error("Authentication required"));
    }
});

io.on("connection", (socket) => {

    console.log("🟢 User Connected:", socket.id);

    socket.on("joinRoom", async ({ roomId }) => {
        if (!roomId) return;
        const chat = await Chat.findById(roomId).select("participants").catch(() => null);
        if (!chat || !chat.participants.includes(socket.user.username)) return;
        const username = socket.user.username;
        socket.join(roomId);
        activeRooms.set(socket.id, { roomId, username });
        socket.to(roomId).emit("systemMessage", `${username} joined the chat.`);
    });

    socket.on("sendMessage", ({ roomId, message }) => {
        if (!roomId || !message || activeRooms.get(socket.id)?.roomId !== roomId) return;
        const payload = {
            ...message,
            createdAt: new Date().toISOString()
        };
        // Broadcast to room *except* the sender to avoid duplicate messages
        socket.to(roomId).emit("receiveMessage", payload);
    });

    socket.on("unsendMessage", ({ roomId, messageId }) => {
        if (!roomId || !messageId || activeRooms.get(socket.id)?.roomId !== roomId) return;
        socket.to(roomId).emit("messageUnsent", { messageId });
    });

    socket.on("messageReaction", ({ roomId, messageId, reactions }) => {
        if (!roomId || !messageId || activeRooms.get(socket.id)?.roomId !== roomId) return;
        socket.to(roomId).emit("messageReaction", { messageId, reactions });
    });

    socket.on("typing", ({ roomId, isTyping }) => {
        if (!roomId || activeRooms.get(socket.id)?.roomId !== roomId) return;
        socket.to(roomId).emit("typing", { username: socket.user.username, isTyping: !!isTyping });
    });

    socket.on("callOffer", ({ roomId, offer }) => {
        if (!roomId || !offer || activeRooms.get(socket.id)?.roomId !== roomId) return;
        socket.to(roomId).emit("callOffer", { offer, from: socket.id });
    });

    socket.on("callAnswer", ({ roomId, answer }) => {
        if (!roomId || !answer || activeRooms.get(socket.id)?.roomId !== roomId) return;
        socket.to(roomId).emit("callAnswer", { answer, from: socket.id });
    });

    socket.on("callIce", ({ roomId, candidate }) => {
        if (!roomId || !candidate || activeRooms.get(socket.id)?.roomId !== roomId) return;
        socket.to(roomId).emit("callIce", { candidate, from: socket.id });
    });

    socket.on("callEnd", ({ roomId }) => {
        if (!roomId || activeRooms.get(socket.id)?.roomId !== roomId) return;
        socket.to(roomId).emit("callEnd");
    });

    socket.on("disconnect", () => {
        const meta = activeRooms.get(socket.id);
        if (meta) {
            socket.to(meta.roomId).emit("systemMessage", `${meta.username} left the chat.`);
            activeRooms.delete(socket.id);
        }
        console.log("🔴 User Disconnected", socket.id);
    });

});

// ===============================
// Server
// ===============================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(`🚀 VOXELLA running on http://localhost:${PORT}`);

});
