const Inventory = require("../models/Inventory");
const Drug = require("../models/Drug");
const Dispense = require("../models/Dispense");
const Alert = require("../models/Alert");

function getFacilityFilter(req) {
  const facilityId = req.facilityId || req.user?.facilityId || null;

  if (facilityId) {
    return { facility: facilityId };
  }

  return { facility: null };
}

exports.getDashboardStats = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req);

    // 📦 TOTAL STOCK
    const inventory = await Inventory.find(facilityFilter);
    const totalStock = inventory.reduce((sum, i) => sum + (i.quantity || 0), 0);

    // 💊 TOTAL DRUGS
    const totalDrugs = await Drug.countDocuments(facilityFilter);

    // 📊 TODAY DISPENSE
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayDispense = await Dispense.find({
      ...facilityFilter,
      createdAt: { $gte: today },
    });

    const totalDispensedToday = todayDispense.reduce(
      (sum, d) => sum + (d.quantity || 0),
      0
    );

    // 🚨 ALERTS
    const alerts = await Alert.find(facilityFilter)
      .sort({ createdAt: -1 })
      .limit(5);

    // ⚠️ LOW STOCK
    const lowStock = await Inventory.find({
      ...facilityFilter,
      quantity: { $lt: 50 },
    }).populate("drug");

    // 📊 TOP DRUGS
    const topDrugs = await Dispense.aggregate([
      {
        $match: facilityFilter,
      },
      {
        $group: {
          _id: "$drug",
          total: { $sum: "$quantity" },
        },
      },
      {
        $lookup: {
          from: "drugs",
          localField: "_id",
          foreignField: "_id",
          as: "drugInfo",
        },
      },
      { $unwind: "$drugInfo" },
      {
        $project: {
          name: "$drugInfo.name",
          total: 1,
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]);

    // 📈 DAILY USAGE (LAST 7 DAYS)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const dailyUsage = await Dispense.aggregate([
      {
        $match: {
          ...facilityFilter,
          createdAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          total: { $sum: "$quantity" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalStock,
      totalDrugs,
      totalDispensedToday,
      alerts,
      lowStock,
      topDrugs,
      dailyUsage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};