const mongoose = require("mongoose");
const Artwork = require("../models/Artwork");
const User = require("../models/User");
const { ARTWORK_CATEGORIES } = require("../config/marketplace");

// ======================================
// Helpers
// ======================================

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Turns "fantasy, Dragon ,fantasy" into ["fantasy", "dragon"]
const cleanTags = (value) => {
    const list = Array.isArray(value) ? value : String(value || "").split(",");
    const tags = list
        .map((tag) => String(tag).trim().toLowerCase())
        .filter((tag) => tag && tag.length <= 24);
    return [...new Set(tags)];
};

// Form data arrives as text, so "true" / "false" need converting.
const toBool = (value) => value === true || value === "true";

const SELLER_FIELDS = "displayName username avatar userType ratingAverage ratingCount commissionsOpen";

// ======================================
// Create (sellers only)
// ======================================

const createArtwork = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("userType");
        if (!user) return fail(res, 404, "User not found.");
        if (user.userType !== "seller") {
            return fail(res, 403, "Switch to a seller account before posting artwork.");
        }

        const title = String(req.body.title || "").trim();
        const description = String(req.body.description || "").trim();
        const category = String(req.body.category || "");
        const tags = cleanTags(req.body.tags);
        const forSale = toBool(req.body.forSale);
        const price = forSale ? Number(req.body.price || 0) : 0;

        if (!title || title.length > 80) return fail(res, 400, "Title must be between 1 and 80 characters.");
        if (description.length > 1000) return fail(res, 400, "Description must be 1000 characters or fewer.");
        if (!ARTWORK_CATEGORIES.includes(category)) return fail(res, 400, "Choose a valid category.");
        if (tags.length > 10) return fail(res, 400, "You can add up to 10 tags.");
        if (!Number.isFinite(price) || price < 0 || price > 100000) return fail(res, 400, "Enter a valid price.");

        const images = (req.files || []).map((file) => file.secure_url || file.path || file.url).filter(Boolean);
        if (images.length === 0) return fail(res, 400, "Add at least one image.");

        const artwork = await Artwork.create({
            seller: req.user.id,
            title,
            description,
            category,
            tags,
            images,
            forSale,
            price
        });

        res.status(201).json({ success: true, artwork });
    } catch (err) {
        console.error(err);
        fail(res, 500, "Server Error");
    }
};

// ======================================
// List / search (public)
// GET /api/artworks?seller=alex&category=drawing&q=dragon&page=1&limit=12
// ======================================

const listArtworks = async (req, res) => {
    try {
        const filter = {};

        if (req.query.seller) {
            const seller = await User.findOne({ username: String(req.query.seller).toLowerCase() }).select("_id");
            if (!seller) return res.json({ success: true, artworks: [], total: 0, page: 1 });
            filter.seller = seller._id;
        }

        if (req.query.category) {
            if (!ARTWORK_CATEGORIES.includes(req.query.category)) return fail(res, 400, "Invalid category.");
            filter.category = req.query.category;
        }

        if (req.query.forSale === "1" || req.query.forSale === "true") filter.forSale = true;

        const q = String(req.query.q || "").trim().slice(0, 100);
        if (q) filter.$text = { $search: q };

        const sorts = {
            new: { createdAt: -1 },
            popular: { views: -1, createdAt: -1 },
            "price-low": { price: 1, createdAt: -1 },
            "price-high": { price: -1, createdAt: -1 }
        };
        const sort = sorts[req.query.sort] || { featured: -1, createdAt: -1 };

        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 24);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

        const [artworks, total] = await Promise.all([
            Artwork.find(filter)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("seller", SELLER_FIELDS),
            Artwork.countDocuments(filter)
        ]);

        res.json({ success: true, artworks, total, page });
    } catch (err) {
        console.error(err);
        fail(res, 500, "Server Error");
    }
};

// ======================================
// Get one (public)
// ======================================

const getArtwork = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Artwork not found.");

        const artwork = await Artwork.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        ).populate("seller", SELLER_FIELDS);

        if (!artwork) return fail(res, 404, "Artwork not found.");
        res.json({ success: true, artwork });
    } catch (err) {
        console.error(err);
        fail(res, 500, "Server Error");
    }
};

// ======================================
// Update (owner only)
// ======================================

const updateArtwork = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Artwork not found.");

        const artwork = await Artwork.findById(req.params.id);
        if (!artwork) return fail(res, 404, "Artwork not found.");
        if (String(artwork.seller) !== String(req.user.id)) return fail(res, 403, "You can only edit your own artwork.");

        const { title, description, category, tags, forSale, price, featured } = req.body;

        if (title !== undefined) {
            const clean = String(title).trim();
            if (!clean || clean.length > 80) return fail(res, 400, "Title must be between 1 and 80 characters.");
            artwork.title = clean;
        }
        if (description !== undefined) {
            const clean = String(description).trim();
            if (clean.length > 1000) return fail(res, 400, "Description must be 1000 characters or fewer.");
            artwork.description = clean;
        }
        if (category !== undefined) {
            if (!ARTWORK_CATEGORIES.includes(category)) return fail(res, 400, "Choose a valid category.");
            artwork.category = category;
        }
        if (tags !== undefined) {
            const list = cleanTags(tags);
            if (list.length > 10) return fail(res, 400, "You can add up to 10 tags.");
            artwork.tags = list;
        }
        if (forSale !== undefined) artwork.forSale = toBool(forSale);
        if (price !== undefined) {
            const value = Number(price);
            if (!Number.isFinite(value) || value < 0 || value > 100000) return fail(res, 400, "Enter a valid price.");
            artwork.price = value;
        }
        if (!artwork.forSale) artwork.price = 0;
        if (featured !== undefined) artwork.featured = toBool(featured);

        await artwork.save();
        res.json({ success: true, artwork });
    } catch (err) {
        console.error(err);
        fail(res, 500, "Server Error");
    }
};

// ======================================
// Delete (owner only)
// ======================================

const deleteArtwork = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Artwork not found.");

        const artwork = await Artwork.findById(req.params.id).select("seller");
        if (!artwork) return fail(res, 404, "Artwork not found.");
        if (String(artwork.seller) !== String(req.user.id)) return fail(res, 403, "You can only delete your own artwork.");

        await artwork.deleteOne();
        res.json({ success: true, message: "Artwork deleted." });
    } catch (err) {
        console.error(err);
        fail(res, 500, "Server Error");
    }
};

module.exports = { createArtwork, listArtworks, getArtwork, updateArtwork, deleteArtwork };
