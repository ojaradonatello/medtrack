const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getTodayAttendance,
  getMyTodayAttendance,
  checkIn,
  checkOut,
} = require("../controllers/attendanceController");

router.get("/today", authenticate, authorize("admin"), getTodayAttendance);

router.get("/my-today", authenticate, getMyTodayAttendance);

router.post("/check-in", authenticate, checkIn);

router.post("/check-out", authenticate, checkOut);

module.exports = router;