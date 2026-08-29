const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const connectDB = require("./src/config/database");
const { initSocket } = require("./src/sockets/socketHandler");
const errorHandler = require("./src/middleware/errorHandler");
const logger = require("./src/utils/logger");

// ── Route imports ─────────────────────────────────────────────
const authRoutes         = require("./src/routes/authRoutes");
const patientRoutes      = require("./src/routes/patientRoutes");
const doctorRoutes       = require("./src/routes/doctorRoutes");
const appointmentRoutes  = require("./src/routes/appointmentRoutes");
const recordRoutes       = require("./src/routes/recordRoutes");
const prescriptionRoutes = require("./src/routes/prescriptionRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const paymentRoutes      = require("./src/routes/paymentRoutes");
const chatRoutes         = require("./src/routes/chatRoutes");
const labRoutes          = require("./src/routes/labRoutes");
const articleRoutes      = require("./src/routes/articleRoutes");
const feedbackRoutes     = require("./src/routes/feedbackRoutes");
const adminRoutes        = require("./src/routes/adminRoutes");
const seedRoutes         = require("./src/routes/seedRoutes");

const app    = express();
const server = http.createServer(app);

// ── Connect Database ──────────────────────────────────────────
connectDB();

// ── Init Socket.io ────────────────────────────────────────────
initSocket(server);

// ── Security Middleware ───────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:3000", "https://healthcare-platform-8mq2-fawn.vercel.app"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate Limiting ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500,
  message:  { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      process.env.NODE_ENV === "production" ? (parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 50) : 500,
  message:  { success: false, message: "Too many auth attempts, please try again in 15 minutes." },
});

app.use("/api/", globalLimiter);
app.use("/api/v1/auth/login",    authLimiter);
app.use("/api/v1/auth/register", authLimiter);

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── HTTP Logging ──────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// ── Static Files (uploads) ────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Health Check ──────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
    env:       process.env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────────────────
const API = "/api/v1";
app.use(`${API}/auth`,          authRoutes);
app.use(`${API}/patients`,      patientRoutes);
app.use(`${API}/doctors`,       doctorRoutes);
app.use(`${API}/appointments`,  appointmentRoutes);
app.use(`${API}/records`,       recordRoutes);
app.use(`${API}/prescriptions`, prescriptionRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/payments`,      paymentRoutes);
app.use(`${API}/chat`,          chatRoutes);
app.use(`${API}/lab-tests`,     labRoutes);
app.use(`${API}/articles`,      articleRoutes);
app.use(`${API}/feedback`,      feedbackRoutes);
app.use(`${API}/admin`,         adminRoutes);
app.use(`${API}/seed`,          seedRoutes);

// ── 404 Handler ───────────────────────────────────────────────
// If a frontend build exists, serve it for all non-API routes so
// the app can be accessed from a single host (e.g. http://localhost:5000)
const frontendBuildPath = path.join(__dirname, "..", "frontend", "build");
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    // Let API routes continue to next handlers
    if (req.originalUrl.startsWith('/api/')) return res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  app.use("*", (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
  });
}

// ── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  logger.info(`📡 API available at http://0.0.0.0:${PORT}/api/v1`);
});

// ── Graceful Shutdown ─────────────────────────────────────────
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed.");
    process.exit(0);
  });
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Promise Rejection:", err);
  server.close(() => process.exit(1));
});

module.exports = { app, server };
