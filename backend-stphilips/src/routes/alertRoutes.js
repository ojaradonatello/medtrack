const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const alertController = require("../controllers/alertController");

router.use(authenticate);
router.use(authorize("admin"));

router.get("/", alertController.getAlerts);
router.put("/:id/resolve", alertController.resolveAlert);

module.exports = router;