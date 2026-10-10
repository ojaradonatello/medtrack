const Dispense = require("../models/Dispense");

function getDateFilter(query) {
  const range = String(query.range || "").toLowerCase();
  const days = Number(query.days) || 0;

  if (range === "today") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return {
      createdAt: {
        $gte: startOfDay,
      },
    };
  }

  if (days > 0) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return {
      createdAt: {
        $gte: startDate,
      },
    };
  }

  return {};
}

// ===============================
// 📜 GET HISTORY
// ===============================
exports.getHistory = async (req, res) => {
  try {
    const filter = getDateFilter(req.query);

    const history = await Dispense.find(filter)
      .populate("patient", "name phone gender age address")
      .populate("drug", "name category manufacturer")
      .populate("dispensedBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(500);

    res.json(history);
  } catch (err) {
    console.log("HISTORY ERROR:", err);

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
      {
        $group: {
          _id: "$dispensedBy",
          totalDispenses: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "staff",
        },
      },

      {
        $unwind: "$staff",
      },

      {
        $project: {
          _id: 1,
          totalDispenses: 1,
          totalQuantity: 1,
          name: "$staff.name",
          email: "$staff.email",
          role: "$staff.role",
        },
      },

      {
        $sort: {
          totalDispenses: -1,
        },
      },
    ]);

    res.json(analytics);
  } catch (err) {
    console.log("STAFF ANALYTICS ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};