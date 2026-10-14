const Payment = require("../models/Payment");
const Visit = require("../models/Visit");
const User = require("../models/User");

const PAYMENT_METHODS = [
  "cash",
  "mobile_money",
  "bank_transfer",
  "insurance",
  "other",
];

const PAYMENT_STATUSES = ["paid", "partial", "unpaid"];

function parseAmount(value, label) {
  if (value === undefined || value === null || value === "") {
    return {
      error: `${label} is required`,
      value: null,
    };
  }

  const num = Number(value);

  if (!Number.isFinite(num)) {
    return {
      error: `${label} must be a valid number`,
      value: null,
    };
  }

  if (num < 0) {
    return {
      error: `${label} cannot be negative`,
      value: null,
    };
  }

  return {
    error: null,
    value: num,
  };
}

function determinePaymentStatus(chargedAmount, amountPaid) {
  if (amountPaid <= 0) {
    return "unpaid";
  }

  if (amountPaid >= chargedAmount) {
    return "paid";
  }

  return "partial";
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

function getRangeFilter(range) {
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  if (range === "today") {
    return {
      paidAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    };
  }

  if (range === "7") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);

    return {
      paidAt: {
        $gte: from,
        $lte: endOfDay,
      },
    };
  }

  if (range === "30") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);

    return {
      paidAt: {
        $gte: from,
        $lte: endOfDay,
      },
    };
  }

  return {};
}

// POST /api/payments
exports.createPayment = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const {
      visit,
      chargedAmount,
      amountPaid,
      method,
      reference,
      note,
    } = req.body;

    if (!visit) {
      return res.status(400).json({
        error: "visit is required",
      });
    }

    const chargedCheck = parseAmount(chargedAmount, "Charged amount");

    if (chargedCheck.error) {
      return res.status(400).json({
        error: chargedCheck.error,
      });
    }

    const paidCheck = parseAmount(amountPaid, "Amount paid");

    if (paidCheck.error) {
      return res.status(400).json({
        error: paidCheck.error,
      });
    }

    const charged = chargedCheck.value;
    const paid = paidCheck.value;

    if (paid > charged) {
      return res.status(400).json({
        error: "Amount paid cannot be greater than charged amount",
      });
    }

    let cleanMethod = String(method || "").trim();

    if (paid > 0) {
      if (!PAYMENT_METHODS.includes(cleanMethod)) {
        return res.status(400).json({
          error: "Valid payment method is required when amount is paid",
        });
      }
    } else {
      cleanMethod = "other";
    }

    const visitDoc = await Visit.findById(visit);

    if (!visitDoc) {
      return res.status(404).json({
        error: "Visit not found",
      });
    }

    const status = determinePaymentStatus(charged, paid);

    const payment = await Payment.create({
      visit: visitDoc._id,
      patient: visitDoc.patient,
      chargedAmount: charged,
      amountPaid: paid,
      method: cleanMethod,
      reference: reference ? String(reference).trim() : undefined,
      status,
      collectedBy: userId,
      paidAt: new Date(),
      note: note ? String(note).trim() : undefined,
    });

    const populated = await Payment.findById(payment._id)
      .populate("visit", "visitNumber status currentDepartment patient")
      .populate("patient", "name phone gender age address tribe nextOfKinName nextOfKinPhone")
      .populate("collectedBy", "name email role");

    return res.status(201).json({
      message: "Payment recorded successfully.",
      payment: populated,
    });
  } catch (err) {
    console.log("CREATE PAYMENT ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to record payment",
    });
  }
};

// GET /api/payments
exports.getPayments = async (req, res) => {
  try {
    const { range, status, method, limit } = req.query;

    const filter = getRangeFilter(
      range === "all" ? "all" : range || "today"
    );

    if (status && PAYMENT_STATUSES.includes(String(status))) {
      filter.status = String(status);
    }

    if (method && PAYMENT_METHODS.includes(String(method))) {
      filter.method = String(method);
    }

    const requestedLimit = Number(limit);

    const safeLimit = Math.min(
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? requestedLimit
        : 200,
      500
    );

    const [total, payments] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter)
        .sort({ paidAt: -1, createdAt: -1 })
        .limit(safeLimit)
        .populate("visit", "visitNumber status currentDepartment patient")
        .populate("patient", "name phone gender age address tribe nextOfKinName nextOfKinPhone")
        .populate("collectedBy", "name email role"),
    ]);

    return res.json({
      total,
      payments,
    });
  } catch (err) {
    console.log("GET PAYMENTS ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load payments",
    });
  }
};

// GET /api/payments/summary
exports.getSummary = async (req, res) => {
  try {
    const { range } = req.query;

    const dateFilter = getRangeFilter(
      range === "all" ? "all" : range || "today"
    );

    const [
      totalAgg,
      rangeAgg,
      methodAgg,
      statusAgg,
      collectorAgg,
    ] = await Promise.all([
      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalIncome: { $sum: "$amountPaid" },
            totalCharged: { $sum: "$chargedAmount" },
            transactions: { $sum: 1 },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: dateFilter,
        },
        {
          $group: {
            _id: null,
            income: { $sum: "$amountPaid" },
            charged: { $sum: "$chargedAmount" },
            transactions: { $sum: 1 },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: dateFilter,
        },
        {
          $group: {
            _id: "$method",
            amount: { $sum: "$amountPaid" },
            count: { $sum: 1 },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: dateFilter,
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$amountPaid" },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: dateFilter,
        },
        {
          $group: {
            _id: "$collectedBy",
            amountPaid: { $sum: "$amountPaid" },
            chargedAmount: { $sum: "$chargedAmount" },
            transactions: { $sum: 1 },
          },
        },
        {
          $sort: { amountPaid: -1 },
        },
        {
          $limit: 50,
        },
      ]),
    ]);

    const total = totalAgg[0] || {};
    const rangeSummary = rangeAgg[0] || {};

    const byMethod = {
      cash: 0,
      mobile_money: 0,
      bank_transfer: 0,
      insurance: 0,
      other: 0,
    };

    for (const item of methodAgg) {
      const method = String(item._id || "other");

      if (byMethod[method] === undefined) {
        byMethod.other += Number(item.amount || 0);
      } else {
        byMethod[method] += Number(item.amount || 0);
      }
    }

    const byStatus = {
      paid: 0,
      partial: 0,
      unpaid: 0,
    };

    for (const item of statusAgg) {
      const status = String(item._id || "unpaid");

      if (byStatus[status] === undefined) {
        byStatus.unpaid += Number(item.count || 0);
      } else {
        byStatus[status] += Number(item.count || 0);
      }
    }

    const collectorIds = collectorAgg
      .map((item) => item._id)
      .filter(Boolean);

    const collectors =
      collectorIds.length > 0
        ? await User.find({
            _id: { $in: collectorIds },
          })
            .select("name email role")
            .lean()
        : [];

    const collectorMap = new Map(
      collectors.map((collector) => [String(collector._id), collector])
    );

    const byCollector = collectorAgg.map((item) => {
      const collector = collectorMap.get(String(item._id)) || null;

      const amountPaid = Number(item.amountPaid || 0);
      const chargedAmount = Number(item.chargedAmount || 0);

      return {
        collectorId: item._id,
        collector,
        amountPaid,
        chargedAmount,
        outstanding: Math.max(chargedAmount - amountPaid, 0),
        transactions: Number(item.transactions || 0),
      };
    });

    const income = Number(rangeSummary.income || 0);
    const charged = Number(rangeSummary.charged || 0);
    const transactions = Number(rangeSummary.transactions || 0);

    return res.json({
      range: range === "all" ? "all" : range || "today",

      income,
      charged,
      outstanding: Math.max(charged - income, 0),
      transactions,
      averagePayment:
        transactions > 0 ? Math.round(income / transactions) : 0,

      totalIncome: Number(total.totalIncome || 0),
      totalCharged: Number(total.totalCharged || 0),
      totalOutstanding: Math.max(
        Number(total.totalCharged || 0) -
          Number(total.totalIncome || 0),
        0
      ),
      totalTransactions: Number(total.transactions || 0),

      byMethod,
      byStatus,
      byCollector,

      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.log("PAYMENT SUMMARY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load payment summary",
    });
  }
};