const User = require("../models/User");
module.exports = async (req, res, next) => {
  const user = await User.findById(req.user.id).select("email").catch(() => null);
  if (!user || !process.env.ADMIN_EMAIL || user.email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) return res.status(403).json({ success: false, message: "Administrator access required." });
  next();
};
