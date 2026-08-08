const User = require("../models/User");
module.exports = async (req, res, next) => {
  const user = await User.findById(req.user.id).select("email role").catch(() => null);
  if (!user || !process.env.ADMIN_EMAIL) return res.status(403).json({ success: false, message: "Administrator access required." });
  req.isOwner = user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  if (!req.isOwner && user.role !== "sub_admin") return res.status(403).json({ success: false, message: "Administrator access required." });
  next();
};
