const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Attendance = require("../models/Attendance");

function sendAuthError(res, status, message) {
  return res.status(status).json({
    error: message,
  });
}

function getFacilityIdFromUser(user) {
  if (!user) {
    return null;
  }

  if (
    user.facility &&
    typeof user.facility === "object" &&
    user.facility._id
  ) {
    return user.facility._id.toString();
  }

  if (user.facility) {
    return String(user.facility);
  }

  return null;
}

function buildSafeUser(user) {
  const obj =
    user && typeof user.toObject === "function"
      ? user.toObject({ getters: true })
      : { ...(user || {}) };

  delete obj.password;

  if (obj._id) {
    obj.id = String(obj._id);
  }

  obj.facilityId = getFacilityIdFromUser(obj);

  return obj;
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, facilityId } = req.body;

    if (!name || !email || !password) {
      return sendAuthError(
        res,
        400,
        "Name, email, and password are required"
      );
    }

    const existingUser = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (existingUser) {
      return sendAuthError(
        res,
        409,
        "A user with this email already exists"
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      role: "staff",
    };

    if (facilityId) {
      if (!mongoose.isValidObjectId(facilityId)) {
        return sendAuthError(res, 400, "Invalid facility ID");
      }

      userData.facility = facilityId;
    }

    const user = await User.create(userData);

    return res.status(201).json({
      message: "User registered successfully",
      user: buildSafeUser(user),
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
    })
      .select("+password")
      .populate(
        "facility",
        "name type slug isActive modules settings"
      );

    if (!user) {
      return sendAuthError(res, 404, "User not found");
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return sendAuthError(res, 400, "Wrong password");
    }

    const facilityId = getFacilityIdFromUser(user);

    if (
      user.facility &&
      user.facility.isActive === false
    ) {
      return sendAuthError(
        res,
        403,
        "This facility is currently inactive. Contact the administrator."
      );
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
      console.log(
        "Attendance auto-mark error:",
        attendanceErr.message
      );
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        facilityId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Login successful",
      token,
      user: buildSafeUser(user),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};