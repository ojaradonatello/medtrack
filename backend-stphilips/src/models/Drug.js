const mongoose = require("mongoose");

const drugSchema = new mongoose.Schema(
  {
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
      required: false,
    },

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
      min: 0,
    },

    minStockLevel: {
      type: Number,
      default: 50,
      min: 0,
    },

    expiryDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

drugSchema.index({ facility: 1, name: 1 });
drugSchema.index({ facility: 1, category: 1 });
drugSchema.index({ facility: 1, expiryDate: 1 });

module.exports = mongoose.model("Drug", drugSchema);