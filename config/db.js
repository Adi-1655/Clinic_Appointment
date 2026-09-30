const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            serverSelectionTimeoutMS: 5000
        });

        console.log("MongoDB Connected");
    } catch (err) {
        if (err.name === "MongooseServerSelectionError") {
            console.error("\n❌ MongoDB Connection Failed: Unable to reach MongoDB Atlas cluster.");
            console.error("📌 Cause: Your current IP address is not on the Atlas IP Access List (Whitelist).");
            console.error("🔧 How to fix in 1 minute:");
            console.error("   1. Log in to https://cloud.mongodb.com/");
            console.error("   2. Click 'Network Access' (under Security in the left sidebar).");
            console.error("   3. Click 'Add IP Address'.");
            console.error("   4. Click 'Add Current IP Address' or enter '0.0.0.0/0' (Allow access from anywhere).");
            console.error("   5. Click 'Confirm' — once Atlas applies the rule (10-30s), nodemon will connect automatically.\n");
        } else {
            console.error("MongoDB Connection Error:", err.message);
        }
        process.exit(1);
    }
};

module.exports = connectDB;