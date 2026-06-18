const Attendance = require("../models/Attendance");

// ===============================
// 📅 GET TODAY ATTENDANCE
// ===============================
exports.getTodayAttendance = async (req, res) => {
  try {

    // start of today
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    // fetch today's attendance
    const attendance = await Attendance.find({
      date: {
        $gte: today,
      },
    })
    .populate("staff", "name email role")
    .sort({ createdAt: -1 });

    // response
    res.json({
      totalPresent: attendance.length,

      attendance,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: err.message,
    });
  }
};