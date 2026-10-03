// Shared lists used by the User model, the Artwork model and the controllers.
// Keeping them in one place means you only edit them here.

const SPECIALTIES = [
    "digital-art",
    "illustration",
    "character-design",
    "concept-art",
    "pixel-art",
    "logo-design",
    "graphic-design",
    "ui-design",
    "animation",
    "3d-modeling",
    "3d-sculpting"
];

const ARTWORK_CATEGORIES = ["drawing", "design", "3d-model"];

module.exports = { SPECIALTIES, ARTWORK_CATEGORIES };
