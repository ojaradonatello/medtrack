const mongoose = require("mongoose");

const FACILITY_TYPES = [
  "hospital",
  "clinic",
  "pharmacy",
  "drug_shop",
  "diagnostic_centre",
  "maternity_home",
];

const MODULE_KEYS = [
  "consultation",
  "laboratory",
  "procedure",
  "interpretation",
  "prescription",
  "billing",
  "billing_counter",
  "patient_ledger",
  "daily_cashier",
  "pharmacy",
  "drugshop",
  "medical_form",
  "attendance",
  "admin_overview",
];

const facilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

        slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    type: {
      type: String,
      enum: FACILITY_TYPES,
      required: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      trim: true,
    },

    town: {
      type: String,
      trim: true,
    },

    district: {
      type: String,
      trim: true,
    },

    region: {
      type: String,
      trim: true,
      default: "Northern",
    },

    country: {
      type: String,
      trim: true,
      default: "Uganda",
    },

    currency: {
      type: String,
      trim: true,
      default: "UGX",
    },

    timezone: {
      type: String,
      trim: true,
      default: "Africa/Kampala",
    },

    logoUrl: {
      type: String,
      trim: true,
    },

    receiptHeader: {
      type: String,
      trim: true,
    },

    receiptFooter: {
      type: String,
      trim: true,
      default: "Thank you. Keep this receipt for your records.",
    },

    medicalFormHeader: {
      type: String,
      trim: true,
      default: "ST. PHILIPS HOSPITAL",
    },

    modules: {
      type: Map,
      of: Boolean,
      default: () => {
        const defaults = {};

        for (const key of MODULE_KEYS) {
          defaults[key] = false;
        }

        return defaults;
      },
    },

    settings: {
      allowPartialPayments: {
        type: Boolean,
        default: true,
      },

      requirePrescriptionForDispensary: {
        type: Boolean,
        default: true,
      },

      allowWalkInCustomers: {
        type: Boolean,
        default: true,
      },

      requireVoidReason: {
        type: Boolean,
        default: true,
      },

      autoNumberBills: {
        type: Boolean,
        default: true,
      },

      billPrefix: {
        type: String,
        trim: true,
        default: "B",
      },

      receiptPrefix: {
        type: String,
        trim: true,
        default: "R",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    pilotMode: {
      type: Boolean,
      default: true,
    },

    pilotStartedAt: {
      type: Date,
    },

    pilotEndsAt: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

facilitySchema.index({ type: 1, isActive: 1 });


facilitySchema.methods.hasModule = function hasModule(key) {
  if (!this.isActive) {
    return false;
  }

  const modules = this.modules;

  if (!modules) {
    return false;
  }

  return modules.get(key) === true;
};

facilitySchema.methods.getEnabledModules = function getEnabledModules() {
  const result = {};

  for (const key of MODULE_KEYS) {
    result[key] = this.hasModule(key);
  }

  return result;
};

facilitySchema.statics.MODULE_KEYS = MODULE_KEYS;
facilitySchema.statics.FACILITY_TYPES = FACILITY_TYPES;

module.exports = mongoose.model("Facility", facilitySchema);