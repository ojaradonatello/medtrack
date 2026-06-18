const Inventory = require("../models/Inventory");
const Dispense = require("../models/Dispense");
const anomalyService = require("../services/anomalyService");

exports.dispenseDrug = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const { patient, drug, quantity } = req.body;

    // 🔍 Check input
    if (!patient || !drug || !quantity) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 🔍 Find inventory
    const inventory = await Inventory.findOne({ drug });

    console.log("INVENTORY:", inventory);

    if (!inventory) {
      return res.status(404).json({ message: "Drug not found in inventory" });
    }

    if (inventory.quantity < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    // 📉 Deduct stock
    inventory.quantity -= quantity;
    await inventory.save();

    // 💾 Save record
    const record = await Dispense.create({
      patient,
      drug,
      quantity,
      dispensedBy: req.user.id
    });

    // 🧠 Detect anomalies
    const alerts = await anomalyService.detectAnomaly({
  inventory,
  quantity,
  userId: req.user.id,
  drugId: drug
});
    res.json({
      message: "Dispensed successfully",
      record,
      alerts
    });

  } catch (err) {
    console.error("DISPENSE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};