const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
      facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
      required: false,
    },
    type: String, // expiry, low-stock, anomaly
    message: String,
    isResolved: { type: Boolean, default: false }
  },
  { timestamps: true }
);
alertSchema.index({ facility: 1, createdAt: -1 });
alertSchema.index({ facility: 1, status: 1 });
module.exports = mongoose.model("Alert", alertSchema);