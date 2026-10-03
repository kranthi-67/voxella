const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

// Uploader for posts: photos (JPG/PNG/GIF/WEBP) or a short video (MP4/WEBM/MOV).

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const isVideo = VIDEO_TYPES.includes(file.mimetype);
        return {
            folder: "voxella/posts",
            resource_type: isVideo ? "video" : "image",
            allowed_formats: isVideo ? ["mp4", "webm", "mov"] : ["jpg", "jpeg", "png", "gif", "webp"]
        };
    }
});

const uploadPost = multer({
    storage,
    limits: { fileSize: 40 * 1024 * 1024, files: 6 },
    fileFilter: (req, file, callback) => {
        if (![...IMAGE_TYPES, ...VIDEO_TYPES].includes(file.mimetype)) {
            return callback(new Error("Posts accept JPG, PNG, GIF, WEBP photos or MP4, WEBM, MOV videos."));
        }
        callback(null, true);
    }
});

module.exports = uploadPost;
module.exports.VIDEO_TYPES = VIDEO_TYPES;
