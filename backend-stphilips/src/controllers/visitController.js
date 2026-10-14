const Visit = require("../models/Visit");
const ActivityLog = require("../models/ActivityLog");

const VISIT_STATUSES = [
  "registered",
  "waiting_consultation",
  "in_consultation",
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
  "laboratory",
  "interpretation",
  "billing",
  "dispensary",
  "closed",
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
    "cancelled",
    "no_show",
  ],

  in_consultation: [
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
      .populate("patient", "name phone gender age address tribe nextOfKinName nextOfKinPhone");

    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 Get Single Visit
exports.getVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate("patient", "name phone gender age address tribe nextOfKinName nextOfKinPhone");

    if (!visit) {
      return res.status(404).json({ error: "Visit not found" });
    }

    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ➡️ Move Visit to another stage/department and optionally update vitals
// ➡️ Move Visit to another stage/department and optionally update vitals
exports.moveVisit = async (req, res) => {
  try {
    const role = req.user && req.user.role;

    if (!role) {
      return res.status(403).json({
        error: "Forbidden: no role in token",
      });
    }

    const { status, currentDepartment, notes, vitals } = req.body;

    const vitalsCheck = validateVitals(vitals);

    if (vitalsCheck.error) {
      return res.status(400).json({
        error: vitalsCheck.error,
      });
    }

    const vitalsData = vitalsCheck.data;

    if (!status && !currentDepartment && !vitalsData) {
      return res.status(400).json({
        error: "Provide status, currentDepartment, or vitals to update visit",
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

    if (visit.status === "completed") {
      visit.completedAt = new Date();
    }

    await visit.save();

    const updatedVisit = await Visit.findById(visit._id)
      .populate("patient", "name phone gender age address tribe nextOfKinName nextOfKinPhone");

    // Create audit log, but do not block the main workflow if logging fails
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

      await ActivityLog.create({
        actor: req.user.id,
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