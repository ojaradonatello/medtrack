const Attendance = require("../models/Attendance");
const User = require("../models/User");

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function determineCheckInStatus(date = new Date()) {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Simple hospital rule:
  // Before or at 08:30 = present
  // After 08:30 = late
  if (hours < 8 || (hours === 8 && minutes <= 30)) {
    return "present";
  }

  return "late";
}

function getStaffId(req) {
  return req.user?._id || req.user?.id || null;
}

// GET /api/attendance/today
// Admin only
exports.getTodayAttendance = async (req, res) => {
  try {
    const { start, end } = getTodayRange();

    const [attendance, expectedStaff] = await Promise.all([
      Attendance.find({
        date: {
          $gte: start,
          $lte: end,
        },
      })
        .populate("staff", "name email role")
        .sort({ checkInAt: -1, createdAt: -1 }),

      User.find({
        role: {
          $in: [
            "reception",
            "doctor",
            "lab",
            "billing",
            "pharmacist",
            "staff",
          ],
        },
      }).select("name email role"),
    ]);

    const attendedIds = new Set(
      attendance
        .map((item) => String(item.staff?._id || item.staff || ""))
        .filter(Boolean)
    );

    const missingStaff = expectedStaff
      .filter((user) => !attendedIds.has(String(user._id)))
      .map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }));

    const presentCount = attendance.filter(
      (item) => item.status === "present"
    ).length;

    const lateCount = attendance.filter(
      (item) => item.status === "late"
    ).length;

    const checkedOutCount = attendance.filter(
      (item) => !!item.checkOutAt
    ).length;

    return res.json({
      totalRecords: attendance.length,
      presentCount,
      lateCount,
      checkedOutCount,
      missingCount: missingStaff.length,
      attendance,
      missingStaff,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.log("ATTENDANCE TODAY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load attendance",
    });
  }
};

// GET /api/attendance/my-today
// Any authenticated user
exports.getMyTodayAttendance = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const { start, end } = getTodayRange();

    const attendance = await Attendance.findOne({
      staff: staffId,
      date: {
        $gte: start,
        $lte: end,
      },
    }).sort({ date: -1 });

    return res.json({
      attendance: attendance || null,
    });
  } catch (err) {
    console.log("MY ATTENDANCE ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load my attendance",
    });
  }
};

// POST /api/attendance/check-in
// Any authenticated user
exports.checkIn = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const { start, end } = getTodayRange();
    const now = new Date();

    let attendance = await Attendance.findOne({
      staff: staffId,
      date: {
        $gte: start,
        $lte: end,
      },
    }).sort({ date: -1 });

    if (attendance) {
      // If already checked in and not checked out, do not duplicate.
      if (attendance.checkInAt && !attendance.checkOutAt) {
        return res.json({
          message: "You have already checked in today.",
          attendance,
        });
      }

      // If checked out earlier, allow a new check-in and reset checkout.
      attendance.checkOutAt = null;
      attendance.checkInAt = attendance.checkInAt || now;
      attendance.status = attendance.status || determineCheckInStatus(now);
      attendance.date = attendance.date || now;

      await attendance.save();

      return res.json({
        message: "Checked in successfully.",
        attendance,
      });
    }

    attendance = await Attendance.create({
      staff: staffId,
      date: now,
      status: determineCheckInStatus(now),
      checkInAt: now,
      checkOutAt: null,
    });

    return res.status(201).json({
      message: "Checked in successfully.",
      attendance,
    });
  } catch (err) {
    console.log("CHECK IN ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to check in",
    });
  }
};

// POST /api/attendance/check-out
// Any authenticated user
exports.checkOut = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const { start, end } = getTodayRange();

    const attendance = await Attendance.findOne({
      staff: staffId,
      date: {
        $gte: start,
        $lte: end,
      },
    }).sort({ date: -1 });

    if (!attendance) {
      return res.status(400).json({
        error: "You have not checked in today.",
      });
    }

    if (!attendance.checkInAt) {
      return res.status(400).json({
        error: "Check-in record is incomplete. Please check in first.",
      });
    }

    if (attendance.checkOutAt) {
      return res.json({
        message: "You have already checked out today.",
        attendance,
      });
    }

    attendance.checkOutAt = new Date();
    await attendance.save();

    return res.json({
      message: "Checked out successfully.",
      attendance,
    });
  } catch (err) {
    console.log("CHECK OUT ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to check out",
    });
  }
};