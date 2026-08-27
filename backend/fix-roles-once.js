const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db");
  const users = await User.find({});
  for (let u of users) {
    if (u.role !== u.role.toLowerCase()) {
      const old = u.role;
      u.role = u.role.toLowerCase();
      await u.save();
      console.log(`Fixed role for ${u.email}: ${old} -> ${u.role}`);
    }
  }
  process.exit(0);
}
run();
