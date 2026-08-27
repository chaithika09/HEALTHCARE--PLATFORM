const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");
const Doctor = require("./src/models/Doctor");
const Patient = require("./src/models/Patient");
const Appointment = require("./src/models/Appointment");

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db");
    console.log("--- DATABASE HEALTH CHECK ---");

    const users = await User.countDocuments();
    const doctors = await Doctor.countDocuments();
    const patients = await Patient.countDocuments();
    const appointments = await Appointment.countDocuments();

    console.log(`✅ Users: ${users}`);
    console.log(`✅ Doctors: ${doctors}`);
    console.log(`✅ Patients: ${patients}`);
    console.log(`✅ Appointments: ${appointments}`);

    // Verify Master User
    const master = await User.findOne({ email: "lschaithika@gmail.com" });
    if (master) {
      console.log(`✅ Master User "Chaithika" exists (Role: ${master.role})`);
    } else {
      console.log("❌ Master User MISSING");
    }

    // Verify some demo data for list pages
    if (doctors === 0) {
      console.log("⚠️ WARNING: No doctors in DB. Doctor list page will be empty.");
    }

    console.log("----------------------------");
    process.exit(0);
  } catch (err) {
    console.error("❌ Health check failed:", err.message);
    process.exit(1);
  }
}
check();
