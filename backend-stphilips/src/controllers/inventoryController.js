const Inventory = require("../models/Inventory");
const Alert = require("../models/Alert");

// ➕ ADD STOCK (SAFE VERSION)
exports.addStock = async (req, res) => {
  try {
    const { drug, quantity, expiryDate, batchNumber, minStockLevel } = req.body;

    // 🔴 VALIDATION (IMPORTANT FIX)
    if (!drug || !quantity) {
      return res.status(400).json({
        error: "drug and quantity are required",
      });
    }

    const item = await Inventory.create({
      drug,
      quantity,
      expiryDate,
      batchNumber,
      minStockLevel,
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 📦 GET INVENTORY (CLEAN + SAFE)
exports.getStock = async (req, res) => {
  try {
    const items = await Inventory.find()
      .populate("drug", "name") // only name needed
      .lean(); // 🔥 improves performance + prevents weird mongoose issues

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 🚨 LOW STOCK CHECK (OPTIMIZED + NO DUPLICATES)
exports.checkLowStock = async () => {
  try {
    const items = await Inventory.find()
      .populate("drug", "name")
      .lean();

    for (const item of items) {
      const drugName = item.drug?.name || "Unknown Drug";

      if (item.quantity < item.minStockLevel) {

        // 🔴 BETTER DUPLICATE CHECK (by drug ID, not message)
        const exists = await Alert.findOne({
          type: "low-stock",
          "data.inventoryId": item._id,
        });

        if (!exists) {
          await Alert.create({
            type: "low-stock",
            message: `Low stock for ${drugName}`,
            data: {
              inventoryId: item._id,
              drug: item.drug?._id,
            },
          });
        }
      }
    }

  } catch (err) {
    console.error("LOW STOCK ERROR:", err);
  }
};