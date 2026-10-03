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

// Public: anyone can browse
router.get("/", listArtworks);
router.get("/:id", getArtwork);

// Logged in: post, edit, delete
router.post("/", authMiddleware, uploadArtwork.array("images", 8), createArtwork);
router.put("/:id", authMiddleware, updateArtwork);
router.delete("/:id", authMiddleware, deleteArtwork);

module.exports = router;
