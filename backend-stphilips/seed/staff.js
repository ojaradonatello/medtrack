const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../src/models/User");

mongoose.connect("mongodb://127.0.0.1:27017/medtrack");

const staff = [
  {
    name: "Donato",
    email: "donato@gmail.com",
    password: "123456",
    role: "Admin",
  },

  {
    name: "Sarah",
    email: "sarah@gmail.com",
    password: "123456",
    role: "Pharmacist",
  },

  {
    name: "Brian",
    email: "brian@gmail.com",
    password: "123456",
    role: "Nurse",
  },
];

async function seedStaff() {
  try {
    await User.deleteMany();

    for (const person of staff) {
      const hashedPassword = await bcrypt.hash(person.password, 10);

      await User.create({
        name: person.name,
        email: person.email,
        password: hashedPassword,
        role: person.role,
      });
    }

    console.log("✅ Staff inserted successfully");

    process.exit();

  } catch (err) {

    console.log(err);

    process.exit(1);
  }
}

seedStaff();