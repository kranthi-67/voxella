const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary, hasCloudinaryConfig } = require("../config/cloudinary");

if (!hasCloudinaryConfig) {
    console.warn("Cloudinary is not configured. Set CLOUDINARY_URL or all CLOUDINARY_* variables before accepting uploads.");
}

const storage = new CloudinaryStorage({

    cloudinary,

    params: async (req, file) => {

        let folder = "voxella/avatars";

        if (req.body.type === "banner") {

            folder = "voxella/banners";

        }

        if (req.body.type === "background") {

            folder = "voxella/backgrounds";

        }

        if (req.body.type === "chat") {

            folder = "voxella/chat";

        }

        const isVideo = file.mimetype.startsWith("video/");
        const isAudio = file.mimetype.startsWith("audio/");

        return {

            folder,

            resource_type: isAudio || isVideo ? "video" : "image",

            allowed_formats: [

                "jpg",
                "jpeg",
                "png",
                "gif",
                "webp",
                "mp4",
                "webm",
                "mp3",
                "m4a",
                "wav"

            ]

        };

    }

});

module.exports = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const allowed = [
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "video/mp4", "video/webm",
            "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"
        ];

        const mimeType = file.mimetype.split(";")[0];
        if (!allowed.includes(mimeType)) {
            return callback(new Error("Unsupported file type."));
        }

        callback(null, true);
    }
});
