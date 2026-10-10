const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const drugController = require("../controllers/drugController");

const DRUG_READ_ROLES = ["admin", "pharmacist", "doctor"];
const DRUG_WRITE_ROLES = ["admin"];

router.use(authenticate);

router.get("/", authorize(...DRUG_READ_ROLES), drugController.getDrugs);

router.get("/:id", authorize(...DRUG_READ_ROLES), drugController.getDrug);

router.post("/", authorize(...DRUG_WRITE_ROLES), drugController.createDrug);

router.put("/:id", authorize(...DRUG_WRITE_ROLES), drugController.updateDrug);

router.delete("/:id", authorize(...DRUG_WRITE_ROLES), drugController.deleteDrug);

module.exports = router;