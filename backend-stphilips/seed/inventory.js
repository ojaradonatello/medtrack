const mongoose = require("mongoose");

const connectDB = require("../src/config/db");

const Inventory = require("../src/models/Inventory");

const Drug = require("../src/models/Drug");

mongoose.connect("mongodb://127.0.0.1:27017/medtrack");

const seedInventory = async () => {

  try {

    // 🧹 clear old inventory
    await Inventory.deleteMany();

    // 📦 get all drugs
    const drugs = await Drug.find();

    // 🔥 create inventory for each drug
    const inventoryData = drugs.map((drug) => ({
      drug: drug._id,
      quantity: 100,
      minStockLevel: 20,
      expiryDate: new Date("2027-12-31"),
    }));

    await Inventory.insertMany(inventoryData);

    console.log("✅ Inventory created");

    process.exit();

  } catch (err) {

    console.log(err);

    process.exit(1);

  }
};

seedInventory();