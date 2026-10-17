const Patient = require("../models/Patient");
const Visit = require("../models/Visit");

const VIEW_ROLES = [
  "admin",
  "reception",
  "doctor",
  "lab",
  "billing",
  "pharmacist",
  "staff",
];

const CREATE_ROLES = [
  "admin",
  "reception",
  "doctor",
];

const EDIT_ROLES = [
  "admin",
  "reception",
  "doctor",
  "lab",
  "pharmacist",
];

const DELETE_ROLES = [
  "admin",
  "reception",
];

function canRole(role, allowedRoles) {
  return !!role && Array.isArray(allowedRoles) && allowedRoles.includes(role);
}

function sendError(res, err) {
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: messages.join(", "),
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";

    if (field === "phone") {
      return res.status(409).json({
        error: "A patient with this phone number already exists",
      });
    }

    return res.status(409).json({
      error: `Duplicate value for ${field}`,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: `Invalid value for ${err.path}`,
    });
  }

  return res.status(500).json({
    error: err.message,
  });
}

// Create Patient
exports.createPatient = async (req, res) => {
  try {
    if (!canRole(req.user?.role, CREATE_ROLES)) {
      return res.status(403).json({
        error: "You do not have permission to create patients",
      });
    }

    const patient = await Patient.create(req.body);
    res.status(201).json(patient);
  } catch (err) {
    sendError(res, err);
  }
};

// Get All Patients
exports.getPatients = async (req, res) => {
  try {
    if (!canRole(req.user?.role, VIEW_ROLES)) {
      return res.status(403).json({
        error: "You do not have permission to view patients",
      });
    }

    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Single Patient
exports.getPatient = async (req, res) => {
  try {
    if (!canRole(req.user?.role, VIEW_ROLES)) {
      return res.status(403).json({
        error: "You do not have permission to view this patient",
      });
    }

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found",
      });
    }

    res.json(patient);
  } catch (err) {
    sendError(res, err);
  }
};

// Get All Visits For One Patient
exports.getPatientVisits = async (req, res) => {
  try {
    if (!canRole(req.user?.role, VIEW_ROLES)) {
      return res.status(403).json({
        error: "You do not have permission to view patient history",
      });
    }

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found",
      });
    }

    const visits = await Visit.find({ patient: patient._id })
      .sort({ createdAt: -1 })
      .populate(
        "patient",
        "name phone gender age address tribe nextOfKinName nextOfKinPhone"
      );

    res.json({
      patient,
      total: visits.length,
      visits,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Search Patients by name or phone and include active visit status
exports.searchPatients = async (req, res) => {
  try {
    if (!canRole(req.user?.role, VIEW_ROLES)) {
      return res.status(403).json({
        error: "You do not have permission to search patients",
      });
    }

    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        error: "Search query parameter 'name' is required",
      });
    }

    const searchTerm = String(name).trim();

    if (!searchTerm) {
      return res.status(400).json({
        error: "Search term cannot be empty",
      });
    }

    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(escaped, "i");

    const ACTIVE_VISIT_STATUSES = [
      "registered",
      "waiting_consultation",
      "in_consultation",
      "waiting_procedure",
      "procedure_in_progress",
      "waiting_lab",
      "lab_in_progress",
      "waiting_interpretation",
      "waiting_billing",
      "waiting_dispensary",
    ];

    const patients = await Patient.find({
      $or: [
        { name: regex },
        { phone: regex },
      ],
    })
      .sort({ name: 1 })
      .limit(50);

    const results = await Promise.all(
      patients.map(async (patient) => {
        const activeVisit = await Visit.findOne({
          patient: patient._id,
          status: { $in: ACTIVE_VISIT_STATUSES },
        }).sort({ createdAt: -1 });

        return {
          patient,
          activeVisit: activeVisit || null,
          canCreateNewVisit: !activeVisit,
        };
      })
    );

    res.json({
      total: results.length,
      search: searchTerm,
      results,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// Update Patient
exports.updatePatient = async (req, res) => {
  try {
    if (!canRole(req.user?.role, EDIT_ROLES)) {
      return res.status(403).json({
        error: "You do not have permission to edit patients",
      });
    }

    const allowedFields = [
      "name",
      "phone",
      "age",
      "gender",
      "address",
      "tribe",
      "nextOfKinName",
      "nextOfKinPhone",
    ];

    const payload = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        error: "No valid patient fields provided for update",
      });
    }

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found",
      });
    }

    res.json(patient);
  } catch (err) {
    sendError(res, err);
  }
};

// Delete Patient
exports.deletePatient = async (req, res) => {
  try {
    if (!canRole(req.user?.role, DELETE_ROLES)) {
      return res.status(403).json({
        error: "You do not have permission to delete patients",
      });
    }

    const patient = await Patient.findByIdAndDelete(req.params.id);

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found",
      });
    }

    res.json({
      message: "Patient deleted",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};