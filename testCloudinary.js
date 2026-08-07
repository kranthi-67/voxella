require("dotenv").config();

const cloudinary = require("./config/cloudinary");

(async () => {

    try {

        const result = await cloudinary.api.ping();

        console.log("✅ Cloudinary Connected!");
        console.log(result);

    } catch (err) {

        console.log("❌ Cloudinary Error:");
        console.log(err);

    }

})();