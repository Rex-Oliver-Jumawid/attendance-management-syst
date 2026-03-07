const express = require("express");
const router = express.Router();
const {
  scanQR,
  getRecentScans,
  getActiveSessions,
  getModeratorStats,
  registerUser,
  getAllUsers,
  updateUserStatus,
  addContribution,
  updateContribution,
  getAllContributions,
  addExpense,
  getAllExpenses,
  deleteExpense,
  getAvailableBalance,
  getScheduleAttendees,
} = require("../controllers/moderator.controller");
const {
  sendAbsenceFollowUp,
} = require("../controllers/massSchedule.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// All routes are protected and require 'moderator' or 'admin' role
router.use(protect);
router.use(authorize("moderator", "admin"));

// Scanning routes
router.post("/scan", scanQR);
router.get("/attendance/recent", getRecentScans);
router.get("/sessions/active", getActiveSessions);
router.get("/stats", getModeratorStats);

// User management routes
router.post("/users/register", registerUser);
router.get("/users", getAllUsers);
router.patch("/users/:id/status", updateUserStatus);

// Financial routes
router.post("/contributions", addContribution);
router.put("/contributions/:id", updateContribution);
router.get("/contributions", getAllContributions);
router.post("/expenses", addExpense);
router.get("/expenses", getAllExpenses);
router.delete("/expenses/:id", deleteExpense);
router.get("/balance", getAvailableBalance);

// Schedule attendees
router.get("/schedules/:scheduleId/attendees", getScheduleAttendees);
router.post("/schedules/:id/send-absence-followup", sendAbsenceFollowUp);

module.exports = router;
