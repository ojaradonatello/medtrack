const express = require("express");

const router = express.Router();

const {
  getTodayAttendance,
} = require("../controllers/attendanceController");

// GET TODAY ATTENDANCE
router.get("/today", getTodayAttendance);

module.exports = router;