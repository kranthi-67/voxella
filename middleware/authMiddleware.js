const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the JWT sent as "Authorization: Bearer <token>" and
// attaches the decoded payload ({ id, username }) to req.user.

const authMiddleware = async (req, res, next) => {

    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {

        return res.status(401).json({
            success: false,
            message: "Not authorized. Please log in."
        });

    }

    const token = header.split(" ")[1];

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("isBanned");
        if (!user || user.isBanned) {
            return res.status(403).json({ success: false, message: "This account has been banned." });
        }

        req.user = decoded;

        next();

    } catch (err) {

        return res.status(401).json({
            success: false,
            message: "Session expired. Please log in again."
        });

    }

};

module.exports = authMiddleware;
