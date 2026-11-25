const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
      facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
      required: false,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    actorRole: {
      type: String,
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    entityType: {
      type: String,
      required: true,
    },

    entityId: {
      type: String,
      required: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      default: null,
    },

    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      default: null,
    },

    description: {
      type: String,
      default: "",
    },

    changes: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);
activityLogSchema.index({ facility: 1, createdAt: -1 });
activityLogSchema.index({ facility: 1, user: 1 });
module.exports = mongoose.model("ActivityLog", activityLogSchema);