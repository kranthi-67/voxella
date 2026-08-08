const express = require("express");
const router = express.Router();
router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  if (!q) return res.json({ success: true, results: [] });
  if (!process.env.TENOR_API_KEY) return res.status(503).json({ success: false, message: "GIF search is not configured yet." });
  try {
    const url = new URL("https://tenor.googleapis.com/v2/search");
    url.search = new URLSearchParams({ q, key: process.env.TENOR_API_KEY, client_key: "voxella", limit: "24", media_filter: "gif,tinygif" });
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "Tenor search failed.");
    const results = (data.results || []).map((item) => ({ id: item.id, preview: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url, url: item.media_formats?.gif?.url })).filter((item) => item.url);
    res.json({ success: true, results });
  } catch (error) { console.error(error); res.status(502).json({ success: false, message: "GIF search is temporarily unavailable." }); }
});
module.exports = router;
