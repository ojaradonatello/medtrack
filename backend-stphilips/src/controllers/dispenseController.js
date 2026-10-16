const Inventory = require("../models/Inventory");
const Dispense = require("../models/Dispense");
const Visit = require("../models/Visit");
const User = require("../models/User");
const anomalyService = require("../services/anomalyService");

function getUserId(req) {
  return req.user?.id || req.user?._id || null;
}

function toPositiveInt(value) {
  const num = Number(value);

  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
    return null;
  }

  return num;
}

// POST /api/dispense
// Legacy manual dispense endpoint
exports.dispenseDrug = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const { patient, drug, quantity } = req.body;

    if (!patient || !drug || !quantity) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const parsedQuantity = toPositiveInt(quantity);

    if (parsedQuantity === null) {
      return res.status(400).json({
        message: "Quantity must be a whole number greater than zero",
      });
    }

    const inventory = await Inventory.findOne({ drug });

    if (!inventory) {
      return res.status(404).json({
        message: "Drug not found in inventory",
      });
    }

    if (Number(inventory.quantity || 0) < parsedQuantity) {
      return res.status(400).json({
        message: "Insufficient stock",
      });
    }

    inventory.quantity = Number(inventory.quantity || 0) - parsedQuantity;
    await inventory.save();

    const record = await Dispense.create({
      patient,
      drug,
      quantity: parsedQuantity,
      dispensedBy: userId,
    });

    let alerts = [];

    try {
      alerts = await anomalyService.detectAnomaly({
        inventory,
        quantity: parsedQuantity,
        userId,
        drugId: drug,
      });
    } catch (anomalyErr) {
      console.log("ANOMALY ERROR:", anomalyErr.message);
    }

    return res.json({
      message: "Dispensed successfully",
      record,
      alerts: Array.isArray(alerts) ? alerts : [],
    });
  } catch (err) {
    console.error("DISPENSE ERROR:", err);
    return res.status(500).json({
      error: err.message,
    });
  }
};

// GET /api/dispense/queue
exports.getDispenseQueue = async (req, res) => {
  try {
    const visits = await Visit.find({ status: "waiting_dispensary" })
      .sort({ createdAt: 1 })
      .populate(
        "patient",
        "name phone gender age address tribe nextOfKinName nextOfKinPhone"
      );

    res.json({
      total: visits.length,
      queue: visits.map((visit) => ({
        _id: visit._id,
        visitNumber: visit.visitNumber,
        status: visit.status,
        currentDepartment: visit.currentDepartment,
        notes: visit.notes,
        createdAt: visit.createdAt,
        patient: visit.patient,
        prescriptions: visit.prescriptions || [],
      })),
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// POST /api/dispense/prescription
exports.dispensePrescription = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const {
      visitId,
      prescriptionIndex,
      drugId,
      quantity,
      completeVisit,
    } = req.body;

    const index = Number(prescriptionIndex);
    const parsedQuantity = toPositiveInt(quantity);

    if (!visitId) {
      return res.status(400).json({
        error: "visitId is required",
      });
    }

    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({
        error: "prescriptionIndex must be a valid number",
      });
    }

    if (!drugId) {
      return res.status(400).json({
        error: "drugId is required",
      });
    }

    if (parsedQuantity === null) {
      return res.status(400).json({
        error: "Quantity must be a whole number greater than zero",
      });
    }

    const visit = await Visit.findById(visitId);

    if (!visit) {
      return res.status(404).json({
        error: "Visit not found",
      });
    }

    if (visit.status !== "waiting_dispensary") {
      return res.status(400).json({
        error: "This visit is not waiting in dispensary",
      });
    }

    const prescriptions = visit.prescriptions || [];
    const rx = prescriptions[index];

    if (!rx) {
      return res.status(400).json({
        error: "Prescription not found for this visit",
      });
    }

    if (rx.dispensed === true) {
      return res.status(400).json({
        error: "This prescription has already been fully dispensed",
      });
    }

    const prescribedQty = Number(rx.quantity || 0);
    const alreadyDispensed = Number(rx.dispensedQuantity || 0);
    const remainingQty = Math.max(prescribedQty - alreadyDispensed, 0);

    if (remainingQty <= 0) {
      rx.dispensed = true;
      visit.markModified("prescriptions");
      await visit.save();

      return res.status(400).json({
        error: "This prescription has already been fully dispensed",
      });
    }

    if (parsedQuantity > remainingQty) {
      return res.status(400).json({
        error: `Quantity exceeds remaining prescribed amount. Remaining: ${remainingQty}`,
      });
    }

    const inventoryItems = await Inventory.find({ drug: drugId }).sort({
      expiryDate: 1,
      createdAt: 1,
    });

    if (!inventoryItems || inventoryItems.length === 0) {
      return res.status(404).json({
        error: "Drug not found in inventory",
      });
    }

    const totalStock = inventoryItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    if (totalStock < parsedQuantity) {
      return res.status(400).json({
        error: `Insufficient stock. Available: ${totalStock}, requested: ${parsedQuantity}`,
      });
    }

    let left = parsedQuantity;

    for (const item of inventoryItems) {
      if (left <= 0) {
        break;
      }

      const available = Number(item.quantity || 0);

      if (available <= 0) {
        continue;
      }

      const take = Math.min(available, left);
      item.quantity = available - take;
      left -= take;

      await item.save();
    }

    const pharmacist = await User.findById(userId).select("name").lean();

    const record = await Dispense.create({
      patient: visit.patient,
      drug: drugId,
      quantity: parsedQuantity,
      visit: visit._id,
      prescriptionIndex: index,
      drugName: rx.drugName,
      strength: rx.strength,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration,
      instructions: rx.instructions,
      dispensedBy: userId,
    });

    let alerts = [];

    try {
      alerts = await anomalyService.detectAnomaly({
        inventory: inventoryItems[0],
        quantity: parsedQuantity,
        userId,
        drugId,
      });
    } catch (anomalyErr) {
      console.log("ANOMALY ERROR:", anomalyErr.message);
    }

    const newDispensedQty = alreadyDispensed + parsedQuantity;

    rx.dispensedQuantity = newDispensedQty;
    rx.dispensedAt = new Date();
    rx.dispensedBy = userId;
    rx.dispensedByName = pharmacist?.name || req.user?.name || "";

    if (newDispensedQty >= prescribedQty) {
      rx.dispensed = true;
    }

    visit.markModified("prescriptions");

    let completedNow = false;

    if (completeVisit === true || completeVisit === "true") {
      const allDispensed = (visit.prescriptions || []).every(
        (item) => item.dispensed === true
      );

      if (allDispensed) {
        visit.status = "completed";
        visit.currentDepartment = "closed";
        visit.completedAt = new Date();
        completedNow = true;
      }
    }

    await visit.save();

    const updatedVisit = await Visit.findById(visit._id).populate(
      "patient",
      "name phone gender age address tribe nextOfKinName nextOfKinPhone"
    );

    return res.json({
      message: completedNow
        ? "Prescription dispensed and visit completed."
        : "Prescription dispensed successfully.",
      visit: updatedVisit,
      record,
      alerts: Array.isArray(alerts) ? alerts : [],
      completedVisit: completedNow,
    });
  } catch (err) {
    console.error("DISPENSE PRESCRIPTION ERROR:", err);
    return res.status(500).json({
      error: err.message,
    });
  }
};