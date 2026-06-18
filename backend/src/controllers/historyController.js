const Dispense = require("../models/Dispense");

// ===============================
// 📜 GET HISTORY
// ===============================
exports.getHistory = async (req, res) => {
  try {
    // ✅ get days from URL
    const days = Number(req.query.days) || 0;

    // ✅ filter object
    let filter = {};

    // ✅ if days provided
    if (days > 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      filter.createdAt = {
        $gte: startDate,
      };
    }

    // ✅ fetch history
    const history = await Dispense.find(filter)
      .populate("patient")
      .populate("drug")
      .populate("dispensedBy")
      .sort({ createdAt: -1 });

    res.json(history);

  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to fetch history",
    });
  }
};


// ===============================
// 👥 STAFF ANALYTICS
// ===============================
exports.getStaffAnalytics = async (req, res) => {
  try {
    const analytics = await Dispense.aggregate([
      // GROUP BY STAFF
      {
        $group: {
          _id: "$dispensedBy",
          totalDispenses: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
        },
      },

      // JOIN STAFF COLLECTION
      {
        $lookup: {
          from: "staff", // ⚠️ make sure your collection name is correct (see note below)
          localField: "_id",
          foreignField: "_id",
          as: "staff",
        },
      },

      // UNPACK ARRAY
      {
        $unwind: "$staff",
      },

      // CLEAN OUTPUT
      {
        $project: {
          _id: 1,
          totalDispenses: 1,
          totalQuantity: 1,
          name: "$staff.name",
        },
      },

      // SORT MOST ACTIVE FIRST
      {
        $sort: { totalDispenses: -1 },
      },
    ]);

    res.json(analytics);

  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
};