const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./src/models/User");
const Doctor = require("./src/models/Doctor");

async function run() {
  const uri = "mongodb+srv://healthadmin:Chaithika09@cluster0.bj7wimm.mongodb.net/healthcare_db?retryWrites=true&w=majority";
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to Atlas.");

    const email = "lschaithika@gmail.com".toLowerCase();

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      console.log("👤 User found in Atlas. Updating password and role...");
      user.password = "Chaithika@09";
      user.role = "doctor";
      user.isEmailVerified = true;
      user.isActive = true;
      await user.save();
    } else {
      console.log("👤 User NOT found in Atlas. Creating...");
      user = await User.create({
        name: "Chaithika",
        email: email,
        password: "Chaithika@09",
        role: "doctor",
        isEmailVerified: true,
        isActive: true
      });
    }

    // Ensure doctor profile exists
    await Doctor.findOneAndUpdate(
      { user: user._id },
      {
        specialty: "General",
        experience: 10,
        licenseNumber: "MED-123",
        verificationStatus: "approved",
        verifiedAt: new Date()
      },
      { upsert: true, new: true }
    );

    console.log("✅ Atlas account lschaithika@gmail.com is now ready with password: Chaithika@09");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}
run();
