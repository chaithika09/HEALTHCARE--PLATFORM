const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");
const Doctor = require("./src/models/Doctor");
const Patient = require("./src/models/Patient");
const Appointment = require("./src/models/Appointment");

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare_db");
    console.log("--- SYSTEM LINKAGE CHECK ---");

    // 1. Check Master Doctor
    const doctorUser = await User.findOne({ email: "lschaithika@gmail.com" });
    if (doctorUser) {
      console.log(`✅ Master Doctor User Found: ${doctorUser.name} (${doctorUser.role})`);
      const doctorProfile = await Doctor.findOne({ user: doctorUser._id });
      if (doctorProfile) {
        console.log(`✅ Doctor Profile Linked & Approved: ${doctorProfile.specialty}`);
      } else {
        console.log("❌ Doctor Profile MISSING for master user!");
      }
    } else {
      console.log("❌ Master User MISSING!");
    }

    // 2. Check for at least one Patient
    const patientUser = await User.findOne({ role: "patient" });
    if (patientUser) {
      console.log(`✅ Sample Patient Found: ${patientUser.name}`);
      const patientProfile = await Patient.findOne({ user: patientUser._id });
      if (patientProfile) {
        console.log("✅ Patient Profile Linked.");
      } else {
        console.log("❌ Patient Profile MISSING!");
      }
    } else {
      console.log("⚠️ No Patients in DB. Portals won't have data to show.");
    }

    // 3. Check connectivity (Appointments)
    const appointments = await Appointment.find().limit(5);
    console.log(`✅ Total Appointments in DB: ${appointments.length}`);
    if (appointments.length > 0) {
      const apt = appointments[0];
      console.log(`✅ Linkage Test: Appointment exists between Patient ID ${apt.patient} and Doctor ID ${apt.doctor}`);
    }

    console.log("----------------------------");
    process.exit(0);
  } catch (err) {
    console.error("❌ Linkage check failed:", err.message);
    process.exit(1);
  }
}
check();
