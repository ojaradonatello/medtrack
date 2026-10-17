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

const VIEW_ROLES = [
  "admin",
  "reception",
  "doctor",
  "lab",
  "billing",
  "pharmacist",
  "staff",
];

const EDIT_ROLES = [
  "admin",
  "reception",
  "doctor",
  "lab",
  "pharmacist",
];

const DELETE_ROLES = [
  "admin",
  "reception",
];

router.use(authenticate);

router.post("/", authorize("admin", "reception", "doctor"), createPatient);

router.get("/", authorize(...VIEW_ROLES), getPatients);

router.get("/search", authorize(...VIEW_ROLES), searchPatients);

router.get("/:id/visits", authorize(...VIEW_ROLES), getPatientVisits);

router.get("/:id", authorize(...VIEW_ROLES), getPatient);

router.put("/:id", authorize(...EDIT_ROLES), updatePatient);

router.patch("/:id", authorize(...EDIT_ROLES), updatePatient);

router.delete("/:id", authorize(...DELETE_ROLES), deletePatient);

module.exports = router;