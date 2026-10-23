const mongoose = require("mongoose");

const Bill = require("../models/Bill");
const Patient = require("../models/Patient");
const Visit = require("../models/Visit");

const BILL_FACILITY_TYPES = [
  "hospital",
  "clinic",
  "drug_shop",
  "walk_in",
];

const BILL_STATUSES = [
  "open",
  "partial",
  "paid",
  "void",
  "refunded",
];

const BILL_ITEM_CATEGORIES = [
  "consultation",
  "laboratory",
  "procedure",
  "medicine",
  "service",
  "other",
];

const PAYMENT_METHODS = [
  "cash",
  "mobile_money",
  "bank_transfer",
  "insurance",
  "other",
];

function roundMoney(value) {
  const num = Number(value || 0);

  if (!Number.isFinite(num)) {
    return 0;
  }

  return Math.round(num * 100) / 100;
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

function getUserName(req) {
  return req.user?.name || req.user?.username || "Staff";
}

function parseAmount(value, label, options = {}) {
  const { required = true, min = 0, allowZero = true } = options;

  if (value === undefined || value === null || value === "") {
    if (required) {
      return {
        error: `${label} is required`,
        value: null,
      };
    }

    return {
      error: null,
      value: 0,
    };
  }

  const num = Number(value);

  if (!Number.isFinite(num)) {
    return {
      error: `${label} must be a valid number`,
      value: null,
    };
  }

  if (!allowZero && num === 0) {
    return {
      error: `${label} must be greater than zero`,
      value: null,
    };
  }

  if (num < min) {
    return {
      error: `${label} cannot be less than ${min}`,
      value: null,
    };
  }

  return {
    error: null,
    value: roundMoney(num),
  };
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generateBillNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase();

  return `B-${year}${month}${day}-${random}`;
}

function getDateBounds(range) {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (range === "7") {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  }

  if (range === "30") {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  }

  if (range === "all") {
    return null;
  }

  return { start, end };
}

function createdAtFilter(range) {
  const bounds = getDateBounds(range);

  if (!bounds) {
    return {};
  }

  return {
    createdAt: {
      $gte: bounds.start,
      $lte: bounds.end,
    },
  };
}

function paymentsDateFilter(range) {
  const bounds = getDateBounds(range);

  if (!bounds) {
    return {};
  }

  return {
    "payments.paidAt": {
      $gte: bounds.start,
      $lte: bounds.end,
    },
  };
}

function buildPaymentPipeline(range) {
  const filter = paymentsDateFilter(range);
  const hasFilter = Object.keys(filter).length > 0;

  const stages = [];

  if (hasFilter) {
    stages.push({ $match: filter });
  }

  stages.push({ $unwind: "$payments" });

  if (hasFilter) {
    stages.push({ $match: filter });
  }

  return stages;
}

function buildItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      error: "At least one bill item is required",
      items: null,
      subtotal: 0,
    };
  }

  const items = [];
  let subtotal = 0;

  for (let index = 0; index < rawItems.length; index += 1) {
    const row = rawItems[index] || {};

    const description = String(row.description || "").trim();

    if (!description) {
      return {
        error: `Item ${index + 1} needs a description`,
        items: null,
        subtotal: 0,
      };
    }

    const category = BILL_ITEM_CATEGORIES.includes(row.category)
      ? row.category
      : "other";

    const quantityResult = parseAmount(row.quantity, `Item ${index + 1} quantity`, {
      required: true,
      min: 0.01,
      allowZero: false,
    });

    if (quantityResult.error) {
      return {
        error: quantityResult.error,
        items: null,
        subtotal: 0,
      };
    }

    const unitPriceResult = parseAmount(
      row.unitPrice,
      `Item ${index + 1} unit price`,
      {
        required: true,
        min: 0,
        allowZero: true,
      }
    );

    if (unitPriceResult.error) {
      return {
        error: unitPriceResult.error,
        items: null,
        subtotal: 0,
      };
    }

    const amount = roundMoney(quantityResult.value * unitPriceResult.value);

    let drugId;
    if (row.drugId) {
      if (!mongoose.isValidObjectId(row.drugId)) {
        return {
          error: `Item ${index + 1} has an invalid drug ID`,
          items: null,
          subtotal: 0,
        };
      }

      drugId = row.drugId;
    }

    let visitId;
    if (row.visitId) {
      if (!mongoose.isValidObjectId(row.visitId)) {
        return {
          error: `Item ${index + 1} has an invalid visit ID`,
          items: null,
          subtotal: 0,
        };
      }

      visitId = row.visitId;
    }

    let prescriptionIndex;
    if (
      row.prescriptionIndex !== undefined &&
      row.prescriptionIndex !== null &&
      row.prescriptionIndex !== ""
    ) {
      const parsedIndex = Number(row.prescriptionIndex);

      if (!Number.isFinite(parsedIndex) || parsedIndex < 0) {
        return {
          error: `Item ${index + 1} has an invalid prescription index`,
          items: null,
          subtotal: 0,
        };
      }

      prescriptionIndex = parsedIndex;
    }

    const notes = row.notes ? String(row.notes).trim() : undefined;

    items.push({
      description,
      category,
      quantity: quantityResult.value,
      unitPrice: unitPriceResult.value,
      amount,
      drugId,
      visitId,
      prescriptionIndex,
      notes,
    });

    subtotal += amount;
  }

  return {
    error: null,
    items,
    subtotal: roundMoney(subtotal),
  };
}

function buildPaymentObject({
  amount,
  method,
  reference,
  note,
  req,
}) {
  const amountResult = parseAmount(amount, "Payment amount", {
    required: true,
    min: 0,
    allowZero: false,
  });

  if (amountResult.error) {
    return {
      error: amountResult.error,
      payment: null,
    };
  }

  const cleanMethod = String(method || "").trim();

  if (!PAYMENT_METHODS.includes(cleanMethod)) {
    return {
      error: "Valid payment method is required",
      payment: null,
    };
  }

  const userId = getUserId(req);

  if (!userId) {
    return {
      error: "Unauthorized",
      payment: null,
    };
  }

  return {
    error: null,
    payment: {
      amount: amountResult.value,
      method: cleanMethod,
      reference: reference ? String(reference).trim() : undefined,
      note: note ? String(note).trim() : undefined,
      collectedBy: userId,
      collectedByName: getUserName(req),
      paidAt: new Date(),
    },
  };
}

// POST /api/bills
exports.createBill = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const {
      facilityType,
      visit,
      patient,
      customerName,
      customerPhone,
      items,
      discount,
      notes,
      initialPayment,
    } = req.body;

    if (
      facilityType &&
      !BILL_FACILITY_TYPES.includes(String(facilityType))
    ) {
      return res.status(400).json({
        error: "Invalid facility type",
      });
    }

    const itemResult = buildItems(items);

    if (itemResult.error) {
      return res.status(400).json({
        error: itemResult.error,
      });
    }

    const discountResult = parseAmount(discount, "Discount", {
      required: false,
      min: 0,
      allowZero: true,
    });

    if (discountResult.error) {
      return res.status(400).json({
        error: discountResult.error,
      });
    }

    const subtotal = itemResult.subtotal;
    const discountValue = discountResult.value || 0;

    if (discountValue > subtotal) {
      return res.status(400).json({
        error: "Discount cannot be greater than subtotal",
      });
    }

    const chargedAmount = roundMoney(subtotal - discountValue);

    let patientId = null;

    if (patient) {
      if (!mongoose.isValidObjectId(patient)) {
        return res.status(400).json({
          error: "Invalid patient ID",
        });
      }

      const patientDoc = await Patient.findById(patient).select("_id name phone");

      if (!patientDoc) {
        return res.status(404).json({
          error: "Patient not found",
        });
      }

      patientId = patientDoc._id;
    }

    let visitId = null;

    if (visit) {
      if (!mongoose.isValidObjectId(visit)) {
        return res.status(400).json({
          error: "Invalid visit ID",
        });
      }

      const visitDoc = await Visit.findById(visit).select("_id patient");

      if (!visitDoc) {
        return res.status(404).json({
          error: "Visit not found",
        });
      }

      visitId = visitDoc._id;

      if (!patientId && visitDoc.patient) {
        patientId = visitDoc.patient;
      }

      if (
        patientId &&
        visitDoc.patient &&
        String(patientId) !== String(visitDoc.patient)
      ) {
        return res.status(400).json({
          error: "Patient does not match the selected visit",
        });
      }
    }

    const cleanCustomerName = String(customerName || "").trim();
    const cleanCustomerPhone = String(customerPhone || "").trim();

    const finalCustomerName =
      cleanCustomerName || (patientId ? undefined : "Walk-in Customer");

    const payments = [];

    if (
      initialPayment &&
      initialPayment.amount !== undefined &&
      initialPayment.amount !== null &&
      initialPayment.amount !== ""
    ) {
      const paymentResult = buildPaymentObject({
        amount: initialPayment.amount,
        method: initialPayment.method,
        reference: initialPayment.reference,
        note: initialPayment.note,
        req,
      });

      if (paymentResult.error) {
        return res.status(400).json({
          error: paymentResult.error,
        });
      }

      if (paymentResult.payment.amount > chargedAmount) {
        return res.status(400).json({
          error: "Initial payment cannot be greater than charged amount",
        });
      }

      payments.push(paymentResult.payment);
    }

    const bill = await Bill.create({
      billNumber: generateBillNumber(),
      facilityType: facilityType || "clinic",
      visit: visitId,
      patient: patientId,
      customerName: finalCustomerName,
      customerPhone: cleanCustomerPhone || undefined,
      items: itemResult.items,
      subtotal,
      discount: discountValue,
      chargedAmount,
      payments,
      notes: notes ? String(notes).trim() : undefined,
      createdBy: userId,
    });

    bill.recalculateTotals();
    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate("patient", "name phone gender age address tribe nextOfKinName nextOfKinPhone")
      .populate("visit", "visitNumber status currentDepartment")
      .populate("createdBy", "name email role");

    return res.status(201).json({
      message: "Bill created successfully.",
      bill: populated,
    });
  } catch (err) {
    console.log("CREATE BILL ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to create bill",
    });
  }
};

// GET /api/bills
exports.getBills = async (req, res) => {
  try {
    const {
      range,
      status,
      facilityType,
      patient,
      q,
      limit,
    } = req.query;

    const filter = {
      ...createdAtFilter(range === "all" ? "all" : range || "today"),
    };

    if (status && BILL_STATUSES.includes(String(status))) {
      filter.status = String(status);
    }

    if (
      facilityType &&
      BILL_FACILITY_TYPES.includes(String(facilityType))
    ) {
      filter.facilityType = String(facilityType);
    }

    if (patient) {
      if (!mongoose.isValidObjectId(patient)) {
        return res.status(400).json({
          error: "Invalid patient ID",
        });
      }

      filter.patient = patient;
    }

    if (q && String(q).trim()) {
      const regex = new RegExp(escapeRegex(String(q).trim()), "i");

      filter.$or = [
        { billNumber: regex },
        { customerName: regex },
        { customerPhone: regex },
      ];
    }

    const requestedLimit = Number(limit);

    const safeLimit = Math.min(
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? requestedLimit
        : 100,
      500
    );

    const [total, bills] = await Promise.all([
      Bill.countDocuments(filter),
      Bill.find(filter)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .populate("patient", "name phone gender age")
        .populate("visit", "visitNumber status currentDepartment")
        .populate("createdBy", "name email role"),
    ]);

    return res.json({
      total,
      bills,
    });
  } catch (err) {
    console.log("GET BILLS ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load bills",
    });
  }
};

// GET /api/bills/summary
exports.getBillSummary = async (req, res) => {
  try {
    const { range } = req.query;

    const normalizedRange = range === "all" ? "all" : range || "today";

    const billMatch = {
      ...createdAtFilter(normalizedRange),
      status: {
        $nin: ["void", "refunded"],
      },
    };

    const [
      billsAgg,
      paymentTotalAgg,
      paymentMethodAgg,
      paymentCollectorAgg,
      outstandingAgg,
    ] = await Promise.all([
      Bill.aggregate([
        { $match: billMatch },
        {
          $group: {
            _id: null,
            totalCharged: { $sum: "$chargedAmount" },
            totalPaid: { $sum: "$paidAmount" },
            totalBalance: { $sum: "$balance" },
            bills: { $sum: 1 },
          },
        },
      ]),

      Bill.aggregate([
        ...buildPaymentPipeline(normalizedRange),
        {
          $group: {
            _id: null,
            totalCollected: { $sum: "$payments.amount" },
            transactions: { $sum: 1 },
          },
        },
      ]),

      Bill.aggregate([
        ...buildPaymentPipeline(normalizedRange),
        {
          $group: {
            _id: "$payments.method",
            amount: { $sum: "$payments.amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      Bill.aggregate([
        ...buildPaymentPipeline(normalizedRange),
        {
          $group: {
            _id: "$payments.collectedBy",
            collectedByName: { $first: "$payments.collectedByName" },
            amount: { $sum: "$payments.amount" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { amount: -1 },
        },
        {
          $limit: 50,
        },
      ]),

      Bill.aggregate([
        {
          $match: {
            status: {
              $in: ["open", "partial"],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalOutstanding: { $sum: "$balance" },
            bills: { $sum: 1 },
          },
        },
      ]),
    ]);

    const billing = billsAgg[0] || {};
    const collections = paymentTotalAgg[0] || {};
    const outstanding = outstandingAgg[0] || {};

    const byMethod = {
      cash: 0,
      mobile_money: 0,
      bank_transfer: 0,
      insurance: 0,
      other: 0,
    };

    for (const item of paymentMethodAgg) {
      const method = String(item._id || "other");

      if (byMethod[method] === undefined) {
        byMethod.other += Number(item.amount || 0);
      } else {
        byMethod[method] += Number(item.amount || 0);
      }
    }

    const byCollector = paymentCollectorAgg.map((item) => ({
      collectorId: item._id,
      collectorName: item.collectedByName || "Staff",
      amount: Number(item.amount || 0),
      transactions: Number(item.count || 0),
    }));

    return res.json({
      range: normalizedRange,
      generatedAt: new Date().toISOString(),

      billing: {
        totalCharged: Number(billing.totalCharged || 0),
        totalPaid: Number(billing.totalPaid || 0),
        totalBalance: Number(billing.totalBalance || 0),
        bills: Number(billing.bills || 0),
      },

      collections: {
        totalCollected: Number(collections.totalCollected || 0),
        transactions: Number(collections.transactions || 0),
        byMethod,
        byCollector,
      },

      outstanding: {
        totalOutstanding: Number(outstanding.totalOutstanding || 0),
        bills: Number(outstanding.bills || 0),
      },
    });
  } catch (err) {
    console.log("BILL SUMMARY ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load bill summary",
    });
  }
};

// GET /api/bills/patient/:patientId
exports.getPatientLedger = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({
        error: "Invalid patient ID",
      });
    }

    const patient = await Patient.findById(patientId).select(
      "_id name phone gender age address tribe nextOfKinName nextOfKinPhone"
    );

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found",
      });
    }

    const filter = {
      patient: patient._id,
      status: {
        $ne: "void",
      },
    };

    const [summaryAgg, bills] = await Promise.all([
      Bill.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalCharged: { $sum: "$chargedAmount" },
            totalPaid: { $sum: "$paidAmount" },
            totalBalance: { $sum: "$balance" },
            bills: { $sum: 1 },
          },
        },
      ]),

      Bill.find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .populate("visit", "visitNumber status currentDepartment")
        .populate("createdBy", "name role"),
    ]);

    const summary = summaryAgg[0] || {};

    return res.json({
      patient,
      summary: {
        totalCharged: Number(summary.totalCharged || 0),
        totalPaid: Number(summary.totalPaid || 0),
        totalBalance: Number(summary.totalBalance || 0),
        bills: Number(summary.bills || 0),
      },
      bills,
    });
  } catch (err) {
    console.log("PATIENT LEDGER ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load patient ledger",
    });
  }
};

// GET /api/bills/:id
exports.getBill = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid bill ID",
      });
    }

    const bill = await Bill.findById(id)
      .populate("patient", "name phone gender age address tribe nextOfKinName nextOfKinPhone")
      .populate("visit", "visitNumber status currentDepartment")
      .populate("createdBy", "name email role");

    if (!bill) {
      return res.status(404).json({
        error: "Bill not found",
      });
    }

    return res.json({
      bill,
    });
  } catch (err) {
    console.log("GET BILL ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to load bill",
    });
  }
};

// POST /api/bills/:id/payments
exports.addBillPayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid bill ID",
      });
    }

    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({
        error: "Bill not found",
      });
    }

    if (bill.status === "void" || bill.status === "refunded") {
      return res.status(400).json({
        error: "Cannot add payment to a void or refunded bill",
      });
    }

    if (bill.balance <= 0) {
      return res.status(400).json({
        error: "This bill has no outstanding balance",
      });
    }

    const {
      amount,
      method,
      reference,
      note,
    } = req.body;

    const paymentResult = buildPaymentObject({
      amount,
      method,
      reference,
      note,
      req,
    });

    if (paymentResult.error) {
      return res.status(400).json({
        error: paymentResult.error,
      });
    }

    if (paymentResult.payment.amount > bill.balance) {
      return res.status(400).json({
        error: "Payment amount cannot be greater than outstanding balance",
      });
    }

    bill.payments.push(paymentResult.payment);
    bill.recalculateTotals();
    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate("patient", "name phone gender age address tribe nextOfKinName nextOfKinPhone")
      .populate("visit", "visitNumber status currentDepartment")
      .populate("createdBy", "name email role");

    return res.json({
      message: "Payment recorded successfully.",
      bill: populated,
    });
  } catch (err) {
    console.log("ADD BILL PAYMENT ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to record payment",
    });
  }
};

// POST /api/bills/:id/void
exports.voidBill = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid bill ID",
      });
    }

    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({
        error: "Bill not found",
      });
    }

    if (bill.status === "void") {
      return res.status(400).json({
        error: "Bill is already void",
      });
    }

    if (bill.status === "refunded") {
      return res.status(400).json({
        error: "Cannot void a refunded bill",
      });
    }

    if (bill.paidAmount > 0) {
      return res.status(400).json({
        error:
          "Cannot void a bill with recorded payments. Use refund workflow instead.",
      });
    }

    const reason = String(req.body.reason || "").trim();

    if (!reason) {
      return res.status(400).json({
        error: "Void reason is required",
      });
    }

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    bill.status = "void";
    bill.voidReason = reason;
    bill.voidedBy = userId;
    bill.voidedAt = new Date();

    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate("patient", "name phone")
      .populate("visit", "visitNumber status currentDepartment")
      .populate("createdBy", "name email role");

    return res.json({
      message: "Bill voided successfully.",
      bill: populated,
    });
  } catch (err) {
    console.log("VOID BILL ERROR:", err);

    return res.status(500).json({
      error: err.message || "Failed to void bill",
    });
  }
};