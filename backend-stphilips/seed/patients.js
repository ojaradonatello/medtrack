const mongoose = require("mongoose");

const connectDB = require("../src/config/db");

const Patient = require("../src/models/Patient");

mongoose.connect("mongodb://127.0.0.1:27017/medtrack");

const seedPatients = async () => {

  try {

    // 🧹 optional: clear old patients
    await Patient.deleteMany();

    // 👨‍⚕️ patients list
    const patients = [
      {
        name: "Ojok Paul",
        age: 30,
        gender: "Male",
        phone: "0700000000",
        address: "Gulu",
      },

      {
        name: "Akello Sarah",
        age: 24,
        gender: "Female",
        phone: "0700000001",
        address: "Kampala",
      },

      {
        name: "Okot Brian",
        age: 41,
        gender: "Male",
        phone: "0700000002",
        address: "Lira",
      },

      {
        name: "Lamaro Grace",
        age: 35,
        gender: "Female",
        phone: "0700000003",
        address: "Arua",
      },

      {
        name: "Odong Michael",
        age: 29,
        gender: "Male",
        phone: "0700000004",
        address: "Gulu",
      },

      {
        name: "Aber Judith",
        age: 33,
        gender: "Female",
        phone: "0700000005",
        address: "Kitgum",
      },

      {
        name: "Ocitti David",
        age: 50,
        gender: "Male",
        phone: "0700000006",
        address: "Soroti",
      },
    ];

    // 💾 insert into database
    await Patient.insertMany(patients);

    console.log("✅ Patients inserted successfully");

    process.exit();

  } catch (err) {

    console.log(err);

    process.exit(1);

  }
};

seedPatients();