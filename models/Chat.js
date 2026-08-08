const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    sender: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    type: {
        type: String,
        enum: ["text", "image", "video", "voice", "system"],
        default: "text"
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    mediaUrl: {
        type: String,
        default: ""
    },
    hiddenFor: {
        type: [String],
        default: []
    },
    readBy: { type: [String], default: [] },
    reactions: [{
        emoji: { type: String, required: true },
        users: { type: [String], default: [] },
        _id: false
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const chatSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["private", "group", "random"],
        default: "private"
    },
    title: {
        type: String,
        default: "Chat"
    },
    participants: {
        type: [String],
        required: true,
        default: []
    },
    owner: { type: String, default: "", trim: true, lowercase: true },
    avatar: { type: String, default: "" },
    isOpen: {
        type: Boolean,
        default: true
    },
    messages: {
        type: [messageSchema],
        default: []
    },
    lastMessage: {
        sender: {
            type: String,
            default: "system"
        },
        text: {
            type: String,
            default: ""
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true
});

// Mongoose `timestamps: true` already maintains `createdAt`/`updatedAt`.
// Removing manual pre-save hook which caused `next is not a function` errors
// with newer Mongoose/Kareem hook behavior.

module.exports = mongoose.model("Chat", chatSchema);
