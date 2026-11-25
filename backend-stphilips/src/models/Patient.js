const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {

      facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
      required: false,
    },
    name: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
    },

    age: {
      type: Number,
      min: [0, "Age cannot be negative"],
      max: [130, "Age seems invalid"],
    },

    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: {
        values: ["Male", "Female", "Other"],
        message: "Gender must be Male, Female, or Other",
      },
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      unique: true,
    },

       address: {
      type: String,
      trim: true,
    },

    tribe: {
      type: String,
      trim: true,
    },

    nextOfKinName: {
      type: String,
      trim: true,
    },

    nextOfKinPhone: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);


patientSchema.index({ facility: 1, phone: 1 });
patientSchema.index({ facility: 1, name: 1 });

module.exports = mongoose.model("Patient", patientSchema);