const express = require("express");

const router = express.Router();

const {
  getAnomalies,
} = require("../controllers/anomalyController");

router.get("/", getAnomalies);

module.exports = router;