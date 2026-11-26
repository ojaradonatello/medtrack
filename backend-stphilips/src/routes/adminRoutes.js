const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getOverview,
  getActivityLogs,
} = require("../controllers/adminController");

const {
  listUsers,
  createUser,
  updateUser,
} = require("../controllers/userAdminController");

router.use(authenticate);

const { attachFacility } = require("../middleware/facilityMiddleware");
router.use(attachFacility);
router.use(authorize("admin"));

router.get("/overview", getOverview);
router.get("/activity-logs", getActivityLogs);

router.get("/users", listUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);

module.exports = router;