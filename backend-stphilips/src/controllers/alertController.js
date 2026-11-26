const Alert = require("../models/Alert");

function getFacilityFilter(req) {
  const facilityId = req.facilityId || req.user?.facilityId || null;

  if (facilityId) {
    return { facility: facilityId };
  }

  return { facility: null };
}

exports.getAlerts = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req);

    const alerts = await Alert.find(facilityFilter).sort({
      createdAt: -1,
    });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const facilityFilter = getFacilityFilter(req);

    const alert = await Alert.findOneAndUpdate(
      {
        _id: req.params.id,
        ...facilityFilter,
      },
      { isResolved: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }

    res.json(alert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};