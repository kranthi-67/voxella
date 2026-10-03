const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
    dbName: "voxella"
});

        console.log("✅ MongoDB Connected");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:");
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = connectDB;