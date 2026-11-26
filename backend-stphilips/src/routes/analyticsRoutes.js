const express = require("express");
const router = express.Router();

const analyticsController = require("../controllers/analyticsController");
const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { attachFacility } = require("../middleware/facilityMiddleware");

// 📊 Dashboard
router.get(
  "/dashboard",
  authenticate,
  attachFacility,
  authorize("admin", "pharmacist"),
  analyticsController.getDashboardStats
);

module.exports = router;