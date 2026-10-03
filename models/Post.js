const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    caption: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000
    },

    // Photos (up to 6) OR one video. `url` comes from Cloudinary.
    media: {
        type: [{
            url: { type: String, required: true },
            type: { type: String, enum: ["image", "video"], required: true },
            _id: false
        }],
        validate: [(list) => list.length >= 1 && list.length <= 6, "A post needs 1 to 6 files."]
    },

    // Optional: link the post to one of the author's artworks
    artwork: { type: mongoose.Schema.Types.ObjectId, ref: "Artwork", default: null },

    // Who liked it. Only the server changes this.
    likes: { type: [mongoose.Schema.Types.ObjectId], default: [] }

}, { timestamps: true });

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
