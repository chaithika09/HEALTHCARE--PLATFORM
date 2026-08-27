const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");

const debug = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db";
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB.");

    const email = "lschaithika@gmail.com";
    const user = await User.findOne({ email }).select("+password");

    if (user) {
      console.log("👤 User found:");
      console.log(JSON.stringify(user, null, 2));

      console.log(`🔐 Comparing password "Chaithika@09" with stored hash...`);
      const isMatch = await user.comparePassword("Chaithika@09");
      console.log(`🔐 Result: ${isMatch}`);

      console.log(`🔧 Attempting to force verify and save...`);
      user.isEmailVerified = true;
      user.role = "doctor"; // ensure lowercase
      await user.save();
      console.log(`✅ Save successful!`);
    } else {
      console.log(`❌ User NOT found: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during debug:", error);
    process.exit(1);
  }
};

debug();
