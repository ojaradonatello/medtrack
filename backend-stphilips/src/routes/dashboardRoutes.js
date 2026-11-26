const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { attachFacility } = require("../middleware/facilityMiddleware");

router.get(
  "/",
  authenticate,
  attachFacility,
  authorize("admin", "pharmacist"),
  dashboardController.getDashboardStats
);

module.exports = router;