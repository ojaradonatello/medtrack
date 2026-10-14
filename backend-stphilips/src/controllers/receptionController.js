const Patient = require("../models/Patient");
const Visit = require("../models/Visit");

function generateVisitNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `V-${datePart}-${randomPart}`;
}

const ACTIVE_VISIT_STATUSES = [
  "registered",
  "waiting_consultation",
  "in_consultation",
  "waiting_lab",
  "lab_in_progress",
  "waiting_interpretation",
  "waiting_billing",
  "waiting_dispensary",
];

function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const num = Number(value);

  if (Number.isNaN(num)) {
    return null;
  }

  return num;
}

function validateVitals(vitals) {
  if (vitals === undefined || vitals === null) {
    return { error: null, data: null };
  }

  if (typeof vitals !== "object" || Array.isArray(vitals)) {
    return {
      error: "Vitals must be an object",
      data: null,
    };
  }

  const result = {};

  if (vitals.bloodPressure !== undefined) {
    const bp = vitals.bloodPressure;

    if (typeof bp !== "object" || bp === null || Array.isArray(bp)) {
      return {
        error: "bloodPressure must be an object",
        data: null,
      };
    }

    const systolic = toNumber(bp.systolic);
    const diastolic = toNumber(bp.diastolic);

    if (systolic === null || diastolic === null) {
      return {
        error: "Blood pressure values must be numbers",
        data: null,
      };
    }

    if (systolic !== undefined && (systolic < 0 || systolic > 300)) {
      return {
        error: "Systolic blood pressure seems invalid",
        data: null,
      };
    }

    if (diastolic !== undefined && (diastolic < 0 || diastolic > 200)) {
      return {
        error: "Diastolic blood pressure seems invalid",
        data: null,
      };
    }

    if (systolic !== undefined || diastolic !== undefined) {
      if (systolic === undefined || diastolic === undefined) {
        return {
          error: "Provide both systolic and diastolic blood pressure",
          data: null,
        };
      }

      result.bloodPressure = {
        systolic,
        diastolic,
      };
    }
  }

  const weightKg = toNumber(vitals.weightKg);

  if (weightKg === null) {
    return {
      error: "Weight must be a number",
      data: null,
    };
  }

  if (weightKg !== undefined && (weightKg < 0 || weightKg > 500)) {
    return {
      error: "Weight seems invalid",
      data: null,
    };
  }

  if (weightKg !== undefined) {
    result.weightKg = weightKg;
  }

  const temperatureC = toNumber(vitals.temperatureC);

  if (temperatureC === null) {
    return {
      error: "Temperature must be a number",
      data: null,
    };
  }

  if (
    temperatureC !== undefined &&
    (temperatureC < -50 || temperatureC > 100)
  ) {
    return {
      error: "Temperature seems invalid",
      data: null,
    };
  }

  if (temperatureC !== undefined) {
    result.temperatureC = temperatureC;
  }

  const pulseBpm = toNumber(vitals.pulseBpm);

  if (pulseBpm === null) {
    return {
      error: "Pulse must be a number",
      data: null,
    };
  }

  if (pulseBpm !== undefined && (pulseBpm < 0 || pulseBpm > 300)) {
    return {
      error: "Pulse seems invalid",
      data: null,
    };
  }

  if (pulseBpm !== undefined) {
    result.pulseBpm = pulseBpm;
  }

  if (Object.keys(result).length === 0) {
    return {
      error: null,
      data: null,
    };
  }

  return {
    error: null,
    data: result,
  };
}

// POST /api/reception/register-patient-visit
exports.registerPatientAndVisit = async (req, res) => {
  const { patient, visit } = req.body;

  if (!patient || !patient.name) {
    return res.status(400).json({
      error: "Patient name is required",
    });
  }

    const cleanPatient = {
    name: String(patient.name || "").trim(),
    gender: patient.gender,
    phone: patient.phone ? String(patient.phone).trim() : undefined,
    address: patient.address ? String(patient.address).trim() : undefined,
    tribe: patient.tribe ? String(patient.tribe).trim() : undefined,
    nextOfKinName: patient.nextOfKinName ? String(patient.nextOfKinName).trim() : undefined,
    nextOfKinPhone: patient.nextOfKinPhone ? String(patient.nextOfKinPhone).trim() : undefined,
  };

  if (!cleanPatient.name) {
    return res.status(400).json({
      error: "Patient name is required",
    });
  }

  if (
    patient.age !== undefined &&
    patient.age !== null &&
    patient.age !== ""
  ) {
    const age = Number(patient.age);

    if (!Number.isFinite(age)) {
      return res.status(400).json({
        error: "Patient age must be a number",
      });
    }

    cleanPatient.age = age;
  }

  const vitalsCheck = validateVitals(visit?.vitals);

  if (vitalsCheck.error) {
    return res.status(400).json({
      error: vitalsCheck.error,
    });
  }

  let createdPatient = null;

  try {
    createdPatient = await Patient.create(cleanPatient);

    const visitPayload = {
      ...visit,
      patient: createdPatient._id,
      visitNumber: visit?.visitNumber || generateVisitNumber(),
      status: visit?.status || "waiting_consultation",
      currentDepartment: visit?.currentDepartment || "consultation",
      vitals: vitalsCheck.data || {},
      notes: visit?.notes || "Registered at reception",
    };

    const createdVisit = await Visit.create(visitPayload);

    return res.status(201).json({
      message: "Patient registered and visit created",
      patient: createdPatient,
      visit: createdVisit,
    });
  } catch (err) {
    if (createdPatient) {
      try {
        await Patient.findByIdAndDelete(createdPatient._id);
      } catch (cleanupErr) {
        return res.status(500).json({
          error: err.message,
          warning:
            "Visit creation failed, and automatic patient cleanup also failed. Patient ID: " +
            createdPatient._id,
        });
      }
    }

    return res.status(400).json({
      error: err.message,
    });
  }
};

// GET /api/reception/queue
exports.getQueue = async (req, res) => {
  try {
    const { department, status } = req.query;

    const filter = {
      status: { $in: ACTIVE_VISIT_STATUSES },
    };

    if (department) {
      filter.currentDepartment = department;
    }

    if (status) {
      filter.status = status;
    }

    const visits = await Visit.find(filter)
      .sort({ createdAt: 1 })
      .populate("patient", "name phone gender age address tribe nextOfKinName nextOfKinPhone");

    return res.json({
      total: visits.length,
      queue: visits,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

// GET /api/reception/find-patient?phone=...
exports.findPatientByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        found: false,
        error: "phone query parameter is required",
      });
    }

    const normalizedPhone = String(phone).trim();

    const patient = await Patient.findOne({ phone: normalizedPhone });

    if (!patient) {
      return res.status(404).json({
        found: false,
        patient: null,
        activeVisit: null,
        canCreateNewVisit: false,
        message: "No patient found with this phone number",
      });
    }

    const activeVisit = await Visit.findOne({
      patient: patient._id,
      status: { $in: ACTIVE_VISIT_STATUSES },
    }).sort({ createdAt: -1 });

    return res.json({
      found: true,
      patient,
      activeVisit: activeVisit || null,
      canCreateNewVisit: !activeVisit,
      message: activeVisit
        ? "Patient found but already has an active visit"
        : "Patient found and can receive a new visit",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

// POST /api/reception/create-visit-for-existing-patient
exports.createVisitForExistingPatient = async (req, res) => {
  try {
    const {
      patientId,
      vitals,
      notes,
      status,
      currentDepartment,
      forceNewVisit,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({
        error: "patientId is required",
      });
    }

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found",
      });
    }

    const vitalsCheck = validateVitals(vitals);

    if (vitalsCheck.error) {
      return res.status(400).json({
        error: vitalsCheck.error,
      });
    }

    const activeVisit = await Visit.findOne({
      patient: patientId,
      status: { $in: ACTIVE_VISIT_STATUSES },
    }).sort({ createdAt: -1 });

    if (activeVisit && !forceNewVisit) {
      return res.status(409).json({
        error: "This patient already has an active visit",
        activeVisitId: activeVisit._id,
        activeStatus: activeVisit.status,
        activeDepartment: activeVisit.currentDepartment,
        hint: "Complete or cancel the current visit first, or set forceNewVisit: true if allowed.",
      });
    }

    const visitPayload = {
      patient: patientId,
      visitNumber: generateVisitNumber(),
      status: status || "waiting_consultation",
      currentDepartment: currentDepartment || "consultation",
      vitals: vitalsCheck.data || {},
      notes: notes || "Return visit created by reception",
    };

    const createdVisit = await Visit.create(visitPayload);

    return res.status(201).json({
      message: "New visit created for existing patient",
      patient,
      visit: createdVisit,
    });
  } catch (err) {
    return res.status(400).json({
      error: err.message,
    });
  }
};

// GET /api/reception/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      totalPatients,
      totalActiveVisits,
      waitingConsultation,
      inConsultation,
      waitingLaboratory,
      labInProgress,
      waitingInterpretation,
      waitingBilling,
      waitingDispensary,
      completedToday,
      registeredToday,
    ] = await Promise.all([
      Patient.countDocuments(),
      Visit.countDocuments({
        status: { $in: ACTIVE_VISIT_STATUSES },
      }),
      Visit.countDocuments({
        status: "waiting_consultation",
      }),
      Visit.countDocuments({
        status: "in_consultation",
      }),
      Visit.countDocuments({
        status: "waiting_lab",
      }),
      Visit.countDocuments({
        status: "lab_in_progress",
      }),
      Visit.countDocuments({
        status: "waiting_interpretation",
      }),
      Visit.countDocuments({
        status: "waiting_billing",
      }),
      Visit.countDocuments({
        status: "waiting_dispensary",
      }),
      Visit.countDocuments({
        status: "completed",
        completedAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }),
      Patient.countDocuments({
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }),
    ]);

    return res.json({
      totalPatients,
      totalActiveVisits,
      workflow: {
        waitingConsultation,
        inConsultation,
        waitingLaboratory,
        labInProgress,
        waitingInterpretation,
        waitingBilling,
        waitingDispensary,
      },
      completedToday,
      registeredToday,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};