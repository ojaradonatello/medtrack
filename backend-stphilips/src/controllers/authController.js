const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Attendance = require("../models/Attendance");

function sendAuthError(res, status, message) {
  return res.status(status).json({
    error: message,
  });
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return sendAuthError(res, 400, "Name, email, and password are required");
    }

    const existingUser = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (existingUser) {
      return sendAuthError(res, 409, "A user with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      role: "staff",
    });

    return res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendAuthError(res, 400, "Email and password are required");
    }

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (!user) {
      return sendAuthError(res, 404, "User not found");
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return sendAuthError(res, 400, "Wrong password");
    }

    // Auto attendance for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const alreadyMarked = await Attendance.findOne({
        staff: user._id,
        date: {
          $gte: today,
        },
      });

      if (!alreadyMarked) {
        await Attendance.create({
          staff: user._id,
          status: "present",
        });
      }
    } catch (attendanceErr) {
      // Do not block login if attendance fails
      console.log("Attendance auto-mark error:", attendanceErr.message);
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Login successful",
      token,
      user,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};