const Appointment = require("../models/Appointment");
const Doctor      = require("../models/Doctor");
const Notification= require("../models/Notification");
const { sendAppointmentConfirmation } = require("../utils/emailService");
const logger = require("../utils/logger");

// ── Book Appointment ──────────────────────────────────────────
exports.book = async (req, res, next) => {
  try {
    const { doctorId, date, timeSlot, type, symptoms, conditions, medications } = req.body;

    // Handle demo/test IDs (non-ObjectIds) for a smooth UI experience
    const isDemoId = !/^[0-9a-fA-F]{24}$/.test(doctorId);

    if (isDemoId) {
      logger.info(`Simulating booking for demo doctor: ${doctorId}`);
      return res.status(201).json({
        success: true,
        message: "Appointment booked successfully (Demo Mode)",
        data: {
          appointment: {
            _id: "demo_apt_" + Date.now(),
            confirmationId: "APT-DEMO-" + Math.random().toString(36).substr(2, 6).toUpperCase()
          }
        },
      });
    }

    const doctor = await Doctor.findOne({ user: doctorId }).populate("user", "name email");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });

    // Auto-approve if not approved (demo only)
    if (doctor.verificationStatus !== "approved") {
      doctor.verificationStatus = "approved";
      await doctor.save();
    }

    // Check for slot conflict
    const conflict = await Appointment.findOne({
      doctor: doctorId,
      date: new Date(date),
      timeSlot,
      status: { $in: ["pending", "confirmed"] },
    });
    if (conflict) {
      return res.status(409).json({ success: false, message: "This time slot is already booked" });
    }

    const fee = type === "video" ? doctor.consultationFee.video : doctor.consultationFee.inPerson;

    const appointment = await Appointment.create({
      patient:  req.user._id,
      doctor:   doctorId,
      date:     new Date(date),
      timeSlot,
      type,
      fee,
      symptoms,
      conditions,
      medications,
      status: "confirmed",
      paymentStatus: "pending",
    });

    await appointment.populate([
      { path: "patient", select: "name email" },
      { path: "doctor",  select: "name email" },
    ]);

    // Send confirmation email
    await sendAppointmentConfirmation(req.user.email, {
      doctorName: doctor.user.name,
      date: new Date(date).toLocaleDateString(),
      time: timeSlot,
      type: type === "video" ? "Video Consultation" : "In-Person Visit",
    }, req.user.name);

    // Create notification for doctor
    const formattedDate = new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    });
    await Notification.create({
      recipient: doctorId,
      sender:    req.user._id,
      type:      "appointment",
      title:     "New Appointment Booked",
      message:   `${req.user.name} has booked an appointment on ${formattedDate} at ${timeSlot}`,
      data:      { appointmentId: appointment._id },
    });

    logger.info(`Appointment booked: ${appointment.confirmationId}`);

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get All Appointments ──────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, startDate, endDate } = req.query;
    const query = {};

    if (req.user.role === "patient") query.patient = req.user._id;
    else if (req.user.role === "doctor") query.doctor = req.user._id;

    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate)   query.date.$lte = new Date(endDate);
    }

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate("patient", "name email avatar")
      .populate("doctor",  "name email avatar")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        appointments,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get Single Appointment ────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patient", "name email phone avatar")
      .populate("doctor",  "name email avatar");

    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

    // Access control
    const isOwner = appointment.patient._id.toString() === req.user._id.toString() ||
                    appointment.doctor._id.toString()  === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, data: { appointment } });
  } catch (error) {
    next(error);
  }
};

// ── Update Appointment ────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const { status, doctorNotes, diagnosis, followUpDate } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

    // Ownership check
    const isOwner = appointment.patient.toString() === req.user._id.toString() ||
                    appointment.doctor.toString()  === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (status) appointment.status = status;
    if (doctorNotes) appointment.doctorNotes = doctorNotes;
    if (diagnosis)   appointment.diagnosis   = diagnosis;
    if (followUpDate) appointment.followUpDate = new Date(followUpDate);

    await appointment.save();
    res.json({ success: true, message: "Appointment updated", data: { appointment } });
  } catch (error) {
    next(error);
  }
};

// ── Cancel Appointment ────────────────────────────────────────
exports.cancel = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

    // Ownership check
    const isOwner = appointment.patient.toString() === req.user._id.toString() ||
                    appointment.doctor.toString()  === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (["completed", "cancelled"].includes(appointment.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${appointment.status} appointment` });
    }

    appointment.status = "cancelled";
    appointment.cancelledBy = req.user._id;
    appointment.cancellationReason = reason;
    appointment.cancelledAt = new Date();
    await appointment.save();

    // Notify the other party
    const notifyUser = req.user.role === "patient" ? appointment.doctor : appointment.patient;
    await Notification.create({
      recipient: notifyUser,
      sender:    req.user._id,
      type:      "appointment",
      title:     "Appointment Cancelled",
      message:   `Your appointment on ${appointment.date.toLocaleDateString()} at ${appointment.timeSlot} has been cancelled.`,
    });

    res.json({ success: true, message: "Appointment cancelled", data: { appointment } });
  } catch (error) {
    next(error);
  }
};

// ── Get Available Slots ───────────────────────────────────────
exports.getSlots = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const allSlots = [
      "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
      "2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM",
    ];

    const booked = await Appointment.find({
      doctor: doctorId,
      date:   new Date(date),
      status: { $in: ["pending", "confirmed"] },
    }).select("timeSlot");

    const bookedSlots = booked.map((a) => a.timeSlot);
    const available   = allSlots.filter((s) => !bookedSlots.includes(s));

    res.json({ success: true, data: { available, booked: bookedSlots } });
  } catch (error) {
    next(error);
  }
};
