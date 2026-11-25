const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
      required: false,
    },

    drug: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drug",
    },

    quantity: Number,

    expiryDate: Date,

    batchNumber: String,

    minStockLevel: {
      type: Number,
      default: 50,
    },
  },
  { timestamps: true }
);

inventorySchema.index({ facility: 1, drug: 1 });
inventorySchema.index({ facility: 1, expiryDate: 1 });
inventorySchema.index({ facility: 1, batchNumber: 1 });

module.exports = mongoose.model("Inventory", inventorySchema);