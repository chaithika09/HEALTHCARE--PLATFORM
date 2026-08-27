const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./src/models/User");

const reset = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db";
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB.");

    const email = "lschaithika@gmail.com";
    const user = await User.findOne({ email });

    if (user) {
      console.log(`🔧 Resetting user: ${email}`);
      user.password = "Chaithika@09";
      user.isEmailVerified = true;
      user.isActive = true;
      user.role = "doctor";
      user.name = "Chaithika";
      await user.save();
      console.log(`✅ User reset successfully!`);
    } else {
      console.log(`❌ User NOT found: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during reset:", error);
    process.exit(1);
  }
};

reset();
