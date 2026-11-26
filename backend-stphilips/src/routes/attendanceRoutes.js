const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { attachFacility } = require("../middleware/facilityMiddleware");

const {
  getTodayAttendance,
  getMyTodayAttendance,
  checkIn,
  checkOut,
} = require("../controllers/attendanceController");

router.get(
  "/today",
  authenticate,
  attachFacility,
  authorize("admin"),
  getTodayAttendance
);

router.get(
  "/my-today",
  authenticate,
  attachFacility,
  getMyTodayAttendance
);

router.post(
  "/check-in",
  authenticate,
  attachFacility,
  checkIn
);

router.post(
  "/check-out",
  authenticate,
  attachFacility,
  checkOut
);

module.exports = router;