const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const User = require("../models/User");

const createAttachmentMessage = async (chat, username, messageData) => {
  const message = {
    messageId: new mongoose.Types.ObjectId().toString(),
    sender: username,
    type: messageData.type,
    text: messageData.text || (messageData.type === "image" ? "Sent an image." : messageData.type === "video" ? "Sent a video." : "Sent a voice note."),
    mediaUrl: messageData.mediaUrl || "",
    readBy: [username]
  };
  chat.messages.push(message);
  chat.lastMessage = {
    sender: username,
    text: message.text,
    createdAt: new Date()
  };
  await chat.save();
  return message;
};

const getUserChats = async (req, res) => {
  try {
    const username = req.user.username;
    const self = await User.findOne({ username }).select("friends");
    if (!self) return res.status(404).json({ success: false, message: "User not found." });

    const chats = await Chat.find({ participants: username, type: { $in: ["private", "group"] } })
      .sort({ updatedAt: -1 })
      .select("_id type title participants messages.sender messages.readBy lastMessage updatedAt");

    const friendChats = chats.filter((chat) => {
      if (chat.type === "group") return true;
      const other = chat.participants.find((participant) => participant !== username);
      return other && self.friends.includes(other);
    });
    const friendUsernames = friendChats.filter((chat) => chat.type === "private").map((chat) => chat.participants.find((participant) => participant !== username));
    const friends = await User.find({ username: { $in: friendUsernames } })
      .select("username displayName avatar banner bio status").lean();
    const friendsByUsername = new Map(friends.map((friend) => [friend.username, friend]));

    res.json({ success: true, chats: friendChats.map((chat) => ({
      ...chat.toObject(),
      friend: chat.type === "group" ? null : friendsByUsername.get(chat.participants.find((participant) => participant !== username)) || null,
      unreadCount: chat.messages.filter((message) => message.sender !== username && !(message.readBy || []).includes(username)).length
    })).filter((chat) => chat.type === "group" || chat.friend) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getChat = async (req, res) => {
  try {
    const username = req.user.username;
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });
    if (!chat.participants.includes(username)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    const visibleChat = chat.toObject();
    visibleChat.messages = visibleChat.messages.filter((message) => !(message.hiddenFor || []).includes(username));
    await Chat.updateOne({ _id: chatId }, { $addToSet: { "messages.$[message].readBy": username } }, { arrayFilters: [{ "message.sender": { $ne: username } }] });
    res.json({ success: true, chat: visibleChat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const createPrivateChat = async (req, res) => {
  try {
    const username = req.user.username;
    const { target } = req.body;
    if (!target) return res.status(400).json({ success: false, message: "Target username required." });
    if (target === username) return res.status(400).json({ success: false, message: "Cannot start chat with yourself." });

    const targetUser = await User.findOne({ username: target });
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found." });

    const self = await User.findOne({ username }).select("friends blockedUsers");
    if (!self.friends.includes(target) || self.blockedUsers.includes(target) || targetUser.blockedUsers.includes(username)) {
      return res.status(403).json({ success: false, message: "You can only start private chats with friends who have not blocked you." });
    }

    let chat = await Chat.findOne({
      type: "private",
      participants: { $all: [username, target], $size: 2 }
    });

    if (!chat) {
      chat = await Chat.create({
        type: "private",
        participants: [username, target],
        title: `${username} / ${target}`,
        lastMessage: { sender: "system", text: "Chat started." }
      });
    }

    res.json({ success: true, chatId: chat._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const createGroupChat = async (req, res) => {
  try {
    const username = req.user.username;
    const title = String(req.body.title || "New group").trim().slice(0, 50) || "New group";
    const members = [...new Set((req.body.members || []).map((member) => String(member).trim().toLowerCase()))].filter((member) => member && member !== username);
    if (!members.length) return res.status(400).json({ success: false, message: "Choose at least one friend." });
    const self = await User.findOne({ username }).select("friends blockedUsers");
    if (!self || members.some((member) => !self.friends.includes(member) || self.blockedUsers.includes(member))) return res.status(403).json({ success: false, message: "Groups can only include your friends." });
    const people = await User.find({ username: { $in: members } }).select("username blockedUsers");
    if (people.length !== members.length || people.some((person) => person.blockedUsers.includes(username))) return res.status(403).json({ success: false, message: "One or more friends cannot be added." });
    const chat = await Chat.create({ type: "group", participants: [username, ...members], title, lastMessage: { sender: "system", text: "Group created." } });
    res.status(201).json({ success: true, chatId: chat._id });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: "Server Error" }); }
};

const createRandomChat = async (req, res) => {
  try {
    const username = req.user.username;
    const minParticipants = 2;
    const target = req.body.target || null;

    if (target) {
      return res.status(400).json({ success: false, message: "Use the private chat endpoint to message a friend." });
    }

    let waitingChat = await Chat.findOne({
      type: "random",
      isOpen: true,
      participants: { $nin: [username] }
    });

    if (waitingChat) {
      if (!waitingChat.participants.includes(username)) {
        waitingChat.participants.push(username);
      }
      waitingChat.lastMessage = { sender: "system", text: "Match found." };
      if (waitingChat.participants.length >= minParticipants) {
        waitingChat.isOpen = false;
      }
      await waitingChat.save();
      const stillWaiting = waitingChat.participants.length < minParticipants;
      return res.json({ success: true, chatId: waitingChat._id, waiting: stillWaiting });
    }

    const newChat = await Chat.create({
      type: "random",
      participants: [username],
      title: "Random Match",
      isOpen: true,
      lastMessage: { sender: "system", text: "Waiting for a match..." }
    });
    res.json({ success: true, chatId: newChat._id, waiting: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const username = req.user.username;
    const chatId = req.params.id;
    const { text, type = "text" } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });
    if (!chat.participants.includes(username)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (type !== "text") {
      return res.status(400).json({ success: false, message: "Use the upload endpoint for media messages." });
    }
    if (!text || !text.trim() || text.trim().length > 2000) {
      return res.status(400).json({ success: false, message: "Message text required." });
    }

    const message = {
      messageId: new mongoose.Types.ObjectId().toString(),
      sender: username,
      type: "text",
      text: text.trim(),
      mediaUrl: "",
      readBy: [username]
    };
    chat.messages.push(message);
    chat.lastMessage = { sender: username, text: message.text, createdAt: new Date() };
    await chat.save();

    res.json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const uploadChatAttachment = async (req, res) => {
  try {
    const username = req.user.username;
    const { chatId, messageType } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }
    if (!chatId) {
      return res.status(400).json({ success: false, message: "Chat ID required." });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });
    if (!chat.participants.includes(username)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    if (!["private", "group"].includes(chat.type)) {
      return res.status(403).json({ success: false, message: "Media attachments are not available in this chat." });
    }

    if (messageType === "image" && !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Choose a PNG, JPG, WEBP, or GIF image." });
    }
    if (messageType === "video" && !["video/mp4", "video/webm"].includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Choose an MP4 or WEBM video." });
    }

    const validTypes = ["image", "video", "voice"];
    const type = validTypes.includes(messageType) ? messageType : "image";
    const mediaUrl = req.file.secure_url || req.file.path || req.file.url;
    if (!mediaUrl) {
      return res.status(500).json({ success: false, message: "Upload completed but no media URL was returned." });
    }
    const messageData = {
      type,
      mediaUrl,
      text: type === "voice" ? "Sent a voice note." : type === "video" ? "Sent a video." : req.file.mimetype === "image/gif" ? "Sent a GIF." : "Sent an image."
    };
    const message = await createAttachmentMessage(chat, username, messageData);

    res.json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const unsendMessage = async (req, res) => {
  try {
    const username = req.user.username;
    const { id: chatId, messageId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });
    if (!chat.participants.includes(username)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const messageIndex = chat.messages.findIndex((msg) => msg.messageId === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    const message = chat.messages[messageIndex];
    if (message.sender !== username) {
      return res.status(403).json({ success: false, message: "You may only unsend your own messages." });
    }

    chat.messages.splice(messageIndex, 1);

    if (chat.messages.length) {
      const last = chat.messages[chat.messages.length - 1];
      chat.lastMessage = {
        sender: last.sender,
        text: last.text,
        createdAt: last.createdAt
      };
    } else {
      chat.lastMessage = {
        sender: "system",
        text: "No messages yet.",
        createdAt: new Date()
      };
    }

    await chat.save();

    res.json({ success: true, message: "Message removed." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteForMe = async (req, res) => {
  try {
    const username = req.user.username;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });
    if (!chat.participants.includes(username)) return res.status(403).json({ success: false, message: "Access denied." });
    const message = chat.messages.find((item) => item.messageId === req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found." });
    if (!message.hiddenFor.includes(username)) message.hiddenFor.push(username);
    await chat.save();
    res.json({ success: true, message: "Message deleted for you." });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: "Server Error" }); }
};

const toggleReaction = async (req, res) => {
  try {
    const username = req.user.username;
    const emoji = String(req.body.emoji || "").trim();
    if (!["👍", "❤️", "😂", "😮", "😢"].includes(emoji)) return res.status(400).json({ success: false, message: "Unsupported reaction." });
    const chat = await Chat.findById(req.params.id);
    if (!chat || !chat.participants.includes(username)) return res.status(404).json({ success: false, message: "Chat not found." });
    const message = chat.messages.find((item) => item.messageId === req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found." });
    if (!message.reactions) message.reactions = [];
    let reaction = message.reactions.find((item) => item.emoji === emoji);
    if (!reaction) { message.reactions.push({ emoji, users: [username] }); } else if (reaction.users.includes(username)) { reaction.users = reaction.users.filter((user) => user !== username); } else { reaction.users.push(username); }
    message.reactions = message.reactions.filter((item) => item.users.length);
    await chat.save();
    res.json({ success: true, reactions: message.reactions });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Unable to update reaction." }); }
};

const sendGif = async (req, res) => {
  try {
    const username = req.user.username;
    const mediaUrl = String(req.body.mediaUrl || "");
    const parsed = new URL(mediaUrl);
    if (!/^(media|c)\.tenor\.com$/i.test(parsed.hostname)) return res.status(400).json({ success: false, message: "Choose a GIF from Tenor." });
    const chat = await Chat.findById(req.params.id);
    if (!chat || !chat.participants.includes(username) || !["private", "group"].includes(chat.type)) return res.status(403).json({ success: false, message: "GIFs are not available in this chat." });
    const message = await createAttachmentMessage(chat, username, { type: "image", mediaUrl, text: "Sent a GIF." });
    res.json({ success: true, message });
  } catch (_) { res.status(400).json({ success: false, message: "Invalid GIF." }); }
};

module.exports = {
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
};
