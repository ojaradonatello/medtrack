const Drug = require("../models/Drug");

function getFacilityFilter(req) {
  const facilityId = req.facilityId || req.user?.facilityId || null;

  if (facilityId) {
    return { facility: facilityId };
  }

  return { facility: null };
}

// ➕ Create Drug
exports.createDrug = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req);

    const drugData = {
      ...req.body,
      facility: facilityFilter.facility,
    };

    const drug = await Drug.create(drugData);
    res.json(drug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📄 Get All Drugs
exports.getDrugs = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req);

    const drugs = await Drug.find(facilityFilter);
    res.json(drugs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 Get Single Drug
exports.getDrug = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req);

    const drug = await Drug.findOne({
      _id: req.params.id,
      ...facilityFilter,
    });

    if (!drug) {
      return res.status(404).json({ error: "Drug not found" });
    }

    res.json(drug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update Drug
exports.updateDrug = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req);

    const drug = await Drug.findOneAndUpdate(
      {
        _id: req.params.id,
        ...facilityFilter,
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!drug) {
      return res.status(404).json({ error: "Drug not found" });
    }

    res.json(drug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ Delete Drug
exports.deleteDrug = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req);

    const drug = await Drug.findOneAndDelete({
      _id: req.params.id,
      ...facilityFilter,
    });

    if (!drug) {
      return res.status(404).json({ error: "Drug not found" });
    }

    res.json({ message: "Drug deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};