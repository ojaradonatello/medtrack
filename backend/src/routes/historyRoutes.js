const express = require("express");

const router = express.Router();

const {
  getHistory,
  getStaffAnalytics,
} = require("../controllers/historyController");

router.get("/", getHistory);

router.get("/staff-analytics", getStaffAnalytics);

module.exports = router;