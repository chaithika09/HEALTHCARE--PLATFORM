const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db");
  const u = await User.findOne({ email: "lschaithika@gmail.com" }).select("+password");
  if (u) {
    const isMatch = await u.comparePassword("Chaithika@09");
    console.log("Password match for Chaithika@09:", isMatch);
  } else {
    console.log("User not found");
  }
  process.exit(0);
}
run();
