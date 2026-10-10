const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    drug: { type: mongoose.Schema.Types.ObjectId, ref: "Drug" },
    quantity: Number,
    expiryDate: Date,
    batchNumber: String,
    minStockLevel: { type: Number, default: 50 } // 🔥 NEW
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);