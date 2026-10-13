const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/dispense", require("./routes/dispenseRoutes"));
app.use("/api/alerts", require("./routes/alertRoutes"));
app.use("/api/drugs", require("./routes/drugRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/history", require("./routes/historyRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/anomalies", require("./routes/anomalyRoutes"));
app.use("/api/visits", require("./routes/visitRoutes"));
app.use("/api/reception", require("./routes/receptionRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

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

module.exports = app;