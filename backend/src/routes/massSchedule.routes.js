const express = require("express");
const router = express.Router();
const {
  createSchedule,
  getAllSchedules,
  getCurrentSchedule,
  updateSchedule,
  deleteSchedule,
} = require("../controllers/massSchedule.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// Public route - get current schedule
router.get("/current", getCurrentSchedule);

// Moderator/Admin routes - Get all schedules (for dropdown)
router.get("/", protect, authorize("admin", "moderator"), getAllSchedules);

// Admin only routes
router.post("/", protect, authorize("admin"), createSchedule);
router.put("/:id", protect, authorize("admin"), updateSchedule);
router.delete("/:id", protect, authorize("admin"), deleteSchedule);

module.exports = router;
