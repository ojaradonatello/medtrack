const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const Facility = require("../models/Facility");
const User = require("../models/User");

const FACILITY_TYPES = Facility.FACILITY_TYPES;
const MODULE_KEYS = Facility.MODULE_KEYS;

const PLANS = ["pilot", "basic", "standard", "enterprise"];

const PLAN_LIMITS = {
  pilot: { maxUsers: 5, trialDays: 30 },
  basic: { maxUsers: 10, trialDays: 14 },
  standard: { maxUsers: 30, trialDays: 14 },
  enterprise: { maxUsers: 200, trialDays: 14 },
};

// Simple in-memory rate limit for the public endpoint
const registrationAttempts = new Map();
const REG_WINDOW_MS = 60 * 60 * 1000;
const REG_MAX = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const key = String(ip || "unknown");
  const entry = registrationAttempts.get(key);

  if (!entry || now - entry.windowStart > REG_WINDOW_MS) {
    registrationAttempts.set(key, { windowStart: now, count: 1 });
    return { allowed: true };
  }

  if (entry.count >= REG_MAX) {
    return {
      allowed: false,
      retryAfterMinutes: Math.ceil(
        (REG_WINDOW_MS - (now - entry.windowStart)) / 60000
      ),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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

function buildDefaultModules(facilityType) {
  const modules = {};

  for (const key of MODULE_KEYS) {
    modules[key] = false;
  }

  if (facilityType === "hospital") {
    modules.consultation = true;
    modules.laboratory = true;
    modules.procedure = true;
    modules.interpretation = true;
    modules.prescription = true;
    modules.billing = true;
    modules.billing_counter = true;
    modules.patient_ledger = true;
    modules.daily_cashier = true;
    modules.pharmacy = true;
    modules.medical_form = true;
    modules.attendance = true;
    modules.admin_overview = true;
    modules.enrollment = true;
  }

  if (facilityType === "clinic") {
    modules.consultation = true;
    modules.prescription = true;
    modules.billing = true;
    modules.billing_counter = true;
    modules.patient_ledger = true;
    modules.daily_cashier = true;
    modules.pharmacy = true;
    modules.medical_form = true;
    modules.attendance = true;
    modules.admin_overview = true;
    modules.enrollment = true;
  }

  if (facilityType === "pharmacy" || facilityType === "drug_shop") {
    modules.billing_counter = true;
    modules.patient_ledger = true;
    modules.daily_cashier = true;
    modules.drugshop = true;
    modules.pharmacy = true;
    modules.admin_overview = true;
  }

  if (facilityType === "diagnostic_centre") {
    modules.laboratory = true;
    modules.billing = true;
    modules.billing_counter = true;
    modules.patient_ledger = true;
    modules.daily_cashier = true;
    modules.admin_overview = true;
  }

  if (facilityType === "maternity_home") {
    modules.consultation = true;
    modules.billing = true;
    modules.billing_counter = true;
    modules.patient_ledger = true;
    modules.daily_cashier = true;
    modules.pharmacy = true;
    modules.medical_form = true;
    modules.attendance = true;
    modules.admin_overview = true;
    modules.enrollment = true;
  }

  return modules;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function cleanPhone(value) {
  return String(value || "").replace(/[\s-]/g, "").trim();
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

function safeFacility(facility) {
  const obj =
    facility && typeof facility.toObject === "function"
      ? facility.toObject()
      : { ...(facility || {}) };

  obj.modules = normalizeModules(obj.modules);

  if (obj._id) {
    obj.id = String(obj._id);
  }

  return obj;
}

// ============================================================
// POST /api/onboarding/register   (PUBLIC)
// ============================================================
exports.registerFacility = async (req, res) => {
  let createdFacility = null;

  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress;

    const rate = checkRateLimit(ip);

    if (!rate.allowed) {
      return res.status(429).json({
        error: `Too many registration attempts. Try again in ${rate.retryAfterMinutes} minutes.`,
      });
    }

    const {
      facilityName,
      facilityType,
      town,
      district,
      region,
      address,
      facilityPhone,
      ownerName,
      ownerPhone,
      ownerEmail,
      password,
      requestedPlan,
      licenseNumber,
      registrationNumber,
    } = req.body;

    // ---------- VALIDATION ----------
    const cleanName = String(facilityName || "").trim();

    if (cleanName.length < 3) {
      return res.status(400).json({
        error: "Facility name must be at least 3 characters",
      });
    }

    if (!facilityType || !FACILITY_TYPES.includes(facilityType)) {
      return res.status(400).json({
        error: `Facility type must be one of: ${FACILITY_TYPES.join(", ")}`,
      });
    }

    const cleanOwnerName = String(ownerName || "").trim();

    if (cleanOwnerName.length < 3) {
      return res.status(400).json({
        error: "Owner name is required (at least 3 characters)",
      });
    }

    const phone = cleanPhone(ownerPhone);

    if (phone.replace(/\D/g, "").length < 9) {
      return res.status(400).json({
        error: "A valid owner phone number is required",
      });
    }

    const email = String(ownerEmail || "").toLowerCase().trim();

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: "A valid owner email address is required",
      });
    }

    if (!password || String(password).length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    const plan = PLANS.includes(requestedPlan) ? requestedPlan : "pilot";

    const slug = slugify(cleanName);

    if (!slug) {
      return res.status(400).json({
        error: "Facility name cannot be converted to a valid identifier",
      });
    }

    // ---------- DUPLICATES ----------
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        error:
          "An account with this email already exists. Log in instead, or use a different email.",
      });
    }

    const existingFacility = await Facility.findOne({ slug });

    if (existingFacility) {
      return res.status(409).json({
        error:
          "A facility with this name is already registered. Add your town or branch to the name, e.g. 'Life Drug Shop Gulu Central'.",
      });
    }

    // ---------- CREATE FACILITY (PENDING) ----------
    const modules = buildDefaultModules(facilityType);
    const limits = PLAN_LIMITS[plan];

    createdFacility = await Facility.create({
      name: cleanName,
      slug,
      type: facilityType,
      phone: facilityPhone ? cleanPhone(facilityPhone) : phone,
      email,
      address: address ? String(address).trim() : undefined,
      town: town ? String(town).trim() : undefined,
      district: district ? String(district).trim() : undefined,
      region: region ? String(region).trim() : "Northern",
      country: "Uganda",
      currency: "UGX",
      timezone: "Africa/Kampala",
      receiptHeader: cleanName.toUpperCase(),
      medicalFormHeader: cleanName.toUpperCase(),
      modules: new Map(Object.entries(modules)),

      enrollmentStatus: "pending",
      isActive: false,
      subscriptionPlan: plan,
      subscriptionStatus: "trial",
      maxUsers: limits.maxUsers,

      ownerName: cleanOwnerName,
      ownerPhone: phone,
      ownerEmail: email,

      licenseNumber: licenseNumber
        ? String(licenseNumber).trim()
        : undefined,
      registrationNumber: registrationNumber
        ? String(registrationNumber).trim()
        : undefined,

      pilotMode: plan === "pilot",
      notes: "Self-registered. Awaiting platform approval.",
    });

    // ---------- CREATE FIRST ADMIN USER ----------
    let createdUser = null;

    try {
      const hashedPassword = await bcrypt.hash(String(password), 10);

      createdUser = await User.create({
        name: cleanOwnerName,
        email,
        password: hashedPassword,
        role: "admin",
        facility: createdFacility._id,
        isActive: true,
      });
    } catch (userErr) {
      try {
        await Facility.findByIdAndDelete(createdFacility._id);
      } catch (cleanupErr) {
        console.log(
          "ONBOARDING CLEANUP FAILED:",
          cleanupErr.message,
          "facilityId:",
          String(createdFacility._id)
        );
      }

      return res.status(400).json({
        error:
          userErr.message || "Failed to create the administrator account",
      });
    }

    createdFacility.createdBy = createdUser._id;
    await createdFacility.save();

    return res.status(201).json({
      message:
        "Registration received. Your facility is pending approval. You will be contacted on the phone number you provided.",
      enrollmentStatus: "pending",
      facility: {
        id: String(createdFacility._id),
        name: createdFacility.name,
        slug: createdFacility.slug,
        type: createdFacility.type,
        subscriptionPlan: createdFacility.subscriptionPlan,
        enabledModules: Object.keys(modules).filter((k) => modules[k]),
      },
      account: {
        id: String(createdUser._id),
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      },
      nextStep:
        "Wait for approval, then log in with your email and password.",
    });
  } catch (err) {
    console.log("REGISTER FACILITY ERROR:", err);

    if (createdFacility && createdFacility._id) {
      try {
        await Facility.findByIdAndDelete(createdFacility._id);
      } catch (cleanupErr) {
        console.log("ONBOARDING ROLLBACK FAILED:", cleanupErr.message);
      }
    }

    return res.status(500).json({
      error: err.message || "Failed to register facility",
    });
  }
};

// ============================================================
// GET /api/onboarding/status?email=...&phone=...   (PUBLIC)
// ============================================================
exports.checkRegistrationStatus = async (req, res) => {
  try {
    const email = String(req.query.email || "").toLowerCase().trim();
    const phone = cleanPhone(req.query.phone);

    if (!isValidEmail(email) || phone.replace(/\D/g, "").length < 9) {
      return res.status(400).json({
        error: "Valid email and phone are required",
      });
    }

    const facility = await Facility.findOne({
      ownerEmail: email,
      ownerPhone: phone,
    })
      .select(
        "name type enrollmentStatus subscriptionPlan approvedAt rejectedReason suspendedReason createdAt"
      )
      .lean();

    if (!facility) {
      return res.status(404).json({
        error: "No registration found for that email and phone combination",
      });
    }

    let message = "Your facility is pending approval.";

    if (facility.enrollmentStatus === "approved") {
      message = "Your facility is approved. You can now log in.";
    }

    if (facility.enrollmentStatus === "rejected") {
      message = `Your registration was not approved. Reason: ${
        facility.rejectedReason || "Not specified"
      }`;
    }

    if (facility.enrollmentStatus === "suspended") {
      message = `Your facility is suspended. Reason: ${
        facility.suspendedReason || "Not specified"
      }`;
    }

    return res.json({
      facilityName: facility.name,
      facilityType: facility.type,
      enrollmentStatus: facility.enrollmentStatus,
      subscriptionPlan: facility.subscriptionPlan,
      registeredAt: facility.createdAt,
      approvedAt: facility.approvedAt || null,
      message,
    });
  } catch (err) {
    console.log("CHECK STATUS ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to check status",
    });
  }
};

// ============================================================
// GET /api/onboarding/pending   (platform_admin)
// ============================================================
exports.getPendingFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find({
      enrollmentStatus: "pending",
    })
      .sort({ createdAt: 1 })
      .limit(200);

    return res.json({
      total: facilities.length,
      facilities: facilities.map(safeFacility),
    });
  } catch (err) {
    console.log("GET PENDING ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load pending facilities",
    });
  }
};

// ============================================================
// GET /api/onboarding/all   (platform_admin)
// ============================================================
exports.getAllFacilities = async (req, res) => {
  try {
    const { enrollmentStatus, type, plan, limit } = req.query;

    const filter = {};

    if (enrollmentStatus) filter.enrollmentStatus = enrollmentStatus;
    if (type && FACILITY_TYPES.includes(type)) filter.type = type;
    if (plan && PLANS.includes(plan)) filter.subscriptionPlan = plan;

    const requested = Number(limit);

    const safeLimit = Math.min(
      Number.isFinite(requested) && requested > 0 ? requested : 100,
      500
    );

    const [total, facilities] = await Promise.all([
      Facility.countDocuments(filter),
      Facility.find(filter)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .populate("approvedBy", "name email role"),
    ]);

    const withCounts = await Promise.all(
      facilities.map(async (facility) => {
        const obj = safeFacility(facility);

        obj.userCount = await User.countDocuments({
          facility: facility._id,
        });

        return obj;
      })
    );

    return res.json({
      total,
      facilities: withCounts,
    });
  } catch (err) {
    console.log("GET ALL FACILITIES ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load facilities",
    });
  }
};

// ============================================================
// GET /api/onboarding/stats   (platform_admin)
// ============================================================
exports.getOnboardingStats = async (req, res) => {
  try {
    const [
      total,
      pending,
      approved,
      rejected,
      suspended,
      byType,
      byPlan,
      totalUsers,
      recentRegistrations,
    ] = await Promise.all([
      Facility.countDocuments({}),
      Facility.countDocuments({ enrollmentStatus: "pending" }),
      Facility.countDocuments({ enrollmentStatus: "approved" }),
      Facility.countDocuments({ enrollmentStatus: "rejected" }),
      Facility.countDocuments({ enrollmentStatus: "suspended" }),

      Facility.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Facility.aggregate([
        { $group: { _id: "$subscriptionPlan", count: { $sum: 1 } } },
      ]),

      User.countDocuments({ role: { $ne: "platform_admin" } }),

      Facility.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select(
          "name type town district enrollmentStatus subscriptionPlan ownerName ownerPhone createdAt"
        )
        .lean(),
    ]);

    return res.json({
      totals: {
        facilities: total,
        pending,
        approved,
        rejected,
        suspended,
        users: totalUsers,
      },
      byType: byType.reduce((acc, item) => {
        acc[item._id || "unknown"] = item.count;
        return acc;
      }, {}),
      byPlan: byPlan.reduce((acc, item) => {
        acc[item._id || "unknown"] = item.count;
        return acc;
      }, {}),
      recentRegistrations,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.log("ONBOARDING STATS ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load stats",
    });
  }
};

// ============================================================
// POST /api/onboarding/:id/approve   (platform_admin)
// ============================================================
exports.approveFacility = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid facility ID" });
    }

    const facility = await Facility.findById(id);

    if (!facility) {
      return res.status(404).json({ error: "Facility not found" });
    }

    if (facility.enrollmentStatus === "approved") {
      return res.status(400).json({
        error: "This facility is already approved",
      });
    }

    const plan = PLANS.includes(req.body.subscriptionPlan)
      ? req.body.subscriptionPlan
      : facility.subscriptionPlan || "pilot";

    const limits = PLAN_LIMITS[plan];

    const trialDays =
      Number(req.body.trialDays) > 0
        ? Number(req.body.trialDays)
        : limits.trialDays;

    facility.enrollmentStatus = "approved";
    facility.isActive = true;
    facility.subscriptionPlan = plan;
    facility.subscriptionStatus = "trial";
    facility.maxUsers = limits.maxUsers;
    facility.approvedBy = getUserId(req);
    facility.approvedAt = new Date();
    facility.rejectedReason = undefined;
    facility.suspendedAt = undefined;
    facility.suspendedReason = undefined;
    facility.pilotMode = plan === "pilot";
    facility.pilotStartedAt = new Date();

    facility.trialEndsAt = new Date(
      Date.now() + trialDays * 24 * 60 * 60 * 1000
    );

    facility.pilotEndsAt = facility.trialEndsAt;

    if (req.body.notes) {
      facility.notes = String(req.body.notes).trim();
    }

    await facility.save();

    return res.json({
      message: `${facility.name} approved. The owner can now log in.`,
      facility: safeFacility(facility),
    });
  } catch (err) {
    console.log("APPROVE FACILITY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to approve facility",
    });
  }
};

// ============================================================
// POST /api/onboarding/:id/reject   (platform_admin)
// ============================================================
exports.rejectFacility = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid facility ID" });
    }

    const reason = String(req.body.reason || "").trim();

    if (!reason) {
      return res.status(400).json({
        error: "A rejection reason is required",
      });
    }

    const facility = await Facility.findById(id);

    if (!facility) {
      return res.status(404).json({ error: "Facility not found" });
    }

    facility.enrollmentStatus = "rejected";
    facility.isActive = false;
    facility.rejectedReason = reason;
    facility.subscriptionStatus = "cancelled";

    await facility.save();

    return res.json({
      message: `${facility.name} rejected.`,
      facility: safeFacility(facility),
    });
  } catch (err) {
    console.log("REJECT FACILITY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to reject facility",
    });
  }
};

// ============================================================
// POST /api/onboarding/:id/suspend   (platform_admin)
// ============================================================
exports.suspendFacility = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid facility ID" });
    }

    const reason = String(req.body.reason || "").trim();

    if (!reason) {
      return res.status(400).json({
        error: "A suspension reason is required",
      });
    }

    const facility = await Facility.findById(id);

    if (!facility) {
      return res.status(404).json({ error: "Facility not found" });
    }

    facility.enrollmentStatus = "suspended";
    facility.isActive = false;
    facility.suspendedAt = new Date();
    facility.suspendedReason = reason;
    facility.subscriptionStatus = "past_due";

    await facility.save();

    return res.json({
      message: `${facility.name} suspended. All users are blocked from logging in.`,
      facility: safeFacility(facility),
    });
  } catch (err) {
    console.log("SUSPEND FACILITY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to suspend facility",
    });
  }
};

// ============================================================
// POST /api/onboarding/:id/reactivate   (platform_admin)
// ============================================================
exports.reactivateFacility = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid facility ID" });
    }

    const facility = await Facility.findById(id);

    if (!facility) {
      return res.status(404).json({ error: "Facility not found" });
    }

    if (facility.enrollmentStatus === "pending") {
      return res.status(400).json({
        error: "Use approve for a pending facility",
      });
    }

    facility.enrollmentStatus = "approved";
    facility.isActive = true;
    facility.suspendedAt = undefined;
    facility.suspendedReason = undefined;
    facility.rejectedReason = undefined;
    facility.subscriptionStatus = "active";

    await facility.save();

    return res.json({
      message: `${facility.name} reactivated.`,
      facility: safeFacility(facility),
    });
  } catch (err) {
    console.log("REACTIVATE FACILITY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to reactivate facility",
    });
  }
};