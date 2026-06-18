const mongoose = require("mongoose");
const Drug = require("../src/models/Drug");


mongoose.connect("mongodb://127.0.0.1:27017/medtrack");

const drugs = [
  { name: "Paracetamol", quantity: 120, expiryDate: "2026-12-31" },
  { name: "Ibuprofen", quantity: 80, expiryDate: "2026-10-15" },
  { name: "Amoxicillin", quantity: 60, expiryDate: "2026-08-20" },
  { name: "Azithromycin", quantity: 40, expiryDate: "2026-09-10" },
  { name: "Metformin", quantity: 100, expiryDate: "2027-01-01" },
  { name: "Insulin", quantity: 30, expiryDate: "2026-07-30" },
  { name: "Coartem", quantity: 75, expiryDate: "2026-11-11" },
  { name: "Ciprofloxacin", quantity: 50, expiryDate: "2026-12-05" },
  { name: "Diclofenac", quantity: 110, expiryDate: "2027-03-12" },
  { name: "Vitamin C", quantity: 200, expiryDate: "2027-06-01" },
  { name: "Zinc", quantity: 150, expiryDate: "2027-05-20" },
  { name: "Omeprazole", quantity: 90, expiryDate: "2026-09-30" },
  { name: "Loratadine", quantity: 70, expiryDate: "2027-02-18" },
  { name: "Salbutamol", quantity: 45, expiryDate: "2026-12-01" },
  { name: "Hydrocortisone", quantity: 65, expiryDate: "2026-10-10" },
  { name: "Losartan", quantity: 85, expiryDate: "2027-01-25" },
  { name: "Amlodipine", quantity: 95, expiryDate: "2027-04-15" },
  { name: "Ranitidine", quantity: 70, expiryDate: "2026-09-01" },
  { name: "Dexamethasone", quantity: 55, expiryDate: "2026-08-08" },
  { name: "ORS Sachets", quantity: 300, expiryDate: "2028-01-01" },
];

const seedData = async () => {
  try {
    await Drug.deleteMany(); // optional: clears old data

    await Drug.insertMany(drugs);

    console.log("✅ Drugs inserted successfully");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedData();