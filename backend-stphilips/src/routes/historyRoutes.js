const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getHistory,
  getStaffAnalytics,
} = require("../controllers/historyController");

router.use(authenticate);
router.use(authorize("admin"));

router.get("/", getHistory);
router.get("/staff-analytics", getStaffAnalytics);

module.exports = router;