const jwt = require("jsonwebtoken");

// Verifies the JWT sent as "Authorization: Bearer <token>" and
// attaches the decoded payload ({ id, username }) to req.user.

const authMiddleware = (req, res, next) => {

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