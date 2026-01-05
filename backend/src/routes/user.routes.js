const express = require("express");
const router = express.Router();
const {
  generateQR,
  getAttendanceHistory,
  getAttendanceStats,
} = require("../controllers/user.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// All routes are protected and require 'user' role
router.use(protect);
router.use(authorize("user", "moderator", "admin"));

// QR code routes
router.post("/qr/generate", generateQR);

// Attendance routes
router.get("/attendance/history", getAttendanceHistory);
router.get("/attendance/stats", getAttendanceStats);

module.exports = router;
