const mongoose = require("mongoose");

const dispenseSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    drug: { type: mongoose.Schema.Types.ObjectId, ref: "Drug" },
    quantity: Number,
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dispense", dispenseSchema);