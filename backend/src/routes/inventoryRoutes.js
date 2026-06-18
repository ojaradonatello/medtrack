const express = require("express");
const router = express.Router();

const inventoryController = require("../controllers/inventoryController");

router.post("/", inventoryController.addStock);
router.get("/", inventoryController.getStock);

module.exports = router; 