const User = require("../models/User");
const Patient = require("../models/Patient");
const Visit = require("../models/Visit");
const ActivityLog = require("../models/ActivityLog");
const Inventory = require("../models/Inventory");
const Drug = require("../models/Drug");
const Alert = require("../models/Alert");

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

const USER_ROLES = [
  "admin",
  "reception",
  "doctor",
  "lab",
  "billing",
  "pharmacist",
  "staff",
];

function calculateInventoryRisk(inventoryItems) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let totalStock = 0;
  let lowStockCount = 0;
  let expiringSoonCount = 0;

  for (const item of inventoryItems) {
    const quantity = Number(item.quantity || 0);
    const minStockLevel = Number(item.minStockLevel ?? 50);

    totalStock += quantity;

    if (quantity <= minStockLevel) {
      lowStockCount += 1;
    }

    if (item.expiryDate) {
      const expiry = new Date(item.expiryDate);

      if (!Number.isNaN(expiry.getTime()) && expiry <= thirtyDaysFromNow) {
        expiringSoonCount += 1;
      }
    }
  }

  return {
    totalInventoryItems: inventoryItems.length,
    totalStock,
    lowStockCount,
    expiringSoonCount,
  };
}

// GET /api/admin/overview
exports.getOverview = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      totalUsers,
      totalPatients,
      totalVisits,
      activeVisits,
      completedToday,
      waitingConsultation,
      inConsultation,
      waitingLaboratory,
      labInProgress,
      waitingInterpretation,
      waitingBilling,
      waitingDispensary,
      roleCounts,
      recentVisits,
      inventoryItems,
      totalDrugs,
      totalAlerts,
      unresolvedAlerts,
    ] = await Promise.all([
      User.countDocuments(),
      Patient.countDocuments(),
      Visit.countDocuments(),
      Visit.countDocuments({
        status: { $in: ACTIVE_VISIT_STATUSES },
      }),
      Visit.countDocuments({
        status: "completed",
        completedAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
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
      Promise.all(
        USER_ROLES.map(async (role) => {
          const count = await User.countDocuments({ role });
          return { role, count };
        })
      ),
      Visit.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("patient", "name phone gender age address"),
      Inventory.find()
        .select("quantity minStockLevel expiryDate")
        .lean(),
      Drug.countDocuments(),
      Alert.countDocuments(),
      Alert.countDocuments({ isResolved: false }),
    ]);

    const usersByRole = {};

    for (const item of roleCounts) {
      usersByRole[item.role] = item.count;
    }

    const inventoryRisk = calculateInventoryRisk(inventoryItems);

    return res.json({
      totals: {
        users: totalUsers,
        patients: totalPatients,
        visits: totalVisits,
        activeVisits,
        completedToday,
      },
      usersByRole,
      workflow: {
        waitingConsultation,
        inConsultation,
        waitingLaboratory,
        labInProgress,
        waitingInterpretation,
        waitingBilling,
        waitingDispensary,
      },
      inventory: {
        totalDrugs,
        totalInventoryItems: inventoryRisk.totalInventoryItems,
        totalStock: inventoryRisk.totalStock,
        lowStockCount: inventoryRisk.lowStockCount,
        expiringSoonCount: inventoryRisk.expiringSoonCount,
      },
      alerts: {
        total: totalAlerts,
        unresolved: unresolvedAlerts,
        resolved: totalAlerts - unresolvedAlerts,
      },
      recentVisits,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

// GET /api/admin/activity-logs
exports.getActivityLogs = async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Math.min(
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? requestedLimit
        : 50,
      200
    );

    const [total, logs] = await Promise.all([
      ActivityLog.countDocuments(),
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("actor", "name email role")
        .populate("patient", "name phone gender age address")
        .populate("visit", "visitNumber status currentDepartment"),
    ]);

    return res.json({
      total,
      logs,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};