const Facility = require("../models/Facility");
const User = require("../models/User");

const MODULE_KEYS = Facility.MODULE_KEYS;
const FACILITY_TYPES = Facility.FACILITY_TYPES;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
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
  }

  if (facilityType === "clinic") {
    modules.consultation = true;
    modules.billing = true;
    modules.billing_counter = true;
    modules.patient_ledger = true;
    modules.daily_cashier = true;
    modules.pharmacy = true;
    modules.medical_form = true;
    modules.attendance = true;
    modules.admin_overview = true;
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
    modules.admin_overview = true;
  }

  return modules;
}

// POST /api/facilities
exports.createFacility = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      name,
      type,
      phone,
      email,
      address,
      town,
      district,
      region,
      currency,
      timezone,
      receiptHeader,
      receiptFooter,
      medicalFormHeader,
      modules,
      settings,
      notes,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Facility name is required" });
    }

    if (!type || !FACILITY_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid facility type. Allowed: ${FACILITY_TYPES.join(", ")}`,
      });
    }

    const slug = slugify(name);

    if (!slug) {
      return res.status(400).json({ error: "Invalid facility name for slug" });
    }

    const existing = await Facility.findOne({ slug });

    if (existing) {
      return res.status(400).json({
        error: "A facility with a similar name already exists. Use a different name.",
      });
    }

    const defaultModules = buildDefaultModules(type);

    const finalModules = {
      ...defaultModules,
      ...(modules || {}),
    };

    const facility = await Facility.create({
      name: String(name).trim(),
      slug,
      type,
      phone: phone ? String(phone).trim() : undefined,
      email: email ? String(email).trim().toLowerCase() : undefined,
      address: address ? String(address).trim() : undefined,
      town: town ? String(town).trim() : undefined,
      district: district ? String(district).trim() : undefined,
      region: region ? String(region).trim() : "Northern",
      currency: currency ? String(currency).trim() : "UGX",
      timezone: timezone ? String(timezone).trim() : "Africa/Kampala",
      receiptHeader: receiptHeader ? String(receiptHeader).trim() : undefined,
      receiptFooter: receiptFooter ? String(receiptFooter).trim() : undefined,
      medicalFormHeader: medicalFormHeader ? String(medicalFormHeader).trim() : undefined,
      modules: finalModules,
      settings: settings || {},
      notes: notes ? String(notes).trim() : undefined,
      createdBy: userId,
      pilotStartedAt: new Date(),
    });

    return res.status(201).json({
      message: "Facility created successfully.",
      facility,
    });
  } catch (err) {
    console.log("CREATE FACILITY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to create facility",
    });
  }
};

// GET /api/facilities
exports.getFacilities = async (req, res) => {
  try {
    const { type, isActive, limit } = req.query;

    const filter = {};

    if (type && FACILITY_TYPES.includes(type)) {
      filter.type = type;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const requestedLimit = Number(limit);

    const safeLimit = Math.min(
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? requestedLimit
        : 100,
      500
    );

    const [total, facilities] = await Promise.all([
      Facility.countDocuments(filter),
      Facility.find(filter)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .populate("createdBy", "name email role"),
    ]);

    return res.json({
      total,
      facilities,
    });
  } catch (err) {
    console.log("GET FACILITIES ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load facilities",
    });
  }
};

// GET /api/facilities/my
exports.getMyFacility = async (req, res) => {
  try {
    const facilityId = req.facilityId || req.user?.facilityId || null;

    if (!facilityId) {
      return res.json({
        facility: null,
        message: "No facility assigned to this user.",
      });
    }

    const facility = await Facility.findById(facilityId)
      .select(
        "name slug type phone email address town district region currency timezone receiptHeader receiptFooter medicalFormHeader modules settings isActive pilotMode pilotStartedAt pilotEndsAt notes"
      )
      .lean();

    if (!facility) {
      return res.status(404).json({
        error: "Facility not found.",
      });
    }

    if (facility.isActive === false) {
      return res.status(403).json({
        error: "This facility is currently inactive.",
      });
    }

    const modules = {};

    if (facility.modules) {
      if (facility.modules instanceof Map) {
        for (const [key, value] of facility.modules.entries()) {
          modules[key] = value;
        }
      } else if (typeof facility.modules === "object") {
        Object.assign(modules, facility.modules);
      }
    }

    return res.json({
      facility: {
        _id: facility._id,
        name: facility.name,
        slug: facility.slug,
        type: facility.type,
        phone: facility.phone,
        email: facility.email,
        address: facility.address,
        town: facility.town,
        district: facility.district,
        region: facility.region,
        currency: facility.currency,
        timezone: facility.timezone,
        receiptHeader: facility.receiptHeader,
        receiptFooter: facility.receiptFooter,
        medicalFormHeader: facility.medicalFormHeader,
        modules,
        settings: facility.settings,
        isActive: facility.isActive,
        pilotMode: facility.pilotMode,
        pilotStartedAt: facility.pilotStartedAt,
        pilotEndsAt: facility.pilotEndsAt,
        notes: facility.notes,
      },
    });
  } catch (err) {
    console.log("GET MY FACILITY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load facility context",
    });
  }
};

// GET /api/facilities/:id
exports.getFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id)
      .populate("createdBy", "name email role");

    if (!facility) {
      return res.status(404).json({ error: "Facility not found" });
    }

    return res.json({ facility });
  } catch (err) {
    console.log("GET FACILITY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load facility",
    });
  }
};

// PATCH /api/facilities/:id
exports.updateFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);

    if (!facility) {
      return res.status(404).json({ error: "Facility not found" });
    }

    const allowedFields = [
      "name",
      "type",
      "phone",
      "email",
      "address",
      "town",
      "district",
      "region",
      "currency",
      "timezone",
      "logoUrl",
      "receiptHeader",
      "receiptFooter",
      "medicalFormHeader",
      "modules",
      "settings",
      "isActive",
      "pilotMode",
      "pilotEndsAt",
      "notes",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "modules" && typeof req.body[field] === "object") {
          for (const [key, value] of Object.entries(req.body[field])) {
            facility.modules.set(key, Boolean(value));
          }
        } else if (field === "settings" && typeof req.body[field] === "object") {
          facility.settings = {
            ...facility.settings,
            ...req.body[field],
          };
        } else {
          facility[field] = req.body[field];
        }
      }
    }

    if (req.body.name) {
      facility.slug = slugify(req.body.name);
    }

    await facility.save();

    return res.json({
      message: "Facility updated successfully.",
      facility,
    });
  } catch (err) {
    console.log("UPDATE FACILITY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to update facility",
    });
  }
};

// POST /api/facilities/:id/users
exports.assignUserToFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);

    if (!facility) {
      return res.status(404).json({ error: "Facility not found" });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.facility = facility._id;
    await user.save();

    return res.json({
      message: `User ${user.name} assigned to facility ${facility.name}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        facilityId: user.facility,
      },
    });
  } catch (err) {
    console.log("ASSIGN USER TO FACILITY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to assign user to facility",
    });
  }
};

// GET /api/facilities/:id/users
exports.getFacilityUsers = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);

    if (!facility) {
      return res.status(404).json({ error: "Facility not found" });
    }

    const users = await User.find({ facility: facility._id })
      .select("name email role isActive facility")
      .sort({ role: 1, name: 1 });

    return res.json({
      facility: {
        id: facility._id,
        name: facility.name,
        type: facility.type,
      },
      users,
    });
  } catch (err) {
    console.log("GET FACILITY USERS ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load facility users",
    });
  }
};