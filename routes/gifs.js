const express = require("express");
const router = express.Router();
router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  if (!q) return res.json({ success: true, results: [] });
  if (!process.env.GIPHY_API_KEY) return res.status(503).json({ success: false, message: "GIF search is not configured yet." });
  try {
    const url = new URL("https://api.giphy.com/v1/gifs/search");
    url.search = new URLSearchParams({ q, api_key: process.env.GIPHY_API_KEY, limit: "24", rating: "g" });
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "GIPHY search failed.");
    const results = (data.data || []).map((item) => ({ id: item.id, preview: item.images?.fixed_width_small?.url || item.images?.original?.url, url: item.images?.original?.url })).filter((item) => item.url);
    res.json({ success: true, results });
  } catch (error) { console.error(error); res.status(502).json({ success: false, message: "GIF search is temporarily unavailable." }); }
});
module.exports = router;
