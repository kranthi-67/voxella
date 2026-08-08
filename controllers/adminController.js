const User = require("../models/User");
exports.getOverview = async (req, res) => {
  const users = await User.find().select("displayName username email avatar isBanned banReason role reports createdAt").sort({ createdAt: -1 }).lean();
  res.json({ success: true, isOwner: req.isOwner, users: users.map((user) => ({ ...user, isOwner: user.email.toLowerCase() === String(process.env.ADMIN_EMAIL || "").toLowerCase(), reportCount: user.reports.length, reports: user.reports })) });
};
exports.setBan = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase(); const banned = Boolean(req.body.banned);
  if (!email) return res.status(400).json({ success: false, message: "Email is required." });
  if (email === String(process.env.ADMIN_EMAIL || "").toLowerCase()) return res.status(400).json({ success: false, message: "The original owner account cannot be banned." });
  const user = await User.findOneAndUpdate({ email }, { isBanned: banned, bannedAt: banned ? new Date() : null, banReason: banned ? String(req.body.reason || "").trim().slice(0, 300) : "" }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: "No account found with that email." });
  res.json({ success: true, message: banned ? "Account banned." : "Account restored." });
};

exports.setSubAdmin = async (req, res) => {
  if (!req.isOwner) return res.status(403).json({ success: false, message: "Only the original owner can manage sub-admins." });
  const email = String(req.body.email || "").trim().toLowerCase(); const enabled = Boolean(req.body.enabled);
  if (!email || email === String(process.env.ADMIN_EMAIL || "").toLowerCase()) return res.status(400).json({ success: false, message: "The original owner role cannot be changed." });
  const user = await User.findOneAndUpdate({ email }, { role: enabled ? "sub_admin" : "user" }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: "No account found with that email." });
  res.json({ success: true, message: enabled ? "Sub-admin access granted." : "Sub-admin access removed." });
};
