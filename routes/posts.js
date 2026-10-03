const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const uploadPost = require("../middleware/uploadPost");
const { createPost, listPosts, toggleLike, deletePost } = require("../controllers/postController");

router.get("/", listPosts);                                                   // public feed
router.post("/", authMiddleware, uploadPost.array("media", 6), createPost);   // new post
router.post("/:id/like", authMiddleware, toggleLike);                         // like / unlike
router.delete("/:id", authMiddleware, deletePost);                            // delete own post

module.exports = router;
