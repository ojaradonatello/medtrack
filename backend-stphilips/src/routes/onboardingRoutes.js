const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  registerFacility,
  checkRegistrationStatus,
  getPendingFacilities,
  getAllFacilities,
  getOnboardingStats,
  approveFacility,
  rejectFacility,
  suspendFacility,
  reactivateFacility,
} = require("../controllers/onboardingController");

// ---------- PUBLIC (no auth) ----------
router.post("/register", registerFacility);
router.get("/status", checkRegistrationStatus);

// ---------- PROTECTED (platform_admin only) ----------
router.use(authenticate);

router.get("/pending", authorize("platform_admin"), getPendingFacilities);
router.get("/all", authorize("platform_admin"), getAllFacilities);
router.get("/stats", authorize("platform_admin"), getOnboardingStats);

router.post("/:id/approve", authorize("platform_admin"), approveFacility);
router.post("/:id/reject", authorize("platform_admin"), rejectFacility);
router.post("/:id/suspend", authorize("platform_admin"), suspendFacility);
router.post(
  "/:id/reactivate",
  authorize("platform_admin"),
  reactivateFacility
);

module.exports = router;