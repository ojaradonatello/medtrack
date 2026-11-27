const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api/visits", require("./routes/visitRoutes"));
app.use("/api/reception", require("./routes/receptionRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/dispense", require("./routes/dispenseRoutes"));
app.use("/api/drugs", require("./routes/drugRoutes"));
app.use("/api/alerts", require("./routes/alertRoutes"));
app.use("/api/anomalies", require("./routes/anomalyRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/history", require("./routes/historyRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/bills", require("./routes/billingRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/facilities", require("./routes/facilityRoutes"));
app.use("/api/onboarding", require("./routes/onboardingRoutes"));
app.use("/api/enrollments", require("./routes/enrollmentRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;

  let dbStatus = "unknown";

  if (dbState === 0) dbStatus = "disconnected";
  if (dbState === 1) dbStatus = "connected";
  if (dbState === 2) dbStatus = "connecting";
  if (dbState === 3) dbStatus = "disconnecting";

  res.json({
    status: "ok",
    service: "MedTrack API",
    database: dbStatus,
    time: new Date().toISOString(),
  });
});

// Root route
app.get("/", (req, res) => {
  res.send("MedTrack API Running...");
});

// JSON 404 — must come after every route
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// JSON error handler — must be last, must have 4 args
app.use((err, req, res, next) => {
  console.log("UNHANDLED API ERROR:", req.method, req.originalUrl);
  console.log(err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: Object.values(err.errors || {})
        .map((e) => e.message)
        .join(", "),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: `Invalid value for ${err.path}`,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      error: `Duplicate value for ${field}`,
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Request body is not valid JSON",
    });
  }

  return res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

module.exports = app;