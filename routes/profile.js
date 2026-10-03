const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");
const authMiddleware = require("../middleware/authMiddleware");

const {

    uploadMedia,
    updateProfile,
    getProfile,
    completeOnboarding

} = require("../controllers/profileController");

// Upload avatar/banner/background
router.post(

    "/upload",
    authMiddleware,
    upload.single("image"),

    uploadMedia

);

// Update bio/theme/pronouns/status
router.put(

    "/update",
    authMiddleware,
    updateProfile

);

// First-time setup (buyer/artist + art types)
router.put("/onboarding", authMiddleware, completeOnboarding);

// Get profile
router.get(

    "/:username",

    getProfile

);

module.exports = router;
