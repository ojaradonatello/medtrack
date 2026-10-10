const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const dispenseController = require("../controllers/dispenseController");

const DISPENSE_ROLES = ["admin", "pharmacist"];

router.use(authenticate);

router.get("/queue", authorize(...DISPENSE_ROLES), dispenseController.getDispenseQueue);

router.post("/", authorize(...DISPENSE_ROLES), dispenseController.dispenseDrug);

module.exports = router;