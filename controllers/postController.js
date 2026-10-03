const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const Artwork = require("../models/Artwork");
const User = require("../models/User");
const { VIDEO_TYPES } = require("../middleware/uploadPost");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const AUTHOR_FIELDS = "displayName username avatar userType ratingAverage ratingCount commissionsOpen isBanned";

// The feed is public, but if a valid token is sent we can tell
// which posts the viewer has already liked.
const viewerIdFrom = (req) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return null;
    try {
        return String(jwt.verify(header.split(" ")[1], process.env.JWT_SECRET).id);
    } catch (_) {
        return null;
    }
};

const shapePost = (post, viewerId) => ({
    _id: post._id,
    caption: post.caption,
    media: post.media,
    artwork: post.artwork || null,
    author: post.author,
    createdAt: post.createdAt,
    likeCount: (post.likes || []).length,
    liked: viewerId ? (post.likes || []).some((id) => String(id) === viewerId) : false
});

// POST /api/posts  (multipart: caption, artworkId, media[])
const createPost = async (req, res) => {
    try {
        const files = req.files || [];
        if (files.length === 0) return fail(res, 400, "Add at least one photo or video.");

        const videos = files.filter((file) => VIDEO_TYPES.includes(file.mimetype));
        if (videos.length > 0 && files.length > 1) {
            return fail(res, 400, "A post can have up to 6 photos or one video, not both.");
        }

        const caption = String(req.body.caption || "").trim();
        if (caption.length > 1000) return fail(res, 400, "Caption must be 1000 characters or fewer.");

        let artwork = null;
        if (req.body.artworkId) {
            if (!mongoose.isValidObjectId(req.body.artworkId)) return fail(res, 400, "Invalid artwork.");
            const owned = await Artwork.findOne({ _id: req.body.artworkId, seller: req.user.id }).select("_id");
            if (!owned) return fail(res, 400, "You can only tag your own artwork.");
            artwork = owned._id;
        }

        const media = files
            .map((file) => ({
                url: file.secure_url || file.path || file.url,
                type: VIDEO_TYPES.includes(file.mimetype) ? "video" : "image"
            }))
            .filter((item) => item.url);

        if (media.length === 0) return fail(res, 400, "Upload failed. Please try again.");

        const post = await Post.create({ author: req.user.id, caption, media, artwork });
        res.status(201).json({ success: true, postId: post._id });
    } catch (err) {
        console.error(err);
        fail(res, 500, "Server Error");
    }
};

// GET /api/posts?author=username&page=1&limit=10
const listPosts = async (req, res) => {
    try {
        const viewerId = viewerIdFrom(req);
        const filter = {};

        if (req.query.author) {
            const author = await User.findOne({ username: String(req.query.author).toLowerCase() }).select("_id");
            if (!author) return res.json({ success: true, posts: [], page: 1, hasMore: false });
            filter.author = author._id;
        }

        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 20);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

        const rows = await Post.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit + 1)
            .populate({ path: "author", select: AUTHOR_FIELDS })
            .populate({ path: "artwork", select: "title images price forSale" })
            .lean();

        const hasMore = rows.length > limit;
        const posts = rows
            .slice(0, limit)
            .filter((post) => post.author && !post.author.isBanned)
            .map((post) => {
                delete post.author.isBanned;
                return shapePost(post, viewerId);
            });

        res.json({ success: true, posts, page, hasMore });
    } catch (err) {
        console.error(err);
        fail(res, 500, "Server Error");
    }
};

// POST /api/posts/:id/like  (toggles)
const toggleLike = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Post not found.");
        const userId = String(req.user.id);

        const post = await Post.findById(req.params.id).select("likes");
        if (!post) return fail(res, 404, "Post not found.");

        const alreadyLiked = post.likes.some((id) => String(id) === userId);
        const updated = await Post.findByIdAndUpdate(
            req.params.id,
            alreadyLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
            { new: true }
        ).select("likes");

        res.json({ success: true, liked: !alreadyLiked, likeCount: updated.likes.length });
    } catch (err) {
        console.error(err);
        fail(res, 500, "Server Error");
    }
};

// DELETE /api/posts/:id  (author only)
const deletePost = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Post not found.");

        const post = await Post.findById(req.params.id).select("author");
        if (!post) return fail(res, 404, "Post not found.");
        if (String(post.author) !== String(req.user.id)) return fail(res, 403, "You can only delete your own posts.");

        await post.deleteOne();
        res.json({ success: true, message: "Post deleted." });
    } catch (err) {
        console.error(err);
        fail(res, 500, "Server Error");
    }
};

module.exports = { createPost, listPosts, toggleLike, deletePost };
