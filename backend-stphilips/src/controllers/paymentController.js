const Payment = require("../models/Payment");
const Visit = require("../models/Visit");

const PAYMENT_METHODS = [
  "cash",
  "mobile_money",
  "bank_transfer",
  "insurance",
  "other",
];

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
      .populate("patient", "name phone gender age address")
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
    const { visitId, status, method, limit } = req.query;

    const filter = {};

    if (visitId) {
      filter.visit = visitId;
    }

    if (status) {
      filter.status = status;
    }

    if (method) {
      filter.method = method;
    }

    const requestedLimit = Number(limit);

    const safeLimit = Math.min(
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? requestedLimit
        : 100,
      500
    );

    const [total, payments] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter)
        .sort({ paidAt: -1, createdAt: -1 })
        .limit(safeLimit)
        .populate("visit", "visitNumber status currentDepartment patient")
        .populate("patient", "name phone gender age address")
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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [totalAgg, todayAgg, methodAgg] = await Promise.all([
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
          $match: {
            paidAt: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        },
        {
          $group: {
            _id: null,
            incomeToday: { $sum: "$amountPaid" },
            chargedToday: { $sum: "$chargedAmount" },
            transactionsToday: { $sum: 1 },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: {
            paidAt: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        },
        {
          $group: {
            _id: "$method",
            amount: { $sum: "$amountPaid" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const total = totalAgg[0] || {};
    const today = todayAgg[0] || {};

    const byMethodToday = {
      cash: 0,
      mobile_money: 0,
      bank_transfer: 0,
      insurance: 0,
      other: 0,
    };

    for (const item of methodAgg) {
      const method = String(item._id || "other");

      if (byMethodToday[method] === undefined) {
        byMethodToday.other += Number(item.amount || 0);
      } else {
        byMethodToday[method] += Number(item.amount || 0);
      }
    }

    const incomeToday = Number(today.incomeToday || 0);
    const transactionsToday = Number(today.transactionsToday || 0);

    return res.json({
      totalIncome: Number(total.totalIncome || 0),
      totalCharged: Number(total.totalCharged || 0),
      transactions: Number(total.transactions || 0),
      incomeToday,
      chargedToday: Number(today.chargedToday || 0),
      transactionsToday,
      averagePaymentToday:
        transactionsToday > 0
          ? Math.round(incomeToday / transactionsToday)
          : 0,
      byMethodToday,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.log("PAYMENT SUMMARY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load payment summary",
    });
  }
};