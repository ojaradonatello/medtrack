const Inventory = require("../models/Inventory");
const Alert = require("../models/Alert");
const Drug = require("../models/Drug");

function getFacilityFilter(req) {
  const facilityId = req.facilityId || req.user?.facilityId || null;

  if (facilityId) {
    return { facility: facilityId };
  }

  return { facility: null };
}

// ➕ ADD STOCK (SAFE VERSION)
exports.addStock = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req);

    const { drug, quantity, expiryDate, batchNumber, minStockLevel } = req.body;

    if (!drug || !quantity) {
      return res.status(400).json({
        error: "drug and quantity are required",
      });
    }

    const drugDoc = await Drug.findOne({
      _id: drug,
      ...facilityFilter,
    });

    if (!drugDoc) {
      return res.status(404).json({
        error: "Drug not found in this facility",
      });
    }

    const item = await Inventory.create({
      facility: facilityFilter.facility,
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
    const facilityFilter = getFacilityFilter(req);

    const items = await Inventory.find(facilityFilter)
      .populate("drug", "name")
      .lean();

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🚨 LOW STOCK CHECK (OPTIMIZED + NO DUPLICATES)
// Accepts optional facilityId for background/cron use
exports.checkLowStock = async (facilityId = null) => {
  try {
    const filter = facilityId ? { facility: facilityId } : {};

    const items = await Inventory.find(filter)
      .populate("drug", "name")
      .lean();

    for (const item of items) {
      const drugName = item.drug?.name || "Unknown Drug";

      if (Number(item.quantity || 0) < Number(item.minStockLevel || 0)) {
        const exists = await Alert.findOne({
          type: "low-stock",
          "data.inventoryId": item._id,
        });

        if (!exists) {
          await Alert.create({
            facility: item.facility || null,
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