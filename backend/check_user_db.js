const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db");
  const u = await User.findOne({ email: "lschaithika@gmail.com" }).select("+password");
  if (u) {
    console.log("Found user:", u.email);
    console.log("Role:", u.role);
    console.log("Password hash exists:", !!u.password);
  } else {
    console.log("User not found");
  }
  process.exit(0);
}
run();
