const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./src/models/User");

const test = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db";
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB.");

    const email = "lschaithika@gmail.com";
    const password = "Chaithika@09";

    console.log(`🔍 Checking user: ${email}`);
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log("❌ User not found.");
      process.exit(1);
    }

    console.log(`👤 User found: ${user.name}`);
    console.log(`🔐 Role: ${user.role}`);

    const isMatch = await user.comparePassword(password);
    console.log(`🔐 bcrypt match: ${isMatch}`);

    if (!isMatch) {
        console.log("🛠️ Password mismatch. Manually re-hashing for testing...");
        const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const newHash = await bcrypt.hash(password, rounds);
        console.log(`🆕 New hash generated for "${password}": ${newHash}`);

        // Update the user
        user.password = password;
        await user.save();
        console.log("✅ User password updated in DB.");

        const isMatchNow = await user.comparePassword(password);
        console.log(`🔐 bcrypt match after update: ${isMatchNow}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

test();
