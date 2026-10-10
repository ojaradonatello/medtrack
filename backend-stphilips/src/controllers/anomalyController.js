const Dispense = require("../models/Dispense");
const Inventory = require("../models/Inventory");

exports.getAnomalies = async (req, res) => {
  try {

    const anomalies = [];

    // =========================
    // 1. LARGE DISPENSING
    // =========================

    const largeDispense = await Dispense.find({
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

    for (const activity of staffActivity) {

      anomalies.push({
        type: "High Staff Activity",
        severity: "medium",

        message:
          `Staff ID ${activity._id} dispensed ` +
          `${activity.totalDispensed} total drugs`,
      });
    }

    res.json(anomalies);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: err.message,
    });

  }
};