const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { listArtists } = require("../controllers/artistController");

router.get("/", authMiddleware, listArtists); // members only

module.exports = router;
