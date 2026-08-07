const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Otp = require("../models/Otp");
const sendEmail = require("../utils/sendEmail");

// ======================================
// Helpers
// ======================================

const generateToken = (user) => {

    return jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );

};

// ======================================
// Signup
// ======================================

const signup = async (req, res) => {
    try {

        const displayName = String(req.body.displayName || "").trim();
        const email = normalizeEmail(req.body.email);
        const username = normalizeUsername(req.body.username);
        const password = String(req.body.password || "");

        if (!displayName || displayName.length > 40 || !/^[a-z0-9_]{3,24}$/.test(username) ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
            return res.status(400).json({ success: false, message: "Please enter a valid display name, email, username, and password (8+ characters)." });
        }

        const existingEmail = await User.findOne({ email });

        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: "Email already registered."
            });
        }

        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Username already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            displayName,
            email,
            username,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: "Account created successfully!"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
};

// ======================================
// Login
// ======================================

const login = async (req, res) => {

    try {

        const username = normalizeUsername(req.body.username);
        const password = String(req.body.password || "");

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                id: user._id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar
            }
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

// ======================================
// Me (current logged-in user)
// ======================================

const me = async (req, res) => {

    try {

        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

// ======================================
// Forgot Password
// ======================================

const forgotPassword = async (req, res) => {

    try {

        const email = normalizeEmail(req.body.email);

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No account found with this email."
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.deleteMany({ email });

        await Otp.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendEmail(
            email,
            "VOXELLA Password Reset",
            `Your VOXELLA verification code is:

${otp}

This code expires in 5 minutes.`
        );

        res.json({
            success: true,
            message: "OTP sent successfully."
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

// ======================================
// Verify OTP
// ======================================

const verifyOtp = async (req, res) => {

    try {

        const email = normalizeEmail(req.body.email);
        const otp = String(req.body.otp || "").trim();

        const record = await Otp.findOne({ email, otp });

        if (!record) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP."
            });
        }

        if (record.expiresAt < new Date()) {

            await Otp.deleteMany({ email });

            return res.status(400).json({
                success: false,
                message: "OTP has expired."
            });

        }

        record.verifiedAt = new Date();
        await record.save();

        const resetToken = jwt.sign(
            { email, purpose: "password-reset" },
            process.env.JWT_SECRET,
            { expiresIn: "5m" }
        );

        res.json({
            success: true,
            message: "OTP verified.",
            resetToken
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

// ======================================
// Reset Password
// ======================================

const resetPassword = async (req, res) => {

    try {

        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || "");
        const resetToken = String(req.body.resetToken || "");

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
        }

        let resetPayload;
        try {
            resetPayload = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(400).json({ success: false, message: "Verify a current OTP before resetting your password." });
        }
        if (resetPayload.purpose !== "password-reset" || resetPayload.email !== email) {
            return res.status(400).json({ success: false, message: "Verify a current OTP before resetting your password." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const updated = await User.updateOne(
            { email },
            { password: hashedPassword }
        );

        if (!updated.matchedCount) {
            return res.status(404).json({ success: false, message: "No account found with this email." });
        }

        await Otp.deleteMany({ email });

        res.json({
            success: true,
            message: "Password updated successfully."
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

// ======================================
// Exports
// ======================================

module.exports = {
    signup,
    login,
    me,
    forgotPassword,
    verifyOtp,
    resetPassword
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeUsername = (username) => String(username || "").trim().toLowerCase();
