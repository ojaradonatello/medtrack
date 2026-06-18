const express = require("express");
const router = express.Router();

const dispenseController = require("../controllers/dispenseController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, dispenseController.dispenseDrug);

module.exports = router;