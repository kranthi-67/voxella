// Shared lists used by the User model, the Artwork model and the controllers.
// Keeping them in one place means you only edit them here.

// Groups are only used to organise the pickers on screen.
const ART_TYPE_GROUPS = [
    { key: "traditional", title: "Traditional", items: ["traditional-art", "sketching", "watercolor", "oil-painting", "calligraphy", "sculpture"] },
    { key: "digital", title: "Digital", items: ["digital-art", "illustration", "character-design", "concept-art", "pixel-art", "animation"] },
    { key: "design", title: "Design", items: ["logo-design", "graphic-design", "ui-design"] },
    { key: "3d", title: "3D", items: ["3d-modeling", "3d-sculpting"] }
];

const SPECIALTIES = ART_TYPE_GROUPS.reduce((all, group) => all.concat(group.items), []);

const ARTWORK_CATEGORIES = ["drawing", "design", "3d-model"];

module.exports = { SPECIALTIES, ART_TYPE_GROUPS, ARTWORK_CATEGORIES };
