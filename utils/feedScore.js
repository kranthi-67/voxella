// "For you" feed ranking.
// Every post gets a score between 0 and about 1. Higher = shown earlier.
//
//   45%  recency      fresh posts first (halves after one day)
//   30%  interest     the author makes art the viewer said they like
//   15%  popularity   likes, with diminishing returns
//   10%  trust        the author's XP and trophies
//   small penalty     the viewer's own posts, so the feed stays varied

const WEIGHTS = { recency: 0.45, interest: 0.30, popularity: 0.15, trust: 0.10 };

function scorePost(post, viewer, now) {
    now = now || Date.now();
    const author = post.author || {};

    const ageHours = Math.max(0, (now - new Date(post.createdAt).getTime()) / 36e5);
    const recency = 1 / (1 + ageHours / 24);

    const interests = new Set((viewer && viewer.interests) || []);
    const types = author.specialties || [];
    const overlap = types.filter((type) => interests.has(type)).length;
    const interest = overlap === 0 ? 0 : Math.min(1, 0.6 + 0.2 * overlap);

    const likes = (post.likes || []).length;
    const popularity = Math.min(1, Math.log1p(likes) / Math.log(50));

    const trust = Math.min(1, (author.xp || 0) / 2000 + (author.trophies || []).length * 0.05);

    const own = viewer && String(author._id) === String(viewer._id) ? -0.15 : 0;

    return WEIGHTS.recency * recency + WEIGHTS.interest * interest + WEIGHTS.popularity * popularity + WEIGHTS.trust * trust + own;
}

function rankPosts(posts, viewer, now) {
    return posts
        .map((post) => ({ post, score: scorePost(post, viewer, now) }))
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.post);
}

module.exports = { scorePost, rankPosts, WEIGHTS };
