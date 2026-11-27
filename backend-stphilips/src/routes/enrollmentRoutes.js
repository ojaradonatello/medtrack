const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { attachFacility } = require("../middleware/facilityMiddleware");

const c = require("../controllers/enrollmentController");

router.use(authenticate);
router.use(attachFacility);

const VIEW = ["admin", "reception", "doctor", "billing"];
const WRITE = ["admin", "reception", "billing"];
const MONEY = ["admin", "billing", "reception"];

router.get("/summary", authorize(...VIEW), c.getEnrollmentSummary);
router.get("/patient/:patientId", authorize(...VIEW), c.getPatientEnrollments);
router.get("/", authorize(...VIEW), c.getEnrollments);
router.get("/:id", authorize(...VIEW), c.getEnrollment);

router.post("/", authorize(...WRITE), c.createEnrollment);
router.patch("/:id", authorize(...WRITE), c.updateEnrollment);
router.post("/:id/payments", authorize(...MONEY), c.addPayment);
router.post("/:id/renew", authorize(...MONEY), c.renewEnrollment);
router.post("/:id/cancel", authorize(...WRITE), c.cancelEnrollment);
router.delete("/:id", authorize("admin"), c.deleteEnrollment);

module.exports = router;