const Drug = require("../models/Drug");

// ➕ Create Drug
exports.createDrug = async (req, res) => {
  try {
    const drug = await Drug.create(req.body);
    res.json(drug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📄 Get All Drugs
exports.getDrugs = async (req, res) => {
  try {
    const drugs = await Drug.find();
    res.json(drugs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 Get Single Drug
exports.getDrug = async (req, res) => {
  try {
    const drug = await Drug.findById(req.params.id);
    res.json(drug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update Drug
exports.updateDrug = async (req, res) => {
  try {
    const drug = await Drug.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(drug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ Delete Drug
exports.deleteDrug = async (req, res) => {
  try {
    await Drug.findByIdAndDelete(req.params.id);
    res.json({ message: "Drug deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};