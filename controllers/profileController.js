const User = require("../models/User");
const { SPECIALTIES } = require("../config/marketplace");

// =====================================
// Upload Avatar / Banner / Background
// =====================================

const uploadMedia = async (req, res) => {

    try {

        const { type } = req.body;
        const username = req.user.username;

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message: "No file uploaded."
            });

        }

        const user = await User.findOne({ username });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        const update = {};

        if (type === "avatar") {

            update.avatar = req.file.secure_url || req.file.path || req.file.url;

        } else if (type === "banner") {

            update.banner = req.file.secure_url || req.file.path || req.file.url;

        } else if (type === "background") {

            update.profileBackground = req.file.secure_url || req.file.path || req.file.url;

        } else {

            return res.status(400).json({
                success: false,
                message: "Invalid upload type."
            });

        }

        await User.updateOne(
            { username },
            { $set: update }
        );

        res.json({
            success: true,
            url: update.avatar || update.banner || update.profileBackground
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

// =====================================
// Update Profile
// =====================================

const updateProfile = async (req, res) => {

    try {

        const {

            bio,
            displayName,
            pronouns,
            theme,
            aura,
            status,
            statusNote,
            statusNoteDuration,
            avatar,
            banner,
            profileBackground,
            userType,
            tagline,
            specialties,
            commissionsOpen

        } = req.body;

        const username = req.user.username;

        const user = await User.findOne({ username });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        // Only touch fields that were actually sent, so partial
        // updates (like the theme picker alone) don't wipe others.

        if (displayName !== undefined) {
            const cleanName = String(displayName).trim();
            if (!cleanName || cleanName.length > 40) {
                return res.status(400).json({ success: false, message: "Display name must be between 1 and 40 characters." });
            }
            user.displayName = cleanName;
        }
        if (userType !== undefined) {
            if (!["buyer", "seller"].includes(userType)) {
                return res.status(400).json({ success: false, message: "Account type must be buyer or seller." });
            }
            user.userType = userType;
        }

        if (tagline !== undefined) {
            const cleanTagline = String(tagline).trim();
            if (cleanTagline.length > 80) {
                return res.status(400).json({ success: false, message: "Tagline must be 80 characters or fewer." });
            }
            user.tagline = cleanTagline;
        }

        if (specialties !== undefined) {
            const validList = Array.isArray(specialties) &&
                specialties.length <= 5 &&
                specialties.every((item) => SPECIALTIES.includes(item));
            if (!validList) {
                return res.status(400).json({ success: false, message: "Choose up to 5 valid specialties." });
            }
            user.specialties = [...new Set(specialties)];
        }

        if (commissionsOpen !== undefined) user.commissionsOpen = commissionsOpen === true;

        if (bio !== undefined) user.bio = bio;
        if (pronouns !== undefined) user.pronouns = pronouns;
        if (theme !== undefined) user.theme = theme;
        if (aura !== undefined) user.aura = aura;
        if (status !== undefined) user.status = status;
        if (statusNote !== undefined) {
            user.statusNote = statusNote.trim();

            if (!user.statusNote) {
                user.statusNoteExpiresAt = null;
            } else if (statusNoteDuration === "24h") {
                user.statusNoteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            } else if (statusNoteDuration === "3d") {
                user.statusNoteExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Choose how long to keep your note."
                });
            }
        }

        // avatar/banner are sent as "" by the "Remove" button to
        // reset back to the client-side default image.

        if (avatar !== undefined) user.avatar = avatar;
        if (banner !== undefined) user.banner = banner;
        if (profileBackground !== undefined) user.profileBackground = profileBackground;

        await user.save();

        res.json({
            success: true,
            message: "Profile updated."
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

// =====================================
// Get Profile
// =====================================

const getProfile = async (req, res) => {

    try {

        const { username } = req.params;

        const user = await User.findOne({ username })
            .select("displayName username avatar banner profileBackground theme aura bio pronouns status statusNote statusNoteExpiresAt createdAt userType tagline specialties commissionsOpen xp trophies ratingAverage ratingCount");

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        res.json({
            success: true,
            user
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};


// First-time setup: choose buyer/seller and the art types you care about.
const completeOnboarding = async (req, res) => {
    try {
        const { userType, artTypes } = req.body;

        if (!["buyer", "seller"].includes(userType)) {
            return res.status(400).json({ success: false, message: "Choose buyer or artist." });
        }

        const max = userType === "seller" ? 5 : 8;
        const valid = Array.isArray(artTypes) &&
            artTypes.length >= 1 &&
            artTypes.length <= max &&
            artTypes.every((item) => SPECIALTIES.includes(item));

        if (!valid) {
            return res.status(400).json({ success: false, message: "Pick between 1 and " + max + " art types." });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        const unique = [...new Set(artTypes)];
        const names = unique.slice(0, 3).map((item) => item.replace(/-/g, " "));
        const nice = names.map((item) => item.charAt(0).toUpperCase() + item.slice(1));

        user.userType = userType;
        user.interests = unique;
        if (userType === "seller") user.specialties = unique;

        // Default bio from the chosen art types (only if the user has not written one)
        if (!user.bio || !user.bio.trim()) {
            user.bio = userType === "seller"
                ? nice.join(" · ") + " artist on VOXELLA."
                : "Looking for " + names.join(", ") + " artists.";
        }

        user.onboarded = true;
        await user.save();

        res.json({
            success: true,
            user: {
                userType: user.userType,
                interests: user.interests,
                specialties: user.specialties,
                bio: user.bio,
                onboarded: true
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {

    uploadMedia,
    updateProfile,
    getProfile,
    completeOnboarding
};
