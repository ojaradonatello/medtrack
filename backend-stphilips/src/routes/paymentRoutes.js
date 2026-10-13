const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createPayment,
  getPayments,
  getSummary,
} = require("../controllers/paymentController");

function allowBillingOrAdmin(req, res, next) {
  const role = req.user?.role;

  if (role === "admin" || role === "billing") {
    return next();
  }

  return res.status(403).json({
    error: "Only billing staff and administrators can access payments.",
  });
}

router.use(authenticate);

router.get("/summary", allowBillingOrAdmin, getSummary);

router.get("/", allowBillingOrAdmin, getPayments);

router.post("/", allowBillingOrAdmin, createPayment);

module.exports = router;