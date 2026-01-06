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
  getAllContributions,
  addExpense,
  getAllExpenses,
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

// User management routes
router.post("/users/register", registerUser);
router.get("/users", getAllUsers);
router.patch("/users/:id/status", updateUserStatus);

// Financial routes
router.post("/contributions", addContribution);
router.get("/contributions", getAllContributions);
router.post("/expenses", addExpense);
router.get("/expenses", getAllExpenses);

module.exports = router;
