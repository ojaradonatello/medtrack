const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createPatient,
  getPatients,
  getPatient,
  getPatientVisits,
  searchPatients,
  updatePatient,
  deletePatient,
} = require("../controllers/patientController");

router.post("/", createPatient);

router.get("/", getPatients);

router.get("/search", searchPatients);

router.get("/:id/visits", getPatientVisits);

router.get("/:id", getPatient);

router.put("/:id", authenticate, authorize("admin", "reception", "doctor"), updatePatient);

router.delete("/:id", deletePatient);

module.exports = router;