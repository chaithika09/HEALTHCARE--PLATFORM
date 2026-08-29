/**
 * One-time seed route — ONLY works in non-production or with secret key
 * DELETE this file after seeding!
 */
const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const User    = require("../models/User");
const Doctor  = require("../models/Doctor");
const Patient = require("../models/Patient");

router.get("/run/:secret", async (req, res) => {
  if (req.params.secret !== "MediQSeed2026Secret") {
    return res.status(403).json({ success: false, message: "Invalid secret" });
  }

  try {
    // Clear existing
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});

    const hash = (pw) => bcrypt.hash(pw, 10);
    const pw = "Chaithika@09";

    // Patients
    const harika = await User.create({
      name: "Harika", email: "ksubramanyam906@gmail.com",
      password: await hash(pw), phone: "9392886725",
      role: "patient", isVerified: true,
    });
    await Patient.create({ user: harika._id, bloodGroup: "A+", allergies: [], chronicConditions: [] });

    const leela = await User.create({
      name: "Leela", email: "kleelavathi906@gmail.com",
      password: await hash(pw), phone: "9392886725",
      role: "patient", isVerified: true,
    });
    await Patient.create({ user: leela._id, bloodGroup: "B+", allergies: [], chronicConditions: [] });

    // Doctors
    const chaithikaUser = await User.create({
      name: "Dr. Chaithika", email: "lschaithika@gmail.com",
      password: await hash(pw), phone: "9392886725",
      role: "doctor", isVerified: true,
    });
    await Doctor.create({
      user: chaithikaUser._id, specialty: "General Physician",
      qualifications: ["MBBS", "MD"], licenseNumber: "MED-CH-2024-001",
      experience: 8, verificationStatus: "approved", isAvailableNow: true,
      consultationFee: { video: 500, inPerson: 800 },
      bio: "Experienced General Physician.", languages: ["English", "Telugu"],
      hospital: "City General Hospital", averageRating: 4.8,
      consultationTypes: { video: true, inPerson: true },
    });

    const subUser = await User.create({
      name: "Dr. Subramanyam", email: "ksubramanyam@gmail.com",
      password: await hash(pw), phone: "9392886725",
      role: "doctor", isVerified: true,
    });
    await Doctor.create({
      user: subUser._id, specialty: "Cardiologist",
      qualifications: ["MBBS", "MD Cardiology"], licenseNumber: "MED-SB-2024-002",
      experience: 12, verificationStatus: "approved", isAvailableNow: true,
      consultationFee: { video: 700, inPerson: 1000 },
      bio: "Board-certified Cardiologist.", languages: ["English", "Telugu"],
      hospital: "Heart Care Center", averageRating: 4.9,
      consultationTypes: { video: true, inPerson: true },
    });

    res.json({
      success: true,
      message: "✅ Database seeded successfully!",
      users: {
        patients: ["ksubramanyam906@gmail.com", "kleelavathi906@gmail.com"],
        doctors: ["lschaithika@gmail.com", "ksubramanyam@gmail.com"],
        password: "Chaithika@09"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
