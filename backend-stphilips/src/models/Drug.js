const mongoose = require("mongoose");


const drugSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
    },

    manufacturer: {
      type: String,
      trim: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0, // ✅ prevents negative stock
    },

    minStockLevel: {
      type: Number,
      default: 50,
      min: 0,
    },

    expiryDate: {
      type: Date,
      required: true, // ✅ important for expiry alerts
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Drug", drugSchema);