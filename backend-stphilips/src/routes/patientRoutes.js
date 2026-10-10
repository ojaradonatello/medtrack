const express = require("express");
const router = express.Router();

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

router.put("/:id", updatePatient);

router.delete("/:id", deletePatient);

module.exports = router;