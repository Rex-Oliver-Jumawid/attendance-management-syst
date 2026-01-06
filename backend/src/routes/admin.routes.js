const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  assignModerator,
  removeModerator,
  getAllModerators,
  createModerator,
  generateReport,
  getSystemStats,
  updateUserStatus,
  getAttendanceReports,
} = require("../controllers/admin.controller");
const {
  createSchedule,
  getAllSchedules,
  updateSchedule,
  deleteSchedule,
} = require("../controllers/massSchedule.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// All routes are protected and require 'admin' role
router.use(protect);
router.use(authorize("admin"));

// User management routes
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id/status", updateUserStatus);

// Moderator management routes
router.get("/moderators", getAllModerators);
router.post("/moderators/create", createModerator);
router.post("/moderators/assign", assignModerator);
router.delete("/moderators/:id", removeModerator);

// Mass schedule routes
router.get("/mass-schedules", getAllSchedules);
router.post("/mass-schedules", createSchedule);
router.put("/mass-schedules/:id", updateSchedule);
router.delete("/mass-schedules/:id", deleteSchedule);

// Reports and statistics
router.get("/reports", generateReport);
router.get("/stats", getSystemStats);
router.get("/reports/attendance", getAttendanceReports);

module.exports = router;
