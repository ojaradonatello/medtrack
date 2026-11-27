const mongoose = require("mongoose");

const USER_ROLES = [
  "platform_admin",
  "admin",
  "reception",
  "doctor",
  "lab",
  "billing",
  "pharmacist",
  "staff",
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message:
          "Role must be platform_admin, admin, reception, doctor, lab, billing, pharmacist, or staff",
      },
      default: "staff",
    },

    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
      required: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ facility: 1, role: 1 });
userSchema.index({ facility: 1, isActive: 1 });

// Hide password from JSON responses
userSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);