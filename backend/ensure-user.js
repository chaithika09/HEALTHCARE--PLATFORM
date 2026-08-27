const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./src/models/User");
const Doctor = require("./src/models/Doctor");

const ensure = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db";
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB.");

    const email = "lschaithika@gmail.com".toLowerCase();

    // Delete existing to be safe
    await User.deleteMany({ email });
    console.log(`🗑 Deleted old user entries for ${email}`);

    const rounds = 10;
    const hashedPassword = await bcrypt.hash("Chaithika@09", rounds);

    const user = await User.create({
      name: "Chaithika",
      email: email,
      password: "Chaithika@09", // Model hook will hash it too, but let's be sure
      role: "doctor",
      isEmailVerified: true,
      isActive: true
    });

    await Doctor.findOneAndUpdate(
        { user: user._id },
        { specialty: "General", experience: 10, licenseNumber: "MED-123", verificationStatus: "approved" },
        { upsert: true }
    );

    console.log(`✅ User lschaithika@gmail.com created/reset with password: Chaithika@09`);
    console.log(`👤 ID: ${user._id}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

ensure();
