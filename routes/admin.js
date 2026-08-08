const express = require("express"); const auth = require("../middleware/authMiddleware"); const admin = require("../middleware/adminMiddleware"); const { getOverview, setBan } = require("../controllers/adminController"); const router = express.Router();
router.get("/overview", auth, admin, getOverview); router.post("/ban", auth, admin, setBan); module.exports = router;
