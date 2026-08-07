const { v2: cloudinary } = require("cloudinary");

// Render supports either separate variables or Cloudinary's single
// CLOUDINARY_URL variable.
const cloudinaryUrl = process.env.CLOUDINARY_URL;

cloudinary.config(cloudinaryUrl || {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const hasCloudinaryConfig = Boolean(
    cloudinaryUrl ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
     process.env.CLOUDINARY_API_KEY &&
     process.env.CLOUDINARY_API_SECRET)
);

module.exports = { cloudinary, hasCloudinaryConfig };
