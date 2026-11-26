const Dispense = require("../models/Dispense");
const Inventory = require("../models/Inventory");
const User = require("../models/User");

function getFacilityFilter(req) {
  const facilityId = req.facilityId || req.user?.facilityId || null;

  if (facilityId) {
    return { facility: facilityId };
  }

  return { facility: null };
}

exports.getAnomalies = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req);

    const anomalies = [];

    // =========================
    // 1. LARGE DISPENSING
    // =========================

    const largeDispense = await Dispense.find({
      ...facilityFilter,
      quantity: { $gte: 10 },
    })
      .populate("drug")
      .populate("patient")
      .populate("dispensedBy");

    largeDispense.forEach((item) => {
      anomalies.push({
        type: "Large Dispense",
        severity: "high",
        message:
          `${item.dispensedBy?.name || "Unknown"} dispensed ` +
          `${item.quantity} units of ` +
          `${item.drug?.name || "Unknown Drug"}`,
      });
    });

    // =========================
    // 2. LOW STOCK
    // =========================

    const lowStock = await Inventory.find({
      ...facilityFilter,
      $expr: {
        $lte: ["$quantity", "$minStockLevel"],
      },
    }).populate("drug");

    lowStock.forEach((item) => {
      anomalies.push({
        type: "Low Stock",
        severity: "medium",
        message:
          `${item.drug?.name || "Unknown Drug"} ` +
          `is running low (${item.quantity} left)`,
      });
    });

    // =========================
    // 3. FREQUENT STAFF ACTIVITY
    // =========================

    const staffActivity = await Dispense.aggregate([
      {
        $match: facilityFilter,
      },
      {
        $group: {
          _id: "$dispensedBy",
          totalDispensed: { $sum: "$quantity" },
        },
      },
      {
        $match: {
          totalDispensed: { $gte: 50 },
        },
      },
    ]);

    const staffIds = staffActivity
      .map((item) => item._id)
      .filter(Boolean);

    const staffUsers =
      staffIds.length > 0
        ? await User.find({
            _id: { $in: staffIds },
            ...facilityFilter,
          })
            .select("name role")
            .lean()
        : [];

    const staffMap = new Map(
      staffUsers.map((user) => [String(user._id), user])
    );

    for (const activity of staffActivity) {
      const staff = staffMap.get(String(activity._id)) || null;

      anomalies.push({
        type: "High Staff Activity",
        severity: "medium",
        staffId: activity._id,
        staffName: staff?.name || "Unknown Staff",
        message:
          `${staff?.name || "Staff"} dispensed ` +
          `${activity.totalDispensed} total drugs`,
      });
    }

    res.json(anomalies);
  } catch (err) {
    console.log("ANOMALY CONTROLLER ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};