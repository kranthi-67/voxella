const mongoose = require("mongoose");
const { ARTWORK_CATEGORIES } = require("../config/marketplace");

const artworkSchema = new mongoose.Schema({

    // Who posted it. This points to a User document.
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 80
    },

    description: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000
    },

    category: {
        type: String,
        enum: ARTWORK_CATEGORIES,
        required: true
    },

    // Image URLs (from Cloudinary). The first one is used as the cover.
    images: {
        type: [String],
        default: [],
        validate: [(list) => list.length <= 8, "You can add up to 8 images."]
    },

    // Link to a .glb 3D file, only for the "3d-model" category.
    modelUrl: {
        type: String,
        default: ""
    },

    tags: {
        type: [{ type: String, trim: true, lowercase: true, maxlength: 24 }],
        default: [],
        validate: [(list) => list.length <= 10, "You can add up to 10 tags."]
    },

    // false = portfolio piece only, true = can be bought
    forSale: { type: Boolean, default: false },

    // 0 is allowed (free). Payments are added in a later step.
    price: { type: Number, default: 0, min: 0 },

    // Sellers can pin favourites to the top of their profile.
    featured: { type: Boolean, default: false },

    views: { type: Number, default: 0, min: 0 }

}, { timestamps: true });

// Fast lookups: "all works by this seller, newest first" and search by text.
artworkSchema.index({ seller: 1, createdAt: -1 });
artworkSchema.index({ title: "text", tags: "text" });

module.exports = mongoose.model("Artwork", artworkSchema);
