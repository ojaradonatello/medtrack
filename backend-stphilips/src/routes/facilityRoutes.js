const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createFacility,
  getFacilities,
  getFacility,
  updateFacility,
  assignUserToFacility,
  getFacilityUsers,
  getMyFacility,
} = require("../controllers/facilityController");;

const { attachFacility } = require("../middleware/facilityMiddleware");

router.use(authenticate);
router.use(attachFacility);

router.get("/my", getMyFacility);

router.get("/", authorize("admin"), getFacilities);

router.post("/", authorize("admin"), createFacility);

router.get("/:id", authorize("admin"), getFacility);

router.patch("/:id", authorize("admin"), updateFacility);

router.post(
  "/:id/users",
  authorize("admin"),
  assignUserToFacility
);

router.get(
  "/:id/users",
  authorize("admin"),
  getFacilityUsers
);

module.exports = router;