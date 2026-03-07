const AttendanceSession = require("../models/AttendanceSession");
const AttendanceRecord = require("../models/AttendanceRecord");
const User = require("../models/User");
const Contribution = require("../models/Contribution");
const Expense = require("../models/Expense");
const MassSchedule = require("../models/MassSchedule");
const bcrypt = require("bcryptjs");

// @desc    Scan QR code and record attendance
// @route   POST /api/moderator/scan
// @access  Private (Moderator)
exports.scanQR = async (req, res) => {
  try {
    const { qrCode, notes, scheduleId } = req.body;
    const moderatorId = req.user.id;

    if (!qrCode || !scheduleId) {
      return res.status(400).json({
        success: false,
        message: "QR code and schedule are required",
      });
    }

    // Find user by permanent QR code
    const user = await User.findOne({ qrCode });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid QR code - user not found",
      });
    }

    // Verify schedule exists
    const schedule = await MassSchedule.findById(scheduleId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // Check if user already has attendance for this specific schedule
    const existingAttendance = await AttendanceRecord.findOne({
      userId: user._id,
      scheduleId: scheduleId,
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance already recorded for this schedule",
      });
    }

    // Create attendance record directly (no session needed for permanent QR)
    const record = await AttendanceRecord.create({
      userId: user._id,
      sessionId: null, // No session for permanent QR codes
      moderatorId,
      massType: schedule.massType,
      scheduleId: schedule._id, // Ensure scheduleId is set
      notes,
    });

    // Populate the record for response
    await record.populate("userId", "firstName lastName");
    await record.populate("moderatorId", "firstName lastName");

    res.status(201).json({
      success: true,
      message: "Attendance recorded successfully",
      record: {
        id: record._id,
        user: {
          id: record.userId._id,
          name: `${record.userId.firstName} ${record.userId.lastName}`,
        },
        moderator: {
          id: record.moderatorId._id,
          name: `${record.moderatorId.firstName} ${record.moderatorId.lastName}`,
        },
        massType: record.massType,
        scannedAt: record.scannedAt,
        notes: record.notes,
      },
    });
  } catch (error) {
    console.error("Scan QR error:", error);
    res.status(500).json({
      success: false,
      message: "Error scanning QR code",
      error: error.message,
    });
  }
};

// @desc    Get recent attendance records scanned by moderator
// @route   GET /api/moderator/attendance/recent
// @access  Private (Moderator)
exports.getRecentScans = async (req, res) => {
  try {
    const { limit = 20, range = "day" } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (range) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "day":
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    console.log("[getRecentScans] Query params:", { limit, range });
    console.log("[getRecentScans] Date range:", startDate, "to", now);

    const query = { scannedAt: { $gte: startDate } };
    console.log("[getRecentScans] MongoDB query:", query);

    const records = await AttendanceRecord.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ scannedAt: -1 })
      .limit(parseInt(limit));

    console.log(`[getRecentScans] Found ${records.length} attendance records`);
    if (records.length > 0) {
      console.log("[getRecentScans] Example record:", records[0]);
    }

    res.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error("Get recent scans error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent scans",
    });
  }
};

// @desc    Get active QR sessions
// @route   GET /api/moderator/sessions/active
// @access  Private (Moderator)
exports.getActiveSessions = async (req, res) => {
  try {
    const activeSessions = await AttendanceSession.find({
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "firstName lastName")
      .sort({ generatedAt: -1 });

    res.status(200).json({
      success: true,
      count: activeSessions.length,
      sessions: activeSessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active sessions",
      error: error.message,
    });
  }
};

// @desc    Get moderator statistics
// @route   GET /api/moderator/stats
// @access  Private (Moderator)
exports.getModeratorStats = async (req, res) => {
  try {
    const moderatorId = req.user.id;
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date();

    const totalScans = await AttendanceRecord.countDocuments({
      moderatorId,
      scannedAt: { $gte: start, $lte: end },
    });

    const mongoose = require("mongoose");
    const massTypeBreakdown = await AttendanceRecord.aggregate([
      {
        $match: {
          moderatorId: new mongoose.Types.ObjectId(moderatorId),
          scannedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$massType",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalScans,
        massTypeBreakdown,
        period: {
          startDate: start,
          endDate: end,
        },
      },
    });
  } catch (error) {
    console.error("Get moderator stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching moderator stats",
      error: error.message,
    });
  }
};

// @desc    Register a new user (by moderator)
// @route   POST /api/moderator/users/register
// @access  Private (Moderator)
exports.registerUser = async (req, res) => {
  try {
    const { email, firstName, lastName, phoneNumber } = req.body;

    // Validate required fields (only email and name required for members)
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "Email, first name, and last name are required",
      });
    }

    // Check if user exists by email
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Create user as member (QR code generated by pre-save hook)
    // Members don't need username - only moderators and admins have usernames
    const user = await User.create({
      email,
      firstName,
      lastName,
      phoneNumber,
      role: "member",
      isActive: true,
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: "Member registered successfully",
      data: userResponse,
    });
  } catch (error) {
    // Log full stack for debugging
    console.error("Register user error:", error.stack || error);

    // In development return the error message for easier debugging
    const payload = {
      success: false,
      message: "Error registering member",
      error: error.message,
    };

    if (process.env.NODE_ENV === "development") {
      payload.stack = error.stack;
    }

    res.status(500).json(payload);
  }
};

// @desc    Get all users
// @route   GET /api/moderator/users
// @access  Private (Moderator)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// @desc    Update user status
// @route   PATCH /api/moderator/users/:id/status
// @access  Private (Moderator)
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean value",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deactivating admin users
    if (user.role === "admin" && !isActive) {
      return res.status(403).json({
        success: false,
        message: "Cannot deactivate admin users",
      });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      data: user,
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user status",
      error: error.message,
    });
  }
};

// @desc    Add contribution
// @route   POST /api/moderator/contributions
// @access  Private (Moderator)
exports.addContribution = async (req, res) => {
  try {
    const { userId, scheduleId, amount, notes } = req.body;
    const moderatorId = req.user.id;

    if (
      !userId ||
      !scheduleId ||
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "User, schedule, and amount are required",
      });
    }

    // Amount of 0 means no contribution — skip saving and return success
    if (Number(amount) === 0) {
      return res.status(200).json({
        success: true,
        message: "No contribution recorded (amount is zero)",
        data: null,
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify schedule exists
    const schedule = await MassSchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const contribution = await Contribution.create({
      userId,
      scheduleId,
      amount,
      recordedBy: moderatorId,
      notes,
    });

    await contribution.populate("userId", "firstName lastName");
    await contribution.populate("scheduleId");
    await contribution.populate("recordedBy", "firstName lastName");

    res.status(201).json({
      success: true,
      message: "Contribution recorded successfully",
      data: contribution,
    });
  } catch (error) {
    console.error("Add contribution error:", error);
    res.status(500).json({
      success: false,
      message: "Error recording contribution",
      error: error.message,
    });
  }
};

// @desc    Update an existing contribution
// @route   PUT /api/moderator/contributions/:id
// @access  Private (Moderator)
exports.updateContribution = async (req, res) => {
  try {
    const contributionId = req.params.id;
    const { amount, notes } = req.body;

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      isNaN(amount) ||
      amount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid amount is required",
      });
    }

    // Treat amount of 0 as "clear contribution" — delete the record
    if (Number(amount) === 0) {
      await Contribution.findByIdAndDelete(contributionId);
      return res.status(200).json({
        success: true,
        message: "Contribution cleared",
        data: null,
      });
    }

    const contribution = await Contribution.findById(contributionId);

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: "Contribution not found",
      });
    }

    contribution.amount = amount;
    if (notes) contribution.notes = notes;
    await contribution.save();

    await contribution.populate("userId", "firstName lastName");
    await contribution.populate("scheduleId");
    await contribution.populate("recordedBy", "firstName lastName");

    res.status(200).json({
      success: true,
      message: "Contribution updated successfully",
      data: contribution,
    });
  } catch (error) {
    console.error("Update contribution error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating contribution",
      error: error.message,
    });
  }
};

// @desc    Get all contributions
// @route   GET /api/moderator/contributions
// @access  Private (Moderator)
exports.getAllContributions = async (req, res) => {
  try {
    const contributions = await Contribution.find()
      .populate("userId", "firstName lastName")
      .populate("scheduleId")
      .populate("recordedBy", "firstName lastName")
      .sort({ date: -1 });

    // Filter out records where referenced documents have been deleted
    const valid = contributions.filter(
      (c) => c.userId && c.scheduleId && c.recordedBy,
    );

    res.status(200).json({
      success: true,
      count: valid.length,
      data: valid,
    });
  } catch (error) {
    console.error("Get contributions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching contributions",
      error: error.message,
    });
  }
};

// @desc    Add expense
// @route   POST /api/moderator/expenses
// @access  Private (Moderator)
exports.addExpense = async (req, res) => {
  try {
    const { amount, category } = req.body;
    const moderatorId = req.user.id;

    if (!amount || !category) {
      return res.status(400).json({
        success: false,
        message: "Amount and category are required",
      });
    }

    // Check amount does not exceed available balance
    const Contribution = require("../models/Contribution");
    const contributions = await Contribution.find();
    const existingExpenses = await Expense.find();
    const totalContributions = contributions.reduce(
      (sum, c) => sum + c.amount,
      0,
    );
    const totalExpenses = existingExpenses.reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    const availableBalance = totalContributions - totalExpenses;

    if (parseFloat(amount) > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Expense amount (₱${parseFloat(amount).toFixed(2)}) exceeds available balance (₱${availableBalance.toFixed(2)})`,
      });
    }

    // Auto-set month and year based on current date
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

    // Use category as description if not provided
    const description = category;

    const expense = await Expense.create({
      description,
      amount,
      category,
      month,
      year,
      recordedBy: moderatorId,
      notes: "",
    });

    await expense.populate("recordedBy", "firstName lastName");

    res.status(201).json({
      success: true,
      message: "Expense recorded successfully",
      data: expense,
    });
  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({
      success: false,
      message: "Error recording expense",
      error: error.message,
    });
  }
};

// @desc    Get all expenses
// @route   GET /api/moderator/expenses
// @access  Private (Moderator)
exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate("recordedBy", "firstName lastName")
      .sort({ date: -1 });

    // Filter out records where the moderator who recorded them has been deleted
    const valid = expenses.filter((e) => e.recordedBy);

    res.status(200).json({
      success: true,
      count: valid.length,
      data: valid,
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching expenses",
      error: error.message,
    });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/moderator/expenses/:id
// @access  Private (Moderator)
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    await expense.deleteOne();

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting expense",
      error: error.message,
    });
  }
};

// @desc    Get available balance (total contributions - total expenses)
// @route   GET /api/moderator/balance
// @access  Private (Moderator)
exports.getAvailableBalance = async (req, res) => {
  try {
    const Contribution = require("../models/Contribution");

    const contributions = await Contribution.find()
      .populate("userId", "_id")
      .populate("scheduleId", "_id")
      .populate("recordedBy", "_id");
    const expenses = await Expense.find().populate("recordedBy", "_id");

    // Only count contributions/expenses whose references still exist
    const validContributions = contributions.filter(
      (c) => c.userId && c.scheduleId && c.recordedBy,
    );
    const validExpenses = expenses.filter((e) => e.recordedBy);

    const totalContributions = validContributions.reduce(
      (sum, c) => sum + c.amount,
      0,
    );
    const totalExpenses = validExpenses.reduce((sum, e) => sum + e.amount, 0);
    const availableBalance = totalContributions - totalExpenses;

    res.status(200).json({
      success: true,
      data: {
        totalContributions,
        totalExpenses,
        availableBalance,
      },
    });
  } catch (error) {
    console.error("Get balance error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching balance",
      error: error.message,
    });
  }
};

// @desc    Get attendees for a specific schedule
// @route   GET /api/moderator/schedules/:scheduleId/attendees
// @access  Private (Moderator)
exports.getScheduleAttendees = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    // Verify schedule exists
    const schedule = await MassSchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // Get all attendance records for this schedule
    const attendanceRecords = await AttendanceRecord.find({ scheduleId })
      .populate("userId", "firstName lastName email qrCode")
      .populate("moderatorId", "firstName lastName")
      .sort({ scannedAt: -1 });

    // Get contributions for this schedule
    const contributions = await Contribution.find({ scheduleId }).populate(
      "userId",
      "firstName lastName email",
    );

    // Create a map of contributions by userId
    const contributionMap = {};
    contributions.forEach((contrib) => {
      if (contrib.userId && contrib.userId._id) {
        contributionMap[contrib.userId._id.toString()] = contrib;
      }
    });

    // Combine attendance with contributions
    const attendees = attendanceRecords.map((record) => {
      const userId = record.userId?._id?.toString();
      const contribution = userId ? contributionMap[userId] : null;

      return {
        _id: record._id,
        userId: record.userId?._id,
        userName: record.userId
          ? `${record.userId.firstName} ${record.userId.lastName}`
          : "Unknown",
        userEmail: record.userId?.email || "N/A",
        qrCode: record.userId?.qrCode || null,
        scannedAt: record.scannedAt,
        notes: record.notes,
        moderator: record.moderatorId
          ? `${record.moderatorId.firstName} ${record.moderatorId.lastName}`
          : "Unknown",
        contributionAmount: contribution?.amount || null,
        contributionId: contribution?._id || null,
        contributionNotes: contribution?.notes || null,
      };
    });

    res.status(200).json({
      success: true,
      schedule: {
        id: schedule._id,
        name: schedule.name,
        massType: schedule.massType,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        dayOfWeek: schedule.dayOfWeek,
        status: schedule.status,
      },
      count: attendees.length,
      attendees,
    });
  } catch (error) {
    console.error("Get schedule attendees error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching schedule attendees",
      error: error.message,
    });
  }
};
