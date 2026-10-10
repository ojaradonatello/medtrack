const mongoose = require("mongoose");

const { Schema } = mongoose;

const VISIT_STATUSES = [
  "registered",
  "waiting_consultation",
  "in_consultation",
  "waiting_lab",
  "lab_in_progress",
  "waiting_interpretation",
  "waiting_billing",
  "waiting_dispensary",
  "completed",
  "cancelled",
  "no_show",
];

const DEPARTMENTS = [
  "reception",
  "consultation",
  "laboratory",
  "interpretation",
  "billing",
  "dispensary",
  "closed",
];

const visitSchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    visitNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    status: {
      type: String,
      enum: VISIT_STATUSES,
      default: "waiting_consultation",
      index: true,
    },

    currentDepartment: {
      type: String,
      enum: DEPARTMENTS,
      default: "consultation",
      index: true,
    },

    vitals: {
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      weightKg: Number,
      temperatureC: Number,
      pulseBpm: Number,
    },

    notes: {
      type: String,
      trim: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

visitSchema.index({ patient: 1, createdAt: -1 });
visitSchema.index({ status: 1, currentDepartment: 1 });

module.exports = mongoose.model("Visit", visitSchema);