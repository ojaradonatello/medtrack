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

const DISCHARGE_STATUSES = [
  "improved",
  "stable",
  "referred",
  "admitted",
  "discharged",
  "other",
];

const visitSummarySchema = new Schema(
  {
    diagnosis: {
      type: String,
      trim: true,
    },

    treatmentGiven: {
      type: String,
      trim: true,
    },

    advice: {
      type: String,
      trim: true,
    },

    dischargeStatus: {
      type: String,
      enum: DISCHARGE_STATUSES,
      trim: true,
    },

    summaryNote: {
      type: String,
      trim: true,
    },

    followUpDate: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

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

    visitSummary: {
      type: visitSummarySchema,
      default: undefined,
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