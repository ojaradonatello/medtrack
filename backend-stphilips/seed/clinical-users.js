require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../src/models/User");

const TEST_USERS = [
  {
    name: "St Philips Doctor",
    email: "doctor.stphilips@example.com",
    password: "Doctor123",
    role: "doctor",
  },
  {
    name: "St Philips Lab",
    email: "lab.stphilips@example.com",
    password: "Lab123",
    role: "lab",
  },
  {
    name: "St Philips Billing",
    email: "billing.stphilips@example.com",
    password: "Billing123",
    role: "billing",
  },
  {
    name: "St Philips Pharmacist",
    email: "pharmacist.stphilips@example.com",
    password: "Pharmacist123",
    role: "pharmacist",
  },
];

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for clinical user seed");

    for (const u of TEST_USERS) {
      const hashedPassword = await bcrypt.hash(u.password, 10);

      await User.updateOne(
        { email: u.email },
        {
          $set: {
            name: u.name,
            email: u.email,
            password: hashedPassword,
            role: u.role,
          },
        },
        { upsert: true }
      );

      console.log(`${u.role} user ready: ${u.email}`);
    }

    await mongoose.disconnect();
    console.log("Clinical users seed completed");
  } catch (err) {
    console.error("Error seeding clinical users:", err.message);
    process.exit(1);
  }
}

main();