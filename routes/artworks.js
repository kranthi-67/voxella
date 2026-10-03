const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const uploadArtwork = require("../middleware/uploadArtwork");

const {
    createArtwork,
    listArtworks,
    getArtwork,
    updateArtwork,
    deleteArtwork
} = require("../controllers/artworkController");

// Members only: you must be logged in to browse
router.get("/", authMiddleware, listArtworks);
router.get("/:id", authMiddleware, getArtwork);

// Logged in: post, edit, delete
router.post("/", authMiddleware, uploadArtwork.array("images", 8), createArtwork);
router.put("/:id", authMiddleware, updateArtwork);
router.delete("/:id", authMiddleware, deleteArtwork);

module.exports = router;
