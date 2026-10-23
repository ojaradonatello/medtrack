const mongoose = require("mongoose");

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

const billItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: BILL_ITEM_CATEGORIES,
      default: "other",
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    drugId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drug",
    },

    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
    },

    prescriptionIndex: {
      type: Number,
      min: 0,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const billPaymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    method: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },

    reference: {
      type: String,
      trim: true,
    },

    note: {
      type: String,
      trim: true,
    },

    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collectedByName: {
      type: String,
      trim: true,
    },

    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    facilityType: {
      type: String,
      enum: BILL_FACILITY_TYPES,
      default: "clinic",
      index: true,
    },

    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      index: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },

    customerName: {
      type: String,
      trim: true,
    },

    customerPhone: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: BILL_STATUSES,
      default: "open",
      index: true,
    },

    items: {
      type: [billItemSchema],
      default: [],
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    chargedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    payments: {
      type: [billPaymentSchema],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
    },

    voidReason: {
      type: String,
      trim: true,
    },

    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    voidedAt: {
      type: Date,
    },

    refundReason: {
      type: String,
      trim: true,
    },

    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    refundedAt: {
      type: Date,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

billSchema.index({ createdAt: -1 });
billSchema.index({ patient: 1, createdAt: -1 });
billSchema.index({ status: 1, createdAt: -1 });
billSchema.index({ facilityType: 1, createdAt: -1 });
billSchema.index({ "payments.paidAt": -1 });

billSchema.methods.recalculateTotals = function recalculateTotals() {
  const subtotal = (this.items || []).reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const discount = Number(this.discount || 0);
  const charged = Math.max(subtotal - discount, 0);

  const paid = (this.payments || []).reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const balance = Math.max(charged - paid, 0);

  this.subtotal = Math.round(subtotal * 100) / 100;
  this.discount = Math.round(discount * 100) / 100;
  this.chargedAmount = Math.round(charged * 100) / 100;
  this.paidAmount = Math.round(paid * 100) / 100;
  this.balance = Math.round(balance * 100) / 100;

  if (this.status !== "void" && this.status !== "refunded") {
    if (this.chargedAmount <= 0) {
      this.status = "paid";
    } else if (this.paidAmount <= 0) {
      this.status = "open";
    } else if (this.paidAmount >= this.chargedAmount) {
      this.status = "paid";
    } else {
      this.status = "partial";
    }
  }
};

module.exports = mongoose.model("Bill", billSchema);