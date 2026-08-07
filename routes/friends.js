const express = require("express");
const router = express.Router();
const {
    searchUsers,
    addFriend,
    removeFriend,
    blockUser,
    unblockUser,
    getBlockedUsers,
    reportUser,
    getFriends,
    getFriendProfile
} = require("../controllers/friendController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/search", authMiddleware, searchUsers);
router.get("/list", authMiddleware, getFriends);
router.get("/blocked", authMiddleware, getBlockedUsers);
router.post("/add", authMiddleware, addFriend);
router.post("/remove", authMiddleware, removeFriend);
router.post("/block", authMiddleware, blockUser);
router.post("/unblock", authMiddleware, unblockUser);
router.post("/report", authMiddleware, reportUser);
router.get("/profile/:username", authMiddleware, getFriendProfile);

module.exports = router;
