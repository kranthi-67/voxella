const User = require("../models/User");
const Artwork = require("../models/Artwork");
const { SPECIALTIES } = require("../config/marketplace");

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/artists?q=&specialty=&open=1&sort=top|new&page=1&limit=12
const listArtists = async (req, res) => {
    try {
        const filter = { userType: "seller", isBanned: { $ne: true } };

        const q = String(req.query.q || "").trim().slice(0, 60);
        if (q) {
            const pattern = new RegExp(escapeRegex(q), "i");
            filter.$or = [{ displayName: pattern }, { username: pattern }, { tagline: pattern }];
        }

        if (req.query.specialty) {
            if (!SPECIALTIES.includes(req.query.specialty)) {
                return res.status(400).json({ success: false, message: "Invalid specialty." });
            }
            filter.specialties = req.query.specialty;
        }

        if (req.query.open === "1" || req.query.open === "true") filter.commissionsOpen = true;

        const sort = req.query.sort === "new"
            ? { createdAt: -1 }
            : { ratingAverage: -1, xp: -1, createdAt: -1 };

        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 24);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

        const rows = await User.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit + 1)
            .select("displayName username avatar banner tagline specialties commissionsOpen ratingAverage ratingCount xp")
            .lean();

        const hasMore = rows.length > limit;
        const artists = rows.slice(0, limit);
        const ids = artists.map((artist) => artist._id);

        // Up to 3 preview thumbnails + a work count for each artist card
        const works = ids.length
            ? await Artwork.find({ seller: { $in: ids } })
                .sort({ featured: -1, createdAt: -1 })
                .select("seller images")
                .limit(ids.length * 12)
                .lean()
            : [];

        const previews = new Map();
        const counts = new Map();
        for (const work of works) {
            const key = String(work.seller);
            counts.set(key, (counts.get(key) || 0) + 1);
            const list = previews.get(key) || [];
            if (list.length < 3 && work.images && work.images[0]) list.push(work.images[0]);
            previews.set(key, list);
        }

        res.json({
            success: true,
            page,
            hasMore,
            artists: artists.map((artist) => ({
                ...artist,
                previews: previews.get(String(artist._id)) || [],
                artworkCount: counts.get(String(artist._id)) || 0
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { listArtists };
