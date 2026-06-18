const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    type: String, // expiry, low-stock, anomaly
    message: String,
    isResolved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);