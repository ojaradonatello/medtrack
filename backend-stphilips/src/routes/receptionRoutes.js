const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  registerPatientAndVisit,
  getQueue,
  findPatientByPhone,
  createVisitForExistingPatient,
  getDashboard,
} = require("../controllers/receptionController");

// Require login
router.use(authenticate);

// Only admin and reception can use these endpoints
router.use(authorize("admin", "reception"));

router.post("/register-patient-visit", registerPatientAndVisit);

router.get("/queue", getQueue);

router.get("/find-patient", findPatientByPhone);

router.get("/dashboard", getDashboard);

router.post("/create-visit-for-existing-patient", createVisitForExistingPatient);

module.exports = router;