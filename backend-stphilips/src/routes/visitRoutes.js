const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createVisit,
  getVisits,
  getVisit,
  moveVisit,
} = require("../controllers/visitController");

const VIEW_ROLES = [
  "admin",
  "reception",
  "doctor",
  "lab",
  "billing",
  "pharmacist",
  "staff",
];

const MOVE_ROLES = [
  "admin",
  "reception",
  "doctor",
  "lab",
  "billing",
  "pharmacist",
];

router.use(authenticate);

router.post("/", authorize(...VIEW_ROLES), createVisit);

router.get("/", authorize(...VIEW_ROLES), getVisits);

router.get("/:id", authorize(...VIEW_ROLES), getVisit);

router.patch("/:id/move", authorize(...MOVE_ROLES), moveVisit);

module.exports = router;