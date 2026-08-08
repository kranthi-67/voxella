const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const {
  getUserChats,
  getChat,
  createPrivateChat,
  createGroupChat,
  createRandomChat,
  sendMessage,
  uploadChatAttachment,
  unsendMessage,
  deleteForMe
  ,toggleReaction, sendGif
} = require("../controllers/chatController");

router.get("/list", authMiddleware, getUserChats);
router.post("/private", authMiddleware, createPrivateChat);
router.post("/group", authMiddleware, createGroupChat);
router.post("/random", authMiddleware, createRandomChat);
router.post("/upload", authMiddleware, upload.single("file"), uploadChatAttachment);
router.get("/:id", authMiddleware, getChat);
router.post("/:id/message", authMiddleware, sendMessage);
router.delete("/:id/message/:messageId", authMiddleware, unsendMessage);
router.patch("/:id/message/:messageId/hide", authMiddleware, deleteForMe);
router.post("/:id/message/:messageId/reaction", authMiddleware, toggleReaction);
router.post("/:id/gif", authMiddleware, sendGif);

module.exports = router;
