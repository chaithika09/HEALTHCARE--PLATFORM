const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");
const Doctor = require("./src/models/Doctor");

const check = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db";
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB.");

    const email = "lschaithika@gmail.com".toLowerCase();
    const user = await User.findOne({ email });

    if (user) {
      console.log(`👤 User found: ${user._id} (${user.role})`);
      const doctor = await Doctor.findOne({ user: user._id });
      if (doctor) {
        console.log("👨‍⚕️ Doctor profile found:");
        console.log(JSON.stringify(doctor, null, 2));
      } else {
        console.log("❌ Doctor profile NOT found for this user.");
      }
    } else {
      console.log(`❌ User NOT found: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

check();
