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

const LAB_RESULT_STATUSES = [
  "normal",
  "abnormal",
  "critical",
  "pending",
];

const labResultSchema = new Schema(
  {
    testName: {
      type: String,
      required: true,
      trim: true,
    },

    resultValue: {
      type: String,
      required: true,
      trim: true,
    },

    unit: {
      type: String,
      trim: true,
    },

    referenceRange: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: LAB_RESULT_STATUSES,
      default: "normal",
    },

    notes: {
      type: String,
      trim: true,
    },

    performedAt: {
      type: Date,
      default: Date.now,
    },

    enteredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    _id: false,
  }
);

const prescriptionSchema = new Schema(
  {
    drugName: {
      type: String,
      required: true,
      trim: true,
    },

    strength: {
      type: String,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, "Prescription quantity must be at least 1"],
    },

    dosage: {
      type: String,
      trim: true,
    },

    frequency: {
      type: String,
      trim: true,
    },

    duration: {
      type: String,
      trim: true,
    },

    instructions: {
      type: String,
      trim: true,
    },

    prescribedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    prescribedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

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

    labResults: {
      type: [labResultSchema],
      default: [],
    },

    prescriptions: {
      type: [prescriptionSchema],
      default: [],
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