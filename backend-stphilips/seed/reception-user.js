require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../src/models/User");

const RECEPTION_EMAIL = "reception.stphilips@example.com";
const RECEPTION_PASSWORD = "Reception123";

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for reception user seed");

    const existing = await User.findOne({ email: RECEPTION_EMAIL });

    if (existing) {
      console.log("Reception user already exists:");
      console.log({
        _id: existing._id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
      });

      await mongoose.disconnect();
      return;
    }

    const hashedPassword = await bcrypt.hash(RECEPTION_PASSWORD, 10);

    const user = await User.create({
      name: "St Philips Reception",
      email: RECEPTION_EMAIL,
      password: hashedPassword,
      role: "reception",
    });

    console.log("Reception user created:");
    console.log({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding reception user:", err.message);
    process.exit(1);
  }
}

main();