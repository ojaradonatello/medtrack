const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getAnomalies,
} = require("../controllers/anomalyController");

router.use(authenticate);
router.use(authorize("admin"));

router.get("/", getAnomalies);

module.exports = router;