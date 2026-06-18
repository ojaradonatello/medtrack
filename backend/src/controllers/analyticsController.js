// src/controllers/dashboardController.js

const Inventory = require("../models/Inventory");
const Dispense = require("../models/Dispense");
const Alert = require("../models/Alert");
const User = require("../models/User");
const Drug = require("../models/Drug");
const Attendance = require("../models/Attendance");

/**
 * 📊 MEDTRACK ADVANCED DASHBOARD
 * Beginner Friendly + Frontend Ready
 */

exports.getDashboardStats = async (req, res) => {
  try {

    // =========================
    // 📦 INVENTORY
    // =========================
    const inventory = await Inventory.find()
      .populate("drug");

    const totalStock = inventory.reduce(
      (sum, item) =>
        sum + (item.quantity || 0),
      0
    );

    const lowStockItems = inventory.filter(
      item =>
        (item.quantity || 0) <
        (item.minStockLevel || 50)
    ).length;

    // =========================
    // 📅 LAST 7 DAYS
    // =========================
    const last7Days = new Date();

    last7Days.setDate(
      last7Days.getDate() - 7
    );

    // =========================
    // 📈 DAILY USAGE
    // =========================
    const dailyUsage = await Dispense.aggregate([
      {
        $match: {
          createdAt: {
            $gte: last7Days,
          },
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

          total: {
            $sum: "$quantity",
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    // =========================
    // 💊 TOP DRUGS
    // =========================
    const topDrugsRaw =
      await Dispense.aggregate([
        {
          $group: {
            _id: "$drug",

            totalDispensed: {
              $sum: "$quantity",
            },
          },
        },

        {
          $sort: {
            totalDispensed: -1,
          },
        },

        {
          $limit: 5,
        },
      ]);

    const topDrugs = await Promise.all(
      topDrugsRaw.map(async (item) => {

        try {

          const drug =
            await Drug.findById(item._id);

          return {
            name:
              drug?.name ||
              "Unknown Drug",

            total:
              item.totalDispensed || 0,
          };

        } catch {

          return {
            name: "Invalid Drug",

            total:
              item.totalDispensed || 0,
          };
        }
      })
    );

    // =========================
    // 🚨 ALERT TREND
    // =========================
    const alertTrend =
      await Alert.aggregate([
        {
          $match: {
            createdAt: {
              $gte: last7Days,
            },
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

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    // =========================
    // 👨‍⚕️ STAFF ACTIVITY
    // =========================
    const staffRaw =
      await Dispense.aggregate([
        {
          $group: {
            _id: "$dispensedBy",

            total: {
              $sum: "$quantity",
            },
          },
        },
      ]);

    const staffActivity =
      await Promise.all(
        staffRaw.map(async (item) => {

          try {

            const user =
              await User.findById(item._id);

            return {
              name:
                user?.name ||
                "Unknown Staff",

              total:
                item.total || 0,
            };

          } catch {

            return {
              name: "Unknown Staff",

              total:
                item.total || 0,
            };
          }
        })
      );

    // =========================
    // 👨‍⚕️ ATTENDANCE ANALYTICS
    // =========================
    const attendanceRaw =
      await Attendance.aggregate([
        {
          $group: {
            _id: "$staff",

            totalDays: {
              $sum: 1,
            },
          },
        },
      ]);

    const attendanceStats =
      await Promise.all(
        attendanceRaw.map(async (item) => {

          try {

            const user =
              await User.findById(item._id);

            return {
              name:
                user?.name ||
                "Unknown Staff",

              role:
                user?.role ||
                "Staff",

              attendanceDays:
                item.totalDays || 0,
            };

          } catch {

            return {
              name: "Unknown Staff",

              role: "Staff",

              attendanceDays: 0,
            };
          }
        })
      );

    // =========================
    // 📈 PERFORMANCE ANALYTICS
    // =========================
    const performanceStats =
      await Promise.all(
        staffRaw.map(async (item) => {

          try {

            const user =
              await User.findById(item._id);

            const attendance =
              attendanceRaw.find(
                a =>
                  a._id?.toString() ===
                  item._id?.toString()
              );

            const attendanceDays =
              attendance?.totalDays || 0;

            // simple formula
            const performanceScore =
              item.total +
              (attendanceDays * 5);

            return {
              name:
                user?.name ||
                "Unknown",

              role:
                user?.role ||
                "Staff",

              totalDispensed:
                item.total || 0,

              attendanceDays,

              performanceScore,
            };

          } catch {

            return {
              name: "Unknown",

              role: "Staff",

              totalDispensed: 0,

              attendanceDays: 0,

              performanceScore: 0,
            };
          }
        })
      );

    // sort best performers
    performanceStats.sort(
      (a, b) =>
        b.performanceScore -
        a.performanceScore
    );

    // =========================
    // 🏆 TOP PERFORMER
    // =========================
    const topPerformer =
      performanceStats[0] || null;

    // =========================
    // 📤 FINAL RESPONSE
    // =========================
    res.json({

      inventory: {
        totalStock,
        lowStockItems,
      },

      charts: {

        dailyUsage: {
          labels:
            dailyUsage.map(d => d._id),

          data:
            dailyUsage.map(d => d.total),
        },

        alertsTrend: {
          labels:
            alertTrend.map(a => a._id),

          data:
            alertTrend.map(a => a.count),
        },

        topDrugs: {
          labels:
            topDrugs.map(t => t.name),

          data:
            topDrugs.map(t => t.total),
        },

        staffActivity: {
          labels:
            staffActivity.map(s => s.name),

          data:
            staffActivity.map(s => s.total),
        },
      },

      attendance: {
        totalStaffPresent:
          attendanceStats.length,

        staff:
          attendanceStats,
      },

      performance: {
        topPerformer,

        rankings:
          performanceStats,
      },
    });

  } catch (err) {

    console.log(
      "DASHBOARD ERROR:",
      err
    );

    res.status(500).json({
      error: "Dashboard failed",

      details: err.message,
    });
  }
};