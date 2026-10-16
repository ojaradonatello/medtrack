const mongoose = require("mongoose");

const dispenseSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },

    drug: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drug",
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, "Dispensed quantity must be at least 1"],
    },

    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
    },

    prescriptionIndex: {
      type: Number,
    },

    drugName: {
      type: String,
      trim: true,
    },

    strength: {
      type: String,
      trim: true,
    },

    dosage: {
      type: String,
      trim: true,
    },

    frequency: {
      type: String,
      trim: true,
    },

    duration: {
      type: String,
      trim: true,
    },

    instructions: {
      type: String,
      trim: true,
    },

    dispensedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dispense", dispenseSchema);