require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../backend/src/models/User");

const ADMIN_EMAIL = "admin.stphilips@example.com";
const ADMIN_PASSWORD = "Admin123";

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for admin user seed");

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await User.updateOne(
      { email: ADMIN_EMAIL },
      {
        $set: {
          name: "St Philips Admin",
          email: ADMIN_EMAIL,
          password: hashedPassword,
          role: "admin",
        },
      },
      { upsert: true }
    );

    console.log(`Admin user ready: ${ADMIN_EMAIL}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding admin user:", err.message);
    process.exit(1);
  }
}

main();