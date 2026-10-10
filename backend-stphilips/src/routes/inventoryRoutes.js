const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const inventoryController = require("../controllers/inventoryController");

const INVENTORY_READ_ROLES = ["admin", "pharmacist", "doctor"];
const INVENTORY_WRITE_ROLES = ["admin"];

router.use(authenticate);

router.get("/", authorize(...INVENTORY_READ_ROLES), inventoryController.getStock);

router.post("/", authorize(...INVENTORY_WRITE_ROLES), inventoryController.addStock);

module.exports = router;