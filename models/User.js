const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    displayName: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 40
    },

    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[a-z0-9_]{3,24}$/
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 254
    },

    password: {
        type: String,
        required: true
    },

    avatar: {
        type: String,
        default: ""
    },

    banner: {
        type: String,
        default: ""
    },

    profileBackground: {
        type: String,
        default: ""
    },

    theme: {
        type: String,
        default: "Crimson"
    },
    aura: { type: String, default: "Crimson" },

    bio: {
        type: String,
        default: "",
        maxlength: 150
    },

    pronouns: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: [
            "Online",
            "Idle",
            "DND",
            "Invisible",
            "Gaming",
            "Chill"
        ],
        default: "Online"
    },

    statusNote: {
        type: String,
        default: "",
        trim: true,
        maxlength: 120
    },

    statusNoteExpiresAt: {
        type: Date,
        default: null
    },

    friends: {
        type: [String],
        default: []
    },

    blockedUsers: {
        type: [String],
        default: []
    },

    isBanned: { type: Boolean, default: false },
    bannedAt: { type: Date, default: null },
    banReason: { type: String, default: "", maxlength: 300 },

    reports: [
        {
            reportedBy: {
                type: String,
                required: true
            },
            reason: {
                type: String,
                default: ""
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ],

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("User", userSchema);
