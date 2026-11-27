const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Facility",
    required: false,
    index: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["insurance", "program", "membership", "donor"],
    required: true,
  },
  programName: {
    type: String,
    required: true,
  },
  programCategory: {
    type: String,
    enum: ["hiv_aids", "diabetes", "hypertension", "other"],
  },
  enrollmentDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "expired", "cancelled"],
    default: "active",
  },
  monthlyFee: {
    type: Number,
    default: 0,
  },
  initialPayment: {
    amount: Number,
    method: String,
    reference: String,
  },
  benefits: String,
  notes: String,
  diagnosis: String,
  donorName: String,
  donorReference: String,
  enrollmentNumber: {
    type: String,
    unique: true,
    required: true,
  },
  enrolledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  payments: [
    {
      amount: Number,
      date: { type: Date, default: Date.now },
      method: String,
      reference: String,
      note: String,
      collectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  totalPaid: {
    type: Number,
    default: 0,
  },
  renewals: [
    {
      months: Number,
      amount: Number,
      renewedAt: { type: Date, default: Date.now },
      renewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  cancelledAt: Date,
  cancelReason: String,
}, { timestamps: true });

// Simple pre-save hook - NO method calls
enrollmentSchema.pre("save", function() {
  // Calculate total paid
  let total = 0;
  if (this.payments && this.payments.length > 0) {
    for (let i = 0; i < this.payments.length; i++) {
      total += Number(this.payments[i].amount) || 0;
    }
  }
  this.totalPaid = total;
  
  // Auto-expire if needed
  if (this.status === "active" && this.expiryDate < new Date()) {
    this.status = "expired";
  }
});

enrollmentSchema.index({ facility: 1, patient: 1 });
enrollmentSchema.index({ facility: 1, status: 1 });
enrollmentSchema.index({ facility: 1, type: 1 });
enrollmentSchema.index({ expiryDate: 1 });

module.exports = mongoose.model("Enrollment", enrollmentSchema);