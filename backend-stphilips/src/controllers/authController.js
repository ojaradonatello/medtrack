const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Facility = require("../models/Facility");

const MODULE_KEYS = Facility.MODULE_KEYS;

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

  if (user.facilityId) {
    return String(user.facilityId);
  }

  return null;
}

function normalizeModules(modules) {
  const normalized = {};

  if (modules instanceof Map) {
    for (const [key, value] of modules.entries()) {
      normalized[key] = value === true;
    }
  } else if (
    modules &&
    typeof modules === "object" &&
    !Array.isArray(modules)
  ) {
    for (const key of Object.keys(modules)) {
      normalized[key] = modules[key] === true;
    }
  }

  for (const key of MODULE_KEYS) {
    if (normalized[key] === undefined) {
      normalized[key] = false;
    }
  }

  return normalized;
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

  if (obj.facility && typeof obj.facility === "object") {
    if (obj.facility._id) {
      obj.facility.id = String(obj.facility._id);
    }

    obj.facility.modules = normalizeModules(obj.facility.modules);
  }

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
      isActive: true,
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
        "name type slug isActive modules settings receiptHeader medicalFormHeader enrollmentStatus subscriptionPlan subscriptionStatus trialEndsAt rejectedReason suspendedReason"
      );

    if (!user) {
      return sendAuthError(res, 404, "User not found");
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return sendAuthError(res, 400, "Wrong password");
    }

    // Block deactivated individual staff accounts
    if (user.isActive === false) {
      return sendAuthError(
        res,
        403,
        "Your account has been deactivated. Contact your facility administrator."
      );
    }

    const facilityId = getFacilityIdFromUser(user);

    // Block pending / rejected / suspended facilities
    if (user.facility && user.facility.isActive === false) {
      const status = user.facility.enrollmentStatus;

      if (status === "pending") {
        return sendAuthError(
          res,
          403,
          "Your facility registration is pending approval. You will be contacted once it is approved."
        );
      }

      if (status === "rejected") {
        return sendAuthError(
          res,
          403,
          `Your facility registration was not approved. Reason: ${
            user.facility.rejectedReason || "Not specified"
          }`
        );
      }

      if (status === "suspended") {
        return sendAuthError(
          res,
          403,
          `This facility is suspended. Reason: ${
            user.facility.suspendedReason || "Not specified"
          }`
        );
      }

      return sendAuthError(
        res,
        403,
        "This facility is currently inactive. Contact the administrator."
      );
    }

    // Auto attendance for today (never blocks login)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const alreadyMarked = await Attendance.findOne({
        staff: user._id,
        facility: facilityId || null,
        date: {
          $gte: today,
        },
      });

      if (!alreadyMarked) {
        await Attendance.create({
          facility: facilityId || null,
          staff: user._id,
          date: new Date(),
          status: "present",
          checkInAt: new Date(),
        });
      }
    } catch (attendanceErr) {
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