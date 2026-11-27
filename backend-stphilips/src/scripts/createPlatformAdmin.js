require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

async function run() {
  const email = String(process.argv[2] || "").toLowerCase().trim();
  const password = String(process.argv[3] || "");
  const name = process.argv[4] || "Platform Administrator";

  if (!email || !password) {
    console.log(
      "Usage: node src/scripts/createPlatformAdmin.js <email> <password> [name]"
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.log(
      "Password must be at least 10 characters for platform admin."
    );
    process.exit(1);
  }

  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    "mongodb://127.0.0.1:27017/medtrack";

  await mongoose.connect(uri);
  console.log("MongoDB Connected");

  const existing = await User.findOne({ email });

  if (existing) {
    existing.role = "platform_admin";
    existing.facility = undefined;
    existing.isActive = true;
    existing.password = await bcrypt.hash(password, 10);
    await existing.save();

    console.log("Existing user promoted to platform_admin:", email);
  } else {
    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashed,
      role: "platform_admin",
      isActive: true,
    });

    console.log("Platform admin created:", email);
  }

  await mongoose.disconnect();
  console.log("Done.");
  process.exit(0);
}

run().catch((err) => {
  console.log("ERROR:", err.message);
  process.exit(1);
});