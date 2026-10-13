const mongoose = require("mongoose");

const PAYMENT_METHODS = [
  "cash",
  "mobile_money",
  "bank_transfer",
  "insurance",
  "other",
];

const PAYMENT_STATUSES = ["paid", "partial", "unpaid"];

const paymentSchema = new mongoose.Schema(
  {
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      required: true,
      index: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    chargedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    amountPaid: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    method: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "other",
    },

    reference: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "unpaid",
      index: true,
    },

    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    paidAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    note: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ paidAt: -1 });
paymentSchema.index({ status: 1, paidAt: -1 });
paymentSchema.index({ patient: 1, paidAt: -1 });
paymentSchema.index({ visit: 1, paidAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);