const Visit = require("../models/Visit");
const ActivityLog = require("../models/ActivityLog");

const VISIT_STATUSES = [
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
  "completed",
  "cancelled",
  "no_show",
];

const DEPARTMENTS = [
  "reception",
  "consultation",
  "procedures",
  "laboratory",
  "interpretation",
  "billing",
  "dispensary",
  "closed",
];

const DISCHARGE_STATUSES = [
  "improved",
  "stable",
  "referred",
  "admitted",
  "discharged",
  "other",
];

const LAB_RESULT_STATUSES = [
  "normal",
  "abnormal",
  "critical",
  "pending",
];

const ALLOWED_MOVES = {
  registered: [
    "waiting_consultation",
    "cancelled",
    "no_show",
  ],

  waiting_consultation: [
    "in_consultation",
    "waiting_lab",
    "waiting_procedure",
    "cancelled",
    "no_show",
  ],

  in_consultation: [
    "waiting_lab",
    "waiting_billing",
    "waiting_dispensary",
    "waiting_procedure",
    "completed",
    "cancelled",
  ],

  waiting_procedure: [
    "procedure_in_progress",
    "cancelled",
  ],

  procedure_in_progress: [
    "waiting_lab",
    "waiting_billing",
    "waiting_dispensary",
    "completed",
    "cancelled",
  ],

  waiting_lab: [
    "lab_in_progress",
    "waiting_billing",
    "cancelled",
  ],

  lab_in_progress: [
    "waiting_interpretation",
    "waiting_billing",
    "cancelled",
  ],

  waiting_interpretation: [
    "waiting_billing",
    "completed",
    "cancelled",
  ],

  waiting_billing: [
    "waiting_dispensary",
    "completed",
    "cancelled",
  ],

  waiting_dispensary: [
    "completed",
    "cancelled",
  ],

  completed: [],
  cancelled: [],
  no_show: [],
};

const STATUS_DEFAULT_DEPARTMENT = {
  registered: "reception",
  waiting_consultation: "consultation",
  in_consultation: "consultation",
  waiting_procedure: "procedures",
  procedure_in_progress: "procedures",
  waiting_lab: "laboratory",
  lab_in_progress: "laboratory",
  waiting_interpretation: "interpretation",
  waiting_billing: "billing",
  waiting_dispensary: "dispensary",
  completed: "closed",
  cancelled: "closed",
  no_show: "closed",
};

const ROLE_ALLOWED_TARGET_STATUSES = {
  admin: null,

  reception: [
    "registered",
    "waiting_consultation",
    "cancelled",
    "no_show",
  ],

  doctor: [
    "in_consultation",
    "waiting_lab",
    "waiting_billing",
    "waiting_dispensary",
    "waiting_procedure",
    "procedure_in_progress",
    "completed",
    "cancelled",
  ],

  lab: [
    "lab_in_progress",
    "waiting_interpretation",
    "waiting_billing",
    "cancelled",
  ],

  billing: [
    "waiting_dispensary",
    "completed",
    "cancelled",
  ],

  pharmacist: [
    "completed",
    "cancelled",
  ],

  staff: [
    "waiting_procedure",
    "procedure_in_progress",
    "waiting_lab",
    "waiting_billing",
    "waiting_dispensary",
    "completed",
    "cancelled",
  ],
};

const ROLE_ALLOWED_DEPARTMENTS = {
  admin: null,

  reception: [
    "reception",
    "consultation",
    "closed",
  ],

  doctor: [
    "consultation",
    "procedures",
    "laboratory",
    "interpretation",
    "billing",
    "dispensary",
    "closed",
  ],

  lab: [
    "laboratory",
    "interpretation",
    "billing",
    "closed",
  ],

  billing: [
    "billing",
    "dispensary",
    "closed",
  ],

  pharmacist: [
    "dispensary",
    "closed",
  ],

  staff: [
    "procedures",
    "laboratory",
    "billing",
    "dispensary",
    "closed",
  ],
};

function canRoleMoveToStatus(role, status) {
  if (!role) return false;
  if (role === "admin") return true;

  const allowed = ROLE_ALLOWED_TARGET_STATUSES[role];
  return Array.isArray(allowed) && allowed.includes(status);
}

function canRoleSetDepartment(role, department) {
  if (!role) return false;
  if (role === "admin") return true;

  const allowed = ROLE_ALLOWED_DEPARTMENTS[role];
  return Array.isArray(allowed) && allowed.includes(department);
}

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

function cleanText(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > 2000) {
    return null;
  }

  return trimmed;
}

function validateVitals(vitals) {
  if (vitals === undefined) {
    return { error: null, data: null };
  }

  if (typeof vitals !== "object" || vitals === null || Array.isArray(vitals)) {
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

  if (temperatureC !== undefined && (temperatureC < -50 || temperatureC > 100)) {
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

function validateVisitSummary(summary) {
  if (summary === undefined || summary === null) {
    return {
      error: null,
      data: null,
    };
  }

  if (typeof summary !== "object" || Array.isArray(summary)) {
    return {
      error: "visitSummary must be an object",
      data: null,
    };
  }

  const result = {};

  const diagnosis = cleanText(summary.diagnosis);

  if (diagnosis === null) {
    return {
      error: "Diagnosis must be a valid text value",
      data: null,
    };
  }

  if (diagnosis !== undefined) {
    result.diagnosis = diagnosis;
  }

  const treatmentGiven = cleanText(summary.treatmentGiven);

  if (treatmentGiven === null) {
    return {
      error: "Treatment given must be a valid text value",
      data: null,
    };
  }

  if (treatmentGiven !== undefined) {
    result.treatmentGiven = treatmentGiven;
  }

  const advice = cleanText(summary.advice);

  if (advice === null) {
    return {
      error: "Advice must be a valid text value",
      data: null,
    };
  }

  if (advice !== undefined) {
    result.advice = advice;
  }

  const summaryNote = cleanText(summary.summaryNote);

  if (summaryNote === null) {
    return {
      error: "Summary note must be a valid text value",
      data: null,
    };
  }

  if (summaryNote !== undefined) {
    result.summaryNote = summaryNote;
  }

  if (
    summary.dischargeStatus !== undefined &&
    summary.dischargeStatus !== null &&
    summary.dischargeStatus !== ""
  ) {
    const dischargeStatus = String(summary.dischargeStatus)
      .trim()
      .toLowerCase();

    if (!DISCHARGE_STATUSES.includes(dischargeStatus)) {
      return {
        error: `Discharge status must be one of: ${DISCHARGE_STATUSES.join(
          ", "
        )}`,
        data: null,
      };
    }

    result.dischargeStatus = dischargeStatus;
  }

  if (
    summary.followUpDate !== undefined &&
    summary.followUpDate !== null &&
    summary.followUpDate !== ""
  ) {
    const followUpDate = new Date(summary.followUpDate);

    if (Number.isNaN(followUpDate.getTime())) {
      return {
        error: "Follow-up date is invalid",
        data: null,
      };
    }

    result.followUpDate = followUpDate;
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

function validateLabResults(results) {
  if (results === undefined || results === null) {
    return {
      error: null,
      data: null,
    };
  }

  if (!Array.isArray(results)) {
    return {
      error: "labResults must be an array",
      data: null,
    };
  }

  if (results.length > 50) {
    return {
      error: "Too many lab results. Maximum is 50.",
      data: null,
    };
  }

  const cleaned = [];

  for (let i = 0; i < results.length; i += 1) {
    const item = results[i];

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {
        error: `Lab result at position ${i + 1} must be an object`,
        data: null,
      };
    }

    const testName =
      typeof item.testName === "string" ? item.testName.trim() : "";

    const resultValue =
      typeof item.resultValue === "string"
        ? item.resultValue.trim()
        : "";

    if (!testName) {
      return {
        error: `Lab result at position ${i + 1} requires testName`,
        data: null,
      };
    }

    if (!resultValue) {
      return {
        error: `Lab result at position ${i + 1} requires resultValue`,
        data: null,
      };
    }

    let status = "normal";

    if (
      item.status !== undefined &&
      item.status !== null &&
      item.status !== ""
    ) {
      status = String(item.status).trim().toLowerCase();

      if (!LAB_RESULT_STATUSES.includes(status)) {
        return {
          error: `Lab result status must be one of: ${LAB_RESULT_STATUSES.join(
            ", "
          )}`,
          data: null,
        };
      }
    }

    const unit =
      typeof item.unit === "string" ? item.unit.trim() : undefined;

    const referenceRange =
      typeof item.referenceRange === "string"
        ? item.referenceRange.trim()
        : undefined;

    const notes =
      typeof item.notes === "string" ? item.notes.trim() : undefined;

    let performedAt = new Date();

    if (
      item.performedAt !== undefined &&
      item.performedAt !== null &&
      item.performedAt !== ""
    ) {
      const parsedDate = new Date(item.performedAt);

      if (Number.isNaN(parsedDate.getTime())) {
        return {
          error: `Lab result at position ${i + 1} has an invalid performedAt date`,
          data: null,
        };
      }

      performedAt = parsedDate;
    }

    cleaned.push({
      testName,
      resultValue,
      unit: unit || undefined,
      referenceRange: referenceRange || undefined,
      status,
      notes: notes || undefined,
      performedAt,
    });
  }

  return {
    error: null,
    data: cleaned,
  };
}

function validatePrescriptions(items) {
  if (items === undefined || items === null) {
    return {
      error: null,
      data: null,
    };
  }

  if (!Array.isArray(items)) {
    return {
      error: "prescriptions must be an array",
      data: null,
    };
  }

  if (items.length > 50) {
    return {
      error: "Too many prescriptions. Maximum is 50.",
      data: null,
    };
  }

  const cleaned = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {
        error: `Prescription at position ${i + 1} must be an object`,
        data: null,
      };
    }

    const drugName =
      typeof item.drugName === "string" ? item.drugName.trim() : "";

    if (!drugName) {
      return {
        error: `Prescription at position ${i + 1} requires drug name`,
        data: null,
      };
    }

    const quantity = Number(item.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        error: `Prescription at position ${i + 1} requires a valid quantity greater than zero`,
        data: null,
      };
    }

    const strength =
      typeof item.strength === "string" ? item.strength.trim() : "";

    const dosage =
      typeof item.dosage === "string" ? item.dosage.trim() : "";

    const frequency =
      typeof item.frequency === "string" ? item.frequency.trim() : "";

    const duration =
      typeof item.duration === "string" ? item.duration.trim() : "";

    const instructions =
      typeof item.instructions === "string"
        ? item.instructions.trim()
        : "";

    if (strength.length > 100) {
      return {
        error: `Prescription strength at position ${i + 1} is too long`,
        data: null,
      };
    }

    if (dosage.length > 200) {
      return {
        error: `Prescription dosage at position ${i + 1} is too long`,
        data: null,
      };
    }

    if (frequency.length > 200) {
      return {
        error: `Prescription frequency at position ${i + 1} is too long`,
        data: null,
      };
    }

    if (duration.length > 200) {
      return {
        error: `Prescription duration at position ${i + 1} is too long`,
        data: null,
      };
    }

    if (instructions.length > 1000) {
      return {
        error: `Prescription instructions at position ${i + 1} are too long`,
        data: null,
      };
    }

    cleaned.push({
      drugName,
      strength: strength || undefined,
      quantity,
      dosage: dosage || undefined,
      frequency: frequency || undefined,
      duration: duration || undefined,
      instructions: instructions || undefined,
    });
  }

  return {
    error: null,
    data: cleaned,
  };
}

function validateProcedures(items) {
  if (items === undefined || items === null) {
    return {
      error: null,
      data: null,
    };
  }

  if (!Array.isArray(items)) {
    return {
      error: "procedures must be an array",
      data: null,
    };
  }

  if (items.length > 50) {
    return {
      error: "Too many procedures. Maximum is 50.",
      data: null,
    };
  }

  const cleaned = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {
        error: `Procedure at position ${i + 1} must be an object`,
        data: null,
      };
    }

    const procedureName =
      typeof item.procedureName === "string"
        ? item.procedureName.trim()
        : "";

    if (!procedureName) {
      return {
        error: `Procedure at position ${i + 1} requires procedureName`,
        data: null,
      };
    }

    if (procedureName.length > 300) {
      return {
        error: `Procedure name at position ${i + 1} is too long`,
        data: null,
      };
    }

    const treatmentGiven = cleanText(item.treatmentGiven);

    if (treatmentGiven === null) {
      return {
        error: `Treatment given at position ${i + 1} must be valid text`,
        data: null,
      };
    }

    const notes = cleanText(item.notes);

    if (notes === null) {
      return {
        error: `Procedure notes at position ${i + 1} must be valid text`,
        data: null,
      };
    }

    const outcome = cleanText(item.outcome);

    if (outcome === null) {
      return {
        error: `Procedure outcome at position ${i + 1} must be valid text`,
        data: null,
      };
    }

    const emergency =
      item.emergency === true ||
      item.emergency === "true" ||
      item.emergency === 1 ||
      item.emergency === "1";

    let performedAt = new Date();

    if (
      item.performedAt !== undefined &&
      item.performedAt !== null &&
      item.performedAt !== ""
    ) {
      const parsedDate = new Date(item.performedAt);

      if (Number.isNaN(parsedDate.getTime())) {
        return {
          error: `Procedure at position ${i + 1} has an invalid performedAt date`,
          data: null,
        };
      }

      performedAt = parsedDate;
    }

    cleaned.push({
      procedureName,
      treatmentGiven: treatmentGiven || undefined,
      emergency,
      notes: notes || undefined,
      outcome: outcome || undefined,
      performedAt,
    });
  }

  return {
    error: null,
    data: cleaned,
  };
}

// ➕ Create Visit
exports.createVisit = async (req, res) => {
  try {
    const visit = await Visit.create(req.body);
    res.status(201).json(visit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 📄 Get All Visits
exports.getVisits = async (req, res) => {
  try {
    const { patient, status, department } = req.query;

    const filter = {};

    if (patient) {
      filter.patient = patient;
    }

    if (status) {
      filter.status = status;
    }

    if (department) {
      filter.currentDepartment = department;
    }

    const visits = await Visit.find(filter)
      .sort({ createdAt: -1 })
      .populate(
        "patient",
        "name phone gender age address tribe nextOfKinName nextOfKinPhone"
      );

    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 Get Single Visit
exports.getVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id).populate(
      "patient",
      "name phone gender age address tribe nextOfKinName nextOfKinPhone"
    );

    if (!visit) {
      return res.status(404).json({ error: "Visit not found" });
    }

    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ➡️ Move Visit to another stage/department and optionally update vitals
exports.moveVisit = async (req, res) => {
  try {
    const role = req.user && req.user.role;

    if (!role) {
      return res.status(403).json({
        error: "Forbidden: no role in token",
      });
    }

    const {
      status,
      currentDepartment,
      notes,
      vitals,
      visitSummary,
      labResults,
      prescriptions,
      procedures,
    } = req.body;

    const vitalsCheck = validateVitals(vitals);

    if (vitalsCheck.error) {
      return res.status(400).json({
        error: vitalsCheck.error,
      });
    }

    const vitalsData = vitalsCheck.data;

    const summaryCheck = validateVisitSummary(visitSummary);

    if (summaryCheck.error) {
      return res.status(400).json({
        error: summaryCheck.error,
      });
    }

    const summaryData = summaryCheck.data;

    const labCheck = validateLabResults(labResults);

    if (labCheck.error) {
      return res.status(400).json({
        error: labCheck.error,
      });
    }

    const labData = labCheck.data;

    const prescriptionCheck = validatePrescriptions(prescriptions);

    if (prescriptionCheck.error) {
      return res.status(400).json({
        error: prescriptionCheck.error,
      });
    }

    const prescriptionData = prescriptionCheck.data;

    const procedureCheck = validateProcedures(procedures);

    if (procedureCheck.error) {
      return res.status(400).json({
        error: procedureCheck.error,
      });
    }

    const procedureData = procedureCheck.data;

    if (
      prescriptions !== undefined &&
      prescriptions !== null &&
      role !== "admin" &&
      role !== "doctor"
    ) {
      return res.status(403).json({
        error: "Only doctors and administrators can write prescriptions",
      });
    }

    if (
      !status &&
      !currentDepartment &&
      !vitalsData &&
      !summaryData &&
      labData === null &&
      prescriptionData === null &&
      procedureData === null &&
      notes === undefined
    ) {
      return res.status(400).json({
        error:
          "Provide status, currentDepartment, vitals, notes, visitSummary, labResults, prescriptions, or procedures to update visit",
      });
    }

    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({ error: "Visit not found" });
    }

    const oldStatus = visit.status;
    const oldDepartment = visit.currentDepartment;

    if (status && !VISIT_STATUSES.includes(status)) {
      return res.status(400).json({
        error: "Invalid visit status",
        allowedStatuses: VISIT_STATUSES,
      });
    }

    if (currentDepartment && !DEPARTMENTS.includes(currentDepartment)) {
      return res.status(400).json({
        error: "Invalid department",
        allowedDepartments: DEPARTMENTS,
      });
    }

    if (status) {
      const allowed = ALLOWED_MOVES[visit.status] || [];

      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: `Cannot move visit from "${visit.status}" to "${status}"`,
          allowedMovesFromCurrentStatus: allowed,
        });
      }

      if (!canRoleMoveToStatus(role, status)) {
        return res.status(403).json({
          error: "Forbidden: your role cannot move visit to this status",
          yourRole: role,
          requestedStatus: status,
          allowedStatusesForYourRole:
            role === "admin"
              ? VISIT_STATUSES
              : ROLE_ALLOWED_TARGET_STATUSES[role],
        });
      }

      visit.status = status;

      if (!currentDepartment) {
        const autoDepartment = STATUS_DEFAULT_DEPARTMENT[status];

        if (autoDepartment) {
          visit.currentDepartment = autoDepartment;
        }
      }
    }

    if (currentDepartment) {
      if (!canRoleSetDepartment(role, currentDepartment)) {
        return res.status(403).json({
          error: "Forbidden: your role cannot set this department",
          yourRole: role,
          requestedDepartment: currentDepartment,
          allowedDepartmentsForYourRole:
            role === "admin"
              ? DEPARTMENTS
              : ROLE_ALLOWED_DEPARTMENTS[role],
        });
      }

      visit.currentDepartment = currentDepartment;
    }

    if (notes !== undefined) {
      visit.notes = notes;
    }

    if (vitalsData) {
      visit.vitals = visit.vitals || {};

      if (vitalsData.bloodPressure) {
        visit.vitals.bloodPressure = visit.vitals.bloodPressure || {};
        visit.vitals.bloodPressure.systolic = vitalsData.bloodPressure.systolic;
        visit.vitals.bloodPressure.diastolic =
          vitalsData.bloodPressure.diastolic;
      }

      if (vitalsData.weightKg !== undefined) {
        visit.vitals.weightKg = vitalsData.weightKg;
      }

      if (vitalsData.temperatureC !== undefined) {
        visit.vitals.temperatureC = vitalsData.temperatureC;
      }

      if (vitalsData.pulseBpm !== undefined) {
        visit.vitals.pulseBpm = vitalsData.pulseBpm;
      }
    }

    if (summaryData) {
      if (!visit.visitSummary) {
        visit.visitSummary = {};
      }

      if (summaryData.diagnosis !== undefined) {
        visit.visitSummary.diagnosis = summaryData.diagnosis;
      }

      if (summaryData.treatmentGiven !== undefined) {
        visit.visitSummary.treatmentGiven = summaryData.treatmentGiven;
      }

      if (summaryData.advice !== undefined) {
        visit.visitSummary.advice = summaryData.advice;
      }

      if (summaryData.summaryNote !== undefined) {
        visit.visitSummary.summaryNote = summaryData.summaryNote;
      }

      if (summaryData.dischargeStatus !== undefined) {
        visit.visitSummary.dischargeStatus = summaryData.dischargeStatus;
      }

      if (summaryData.followUpDate !== undefined) {
        visit.visitSummary.followUpDate = summaryData.followUpDate;
      }

      visit.visitSummary.createdBy = req.user?.id || req.user?._id;
      visit.visitSummary.createdAt = new Date();
    }

    if (labData !== null) {
      visit.labResults = labData.map((item) => ({
        ...item,
        enteredBy: req.user?.id || req.user?._id,
      }));
    }

    if (prescriptionData !== null) {
      visit.prescriptions = prescriptionData.map((item) => ({
        ...item,
        prescribedBy: req.user?.id || req.user?._id,
        prescribedAt: new Date(),
      }));
    }

    if (procedureData !== null) {
      visit.procedures = procedureData.map((item) => ({
        ...item,
        performedBy: req.user?.id || req.user?._id,
        performedAt: item.performedAt || new Date(),
      }));
    }

    if (visit.status === "completed") {
      visit.completedAt = new Date();
    }

    await visit.save();

    const updatedVisit = await Visit.findById(visit._id).populate(
      "patient",
      "name phone gender age address tribe nextOfKinName nextOfKinPhone"
    );

    try {
      const action =
        status && status !== oldStatus ? "visit_moved" : "visit_updated";

      const descriptionParts = [];

      if (status && status !== oldStatus) {
        descriptionParts.push(
          `status changed from ${oldStatus} to ${status}`
        );
      }

      if (currentDepartment && currentDepartment !== oldDepartment) {
        descriptionParts.push(
          `department changed from ${oldDepartment} to ${currentDepartment}`
        );
      }

      if (vitalsData) {
        descriptionParts.push("vitals updated");
      }

      if (notes !== undefined) {
        descriptionParts.push("notes updated");
      }

      if (summaryData) {
        descriptionParts.push("visit summary updated");
      }

      if (labData !== null) {
        descriptionParts.push("lab results updated");
      }

      if (prescriptionData !== null) {
        descriptionParts.push("prescriptions updated");
      }

      if (procedureData !== null) {
        descriptionParts.push("procedures updated");
      }

      await ActivityLog.create({
        actor: req.user?.id || req.user?._id,
        actorRole: role,
        action,
        entityType: "Visit",
        entityId: visit._id.toString(),
        patient: visit.patient,
        visit: visit._id,
        description:
          descriptionParts.length > 0
            ? descriptionParts.join("; ")
            : "visit updated",
        changes: {
          fromStatus: oldStatus,
          toStatus: visit.status,
          fromDepartment: oldDepartment,
          toDepartment: visit.currentDepartment,
          notesUpdated: notes !== undefined,
          vitalsUpdated: !!vitalsData,
          summaryUpdated: !!summaryData,
          labResultsUpdated: labData !== null,
          prescriptionUpdated: prescriptionData !== null,
          procedureUpdated: procedureData !== null,
        },
      });
    } catch (logErr) {
      console.log("Activity log error:", logErr.message);
    }

    res.json({
      message: "Visit updated successfully",
      visit: updatedVisit,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};