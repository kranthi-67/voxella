const express = require("express");
const router = express.Router();
const { listArtists } = require("../controllers/artistController");

router.get("/", listArtists); // public

module.exports = router;
