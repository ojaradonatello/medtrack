const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "late"],
      default: "present",
    },

    date: {
      type: Date,
      default: Date.now,
      index: true,
    },

    checkInAt: {
      type: Date,
      default: null,
    },

    checkOutAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ staff: 1, date: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);