const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

// Separate uploader just for artwork images, so it does not depend on
// the order of form fields like the profile uploader does.

const storage = new CloudinaryStorage({
    cloudinary,
    params: async () => ({
        folder: "voxella/artworks",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"]
    })
});

module.exports = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 8 },
    fileFilter: (req, file, callback) => {
        const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowed.includes(file.mimetype)) {
            return callback(new Error("Artwork images must be JPG, PNG, GIF or WEBP."));
        }
        callback(null, true);
    }
});
