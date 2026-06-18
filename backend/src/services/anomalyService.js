const Alert = require("../models/Alert");
const Dispense = require("../models/Dispense");
const whatsappService = require("../utils/whatsappService");
/**
 * Advanced anomaly detection system
 */
exports.detectAnomaly = async ({ inventory, quantity, userId, drugId }) => {
  try {
    const alerts = [];

    // =========================
    // 📊 1. DAILY USAGE SPIKE
    // =========================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyDispenses = await Dispense.find({
      drug: drugId,
      createdAt: { $gte: today }
    });

    const totalToday = dailyDispenses.reduce((sum, d) => sum + d.quantity, 0);

    if (totalToday > 300) {
      alerts.push({
        type: "usage-spike",
        message: `Unusual high daily usage detected (${totalToday} units today)`
      });
    }

    // =========================
    // 👨‍⚕️ 2. STAFF BEHAVIOR TRACKING
    // =========================
    const userDispenses = await Dispense.find({
      dispensedBy: userId,
      createdAt: { $gte: today }
    });

    const userTotal = userDispenses.reduce((sum, d) => sum + d.quantity, 0);

    if (userTotal > 200) {
      alerts.push({
        type: "staff-anomaly",
        message: `Staff exceeded normal dispensing volume (${userTotal} units today)`
      });
    }

    // =========================
    // 📈 3. STOCK PREDICTION (BASIC)
    // =========================
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const weeklyDispenses = await Dispense.find({
      drug: drugId,
      createdAt: { $gte: last7Days }
    });

    const weeklyTotal = weeklyDispenses.reduce((sum, d) => sum + d.quantity, 0);

    const avgDailyUsage = weeklyTotal / 7;

    if (avgDailyUsage > 0) {
      const daysLeft = inventory.quantity / avgDailyUsage;

      if (daysLeft < 7) {
        alerts.push({
          type: "stock-risk",
          message: `Stock may run out in ${Math.ceil(daysLeft)} days`
        });
      }
    }

    // =========================
    // ⚠️ EXISTING RULES
    // =========================

    // Large quantity
    if (quantity > 100) {
      alerts.push({
        type: "anomaly",
        message: "Unusually high drug dispense quantity"
      });
    }

    // Low stock
    if (inventory.quantity < (inventory.minStockLevel || 50)) {
      alerts.push({
        type: "low-stock",
        message: "Stock falling below minimum level"
      });
    }

    // Expiry check
    if (inventory.expiryDate) {
      const today = new Date();
      const expiry = new Date(inventory.expiryDate);

      const diffDays = Math.ceil(
        (expiry - today) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 30) {
        alerts.push({
          type: "expiry",
          message: `Drug nearing expiry (${diffDays} days left)`
        });
      }
    }

    // =========================
    // 💾 SAVE ALERTS
    // =========================
    const savedAlerts = [];

    for (let alert of alerts) {
      const saved = await Alert.create({
        type: alert.type,
        message: alert.message
      });

      savedAlerts.push(saved);
    }

    return savedAlerts.map(a => a.message);

  } catch (err) {
    console.error("ANOMALY ERROR:", err);
    return [];
  }
};