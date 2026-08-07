const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({

    email: {
        type: String,
        required: true
    },

    otp: {
        type: String,
        required: true
    },

    expiresAt: {
        type: Date,
        required: true
    },

    verifiedAt: {
        type: Date,
        default: null
    }

});

module.exports = mongoose.model("Otp", otpSchema);
