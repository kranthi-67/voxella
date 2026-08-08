const User = require("../models/User");
exports.getOverview = async (req, res) => {
  const users = await User.find().select("displayName username email avatar isBanned banReason reports createdAt").sort({ createdAt: -1 }).lean();
  res.json({ success: true, users: users.map((user) => ({ ...user, reportCount: user.reports.length, reports: user.reports })) });
};
exports.setBan = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase(); const banned = Boolean(req.body.banned);
  if (!email) return res.status(400).json({ success: false, message: "Email is required." });
  if (email === String(process.env.ADMIN_EMAIL || "").toLowerCase()) return res.status(400).json({ success: false, message: "You cannot ban the administrator account." });
  const user = await User.findOneAndUpdate({ email }, { isBanned: banned, bannedAt: banned ? new Date() : null, banReason: banned ? String(req.body.reason || "").trim().slice(0, 300) : "" }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: "No account found with that email." });
  res.json({ success: true, message: banned ? "Account banned." : "Account restored." });
};
