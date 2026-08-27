const Doctor  = require("../models/Doctor");
const User    = require("../models/User");
const Review  = require("../models/Review");
const Appointment = require("../models/Appointment");

// ── Get All Doctors ───────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const { specialty, search, page = 1, limit = 20, sortBy = "rating", available } = req.query;

    const query = { verificationStatus: "approved" };
    if (specialty) query.specialty = { $regex: specialty, $options: "i" };
    if (available === "true") query.isAvailableNow = true;

    let doctors = await Doctor.find(query)
      .populate("user", "name email avatar phone")
      .sort(sortBy === "fee" ? { "consultationFee.video": 1 } : { averageRating: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    if (search) {
      doctors = doctors.filter((d) =>
        d.user.name.toLowerCase().includes(search.toLowerCase()) ||
        d.specialty.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      data: {
        doctors,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get Doctor By ID ──────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.params.id })
      .populate("user", "name email avatar phone");

    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    const reviews = await Review.find({ doctor: req.params.id, isVisible: true })
      .populate("patient", "name avatar")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, data: { doctor, reviews } });
  } catch (error) {
    next(error);
  }
};

// ── Get My Profile ────────────────────────────────────────────
exports.getMyProfile = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id })
      .populate("user", "name email avatar phone");

    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });

    res.json({ success: true, data: { doctor } });
  } catch (error) {
    next(error);
  }
};

// ── Get Doctor Dashboard ──────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayApts, totalApts, totalPatients, doctor] = await Promise.all([
      Appointment.countDocuments({ doctor: req.user._id, date: { $gte: today, $lt: tomorrow }, status: { $in: ["confirmed", "in-progress"] } }),
      Appointment.countDocuments({ doctor: req.user._id }),
      Appointment.distinct("patient", { doctor: req.user._id }),
      Doctor.findOne({ user: req.user._id }),
    ]);

    const upcomingApts = await Appointment.find({
      doctor: req.user._id,
      date:   { $gte: today },
      status: { $in: ["confirmed", "pending"] },
    })
      .populate("patient", "name email avatar")
      .sort({ date: 1, timeSlot: 1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          todayAppointments: todayApts,
          totalAppointments: totalApts,
          totalPatients:     totalPatients.length,
          averageRating:     doctor?.averageRating || 0,
          totalReviews:      doctor?.totalReviews  || 0,
        },
        upcomingAppointments: upcomingApts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Update Doctor Profile ─────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const {
      bio,
      specialty,
      subSpecialties,
      qualifications,
      experience,
      licenseNumber,
      consultationFee,
      availability,
      languages,
      hospital,
      paymentQRCode
    } = req.body;

    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (subSpecialties !== undefined) updateData.subSpecialties = subSpecialties;
    if (qualifications !== undefined) updateData.qualifications = qualifications;
    if (experience !== undefined) updateData.experience = experience;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (consultationFee !== undefined) updateData.consultationFee = consultationFee;
    if (availability !== undefined) updateData.availability = availability;
    if (languages !== undefined) updateData.languages = languages;
    if (hospital !== undefined) updateData.hospital = hospital;
    if (paymentQRCode !== undefined) updateData.paymentQRCode = paymentQRCode;

    const doctor = await Doctor.findOneAndUpdate(
      { user: req.user._id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("user", "name email avatar");

    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });

    // Update user name/phone if provided
    if (req.body.name || req.body.phone) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { name: req.body.name, phone: req.body.phone },
      });
      // Refresh user population
      await doctor.populate("user", "name email avatar phone");
    }

    res.json({ success: true, message: "Profile updated", data: { doctor } });
  } catch (error) {
    next(error);
  }
};

// ── Get Doctor Appointments ───────────────────────────────────
exports.getAppointments = async (req, res, next) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    const query = { doctor: req.user._id };
    if (status) query.status = status;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      query.date = { $gte: d, $lt: next };
    }

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate("patient", "name email avatar phone")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: { appointments, pagination: { total, page: parseInt(page), limit: parseInt(limit) } },
    });
  } catch (error) {
    next(error);
  }
};
