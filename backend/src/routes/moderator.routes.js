const express = require("express");
const router = express.Router();
const {
  scanQR,
  getRecentScans,
  getActiveSessions,
  getModeratorStats,
} = require("../controllers/moderator.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// All routes are protected and require 'moderator' or 'admin' role
router.use(protect);
router.use(authorize("moderator", "admin"));

// Scanning routes
router.post("/scan", scanQR);
router.get("/attendance/recent", getRecentScans);
router.get("/sessions/active", getActiveSessions);
router.get("/stats", getModeratorStats);

module.exports = router;
