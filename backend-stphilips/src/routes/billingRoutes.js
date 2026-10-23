const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createBill,
  getBills,
  getBillSummary,
  getPatientLedger,
  getBill,
  addBillPayment,
  voidBill,
} = require("../controllers/billingController");

const BILL_ROLES = [
  "admin",
  "billing",
  "reception",
  "pharmacist",
  "staff",
];

const VOID_ROLES = [
  "admin",
  "billing",
];

router.use(authenticate);

router.get("/summary", authorize(...BILL_ROLES), getBillSummary);

router.get(
  "/patient/:patientId",
  authorize(...BILL_ROLES),
  getPatientLedger
);

router.get("/", authorize(...BILL_ROLES), getBills);

router.post("/", authorize(...BILL_ROLES), createBill);

router.get("/:id", authorize(...BILL_ROLES), getBill);

router.post(
  "/:id/payments",
  authorize(...BILL_ROLES),
  addBillPayment
);

router.post(
  "/:id/void",
  authorize(...VOID_ROLES),
  voidBill
);

module.exports = router;