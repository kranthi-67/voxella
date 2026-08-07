const User = require("../models/User");

const searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.json({ success: true, users: [] });
    }
    const regex = new RegExp(query, "i");
    const users = await User.find({
      $or: [{ username: regex }, { displayName: regex }],
      username: { $ne: req.user.username }
    })
      .select("username displayName avatar status bio theme banner profileBackground")
      .limit(20);

    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getFriends = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }).select("friends");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const friends = await User.find({ username: { $in: user.friends } })
      .select("username displayName avatar status bio theme banner profileBackground");
    res.json({ success: true, friends });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const addFriend = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: "Username required." });
    if (username === req.user.username) {
      return res.status(400).json({ success: false, message: "Cannot add yourself." });
    }
    const target = await User.findOne({ username });
    if (!target) return res.status(404).json({ success: false, message: "User not found." });
    const self = await User.findOne({ username: req.user.username });
    if (self.friends.includes(username)) {
      return res.status(400).json({ success: false, message: "Already friends." });
    }
    if (self.blockedUsers.includes(username) || target.blockedUsers.includes(req.user.username)) {
      return res.status(400).json({ success: false, message: "Cannot add friend while blocked." });
    }
    self.friends.push(username);
    if (!target.friends.includes(req.user.username)) {
      target.friends.push(req.user.username);
    }
    await self.save();
    await target.save();
    res.json({ success: true, message: "Friend added." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const removeFriend = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: "Username required." });
    const self = await User.findOne({ username: req.user.username });
    const target = await User.findOne({ username });
    self.friends = self.friends.filter((u) => u !== username);
    await self.save();
    if (target) {
      target.friends = target.friends.filter((u) => u !== req.user.username);
      await target.save();
    }
    res.json({ success: true, message: "Friend removed." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const blockUser = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: "Username required." });
    const self = await User.findOne({ username: req.user.username });
    const target = await User.findOne({ username });
    if (!self.blockedUsers.includes(username)) {
      self.blockedUsers.push(username);
    }
    self.friends = self.friends.filter((u) => u !== username);
    await self.save();
    if (target) {
      target.friends = target.friends.filter((u) => u !== req.user.username);
      await target.save();
    }
    res.json({ success: true, message: "User blocked." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: "Username required." });
    const self = await User.findOne({ username: req.user.username });
    if (!self.blockedUsers.includes(username)) {
      return res.status(400).json({ success: false, message: "User is not blocked." });
    }
    self.blockedUsers = self.blockedUsers.filter((u) => u !== username);
    await self.save();
    res.json({ success: true, message: "User unblocked." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }).select("blockedUsers");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const blocked = await User.find({ username: { $in: user.blockedUsers } })
      .select("username displayName avatar status bio theme banner profileBackground");
    res.json({ success: true, blocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const reportUser = async (req, res) => {
  try {
    const { username, reason } = req.body;
    if (!username) return res.status(400).json({ success: false, message: "Username required." });
    const target = await User.findOne({ username });
    if (!target) return res.status(404).json({ success: false, message: "User not found." });
    target.reports.push({ reportedBy: req.user.username, reason: reason || "" });
    await target.save();
    res.json({ success: true, message: "Report submitted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getFriendProfile = async (req, res) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({ username }).select("-password -reports");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  searchUsers,
  getFriends,
  addFriend,
  removeFriend,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  getFriendProfile,
};
