const Alert = require("../models/Alert");

exports.getAlerts = async (req, res) => {
  const alerts = await Alert.find().sort({ createdAt: -1 });
  res.json(alerts);
};

exports.resolveAlert = async (req, res) => {
  const alert = await Alert.findByIdAndUpdate(
    req.params.id,
    { isResolved: true },
    { new: true }
  );

  res.json(alert);
};