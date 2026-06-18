const express = require("express");
const cors = require("cors");
const morgan = require("morgan");


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
app.use("/api/anomalies", require("./routes/anomalyRoutes"));




app.get("/", (req, res) => {
  res.send("MedTrack API Running...");
});

module.exports = app;