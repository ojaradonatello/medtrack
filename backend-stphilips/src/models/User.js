const mongoose = require("mongoose");

const USER_ROLES = [
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
        message: "Role must be admin, reception, doctor, lab, billing, pharmacist, or staff",
      },
      default: "staff",
    },
  },
  { timestamps: true }
);

// Hide password from JSON responses
userSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);