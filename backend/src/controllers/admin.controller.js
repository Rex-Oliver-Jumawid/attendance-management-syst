const User = require("../models/User");
const ModeratorAssignment = require("../models/ModeratorAssignment");
const AttendanceRecord = require("../models/AttendanceRecord");
const AttendanceSession = require("../models/AttendanceSession");

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      totalUsers,
      page: parseInt(page),
      totalPages: Math.ceil(totalUsers / parseInt(limit)),
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// @desc    Get single user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's attendance count
    const attendanceCount = await AttendanceRecord.countDocuments({
      userId: user._id,
    });

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        attendanceCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// @desc    Assign moderator role
// @route   POST /api/admin/moderators/assign
// @access  Private (Admin)
exports.assignModerator = async (req, res) => {
  try {
    const { userId, notes } = req.body;
    const adminId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "moderator") {
      return res.status(400).json({
        success: false,
        message: "User is already a moderator",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot assign moderator role to admin",
      });
    }

    // Update user role
    user.role = "moderator";
    await user.save();

    // Create moderator assignment record
    const assignment = await ModeratorAssignment.create({
      moderatorId: userId,
      assignedBy: adminId,
      notes,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      message: "Moderator assigned successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error assigning moderator",
      error: error.message,
    });
  }
};

// @desc    Remove moderator role
// @route   DELETE /api/admin/moderators/:id
// @access  Private (Admin)
exports.removeModerator = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "moderator") {
      return res.status(400).json({
        success: false,
        message: "User is not a moderator",
      });
    }

    // Change role back to user
    user.role = "user";
    await user.save();

    // Deactivate assignment
    await ModeratorAssignment.updateMany(
      { moderatorId: userId },
      { isActive: false }
    );

    res.status(200).json({
      success: true,
      message: "Moderator role removed successfully",
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing moderator",
      error: error.message,
    });
  }
};

// @desc    Get all moderators
// @route   GET /api/admin/moderators
// @access  Private (Admin)
exports.getAllModerators = async (req, res) => {
  try {
    const moderators = await User.find({ role: "moderator" }).select(
      "-password"
    );

    // Get attendance scan counts for each moderator
    const moderatorsWithStats = await Promise.all(
      moderators.map(async (mod) => {
        const scanCount = await AttendanceRecord.countDocuments({
          moderatorId: mod._id,
        });
        return {
          ...mod.toObject(),
          totalScans: scanCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: moderatorsWithStats.length,
      moderators: moderatorsWithStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching moderators",
      error: error.message,
    });
  }
};

// @desc    Generate system-wide report
// @route   GET /api/admin/reports
// @access  Private (Admin)
exports.generateReport = async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Total attendance
    const totalAttendance = await AttendanceRecord.countDocuments({
      scannedAt: { $gte: start, $lte: end },
    });

    // Unique attendees
    const uniqueAttendees = await AttendanceRecord.distinct("userId", {
      scannedAt: { $gte: start, $lte: end },
    });

    // Mass type breakdown
    const massTypeBreakdown = await AttendanceRecord.aggregate([
      {
        $match: {
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

    // Top attendees
    const topAttendees = await AttendanceRecord.aggregate([
      {
        $match: {
          scannedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Populate top attendees
    const populatedTopAttendees = await User.populate(topAttendees, {
      path: "_id",
      select: "firstName lastName username",
    });

    // Moderator performance
    const moderatorPerformance = await AttendanceRecord.aggregate([
      {
        $match: {
          scannedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$moderatorId",
          scansCount: { $sum: 1 },
        },
      },
      {
        $sort: { scansCount: -1 },
      },
    ]);

    const populatedModerators = await User.populate(moderatorPerformance, {
      path: "_id",
      select: "firstName lastName username",
    });

    // Daily attendance trend
    const dailyTrend = await AttendanceRecord.aggregate([
      {
        $match: {
          scannedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$scannedAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      report: {
        period: {
          startDate: start,
          endDate: end,
        },
        summary: {
          totalAttendance,
          uniqueAttendees: uniqueAttendees.length,
          averageAttendancePerDay: (
            totalAttendance / Math.ceil((end - start) / (1000 * 60 * 60 * 24))
          ).toFixed(2),
        },
        massTypeBreakdown,
        topAttendees: populatedTopAttendees,
        moderatorPerformance: populatedModerators,
        dailyTrend,
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getSystemStats = async (req, res) => {
  try {
    // Count all users (including moderators, excluding admins for display)
    const totalUsers = await User.countDocuments({
      role: { $in: ["user", "moderator"] },
      isActive: true,
    });

    const totalModerators = await User.countDocuments({
      role: "moderator",
      isActive: true,
    });

    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalAttendance = await AttendanceRecord.countDocuments();
    const activeQRSessions = await AttendanceSession.countDocuments({
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await AttendanceRecord.countDocuments({
      scannedAt: { $gte: today },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers, // For frontend display
        totalModerators, // For frontend display
        users: {
          total: totalUsers,
          moderators: totalModerators,
          admins: totalAdmins,
        },
        attendance: {
          total: totalAttendance,
          today: todayAttendance,
        },
        activeQRSessions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching system stats",
      error: error.message,
    });
  }
};

// @desc    Deactivate/Activate user account
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate admin account",
      });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User account ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      user: {
        id: user._id,
        username: user.username,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user status",
      error: error.message,
    });
  }
};

// @desc    Get attendance reports with schedule breakdown
// @route   GET /api/admin/reports/attendance
// @access  Private (Admin)
exports.getAttendanceReports = async (req, res) => {
  try {
    const { range = "day", scheduleId } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "day":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "all":
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    // Build query
    const query = { scannedAt: { $gte: startDate } };
    if (scheduleId) {
      query.scheduleId = scheduleId;
    }

    // Get attendance records with populated data
    const records = await AttendanceRecord.find(query)
      .populate("userId", "firstName lastName username")
      .populate("scannedBy", "firstName lastName username")
      .populate("scheduleId", "name massType scheduleType startTime endTime")
      .sort({ scannedAt: -1 });

    // Calculate stats
    const totalAttendance = records.length;
    const uniqueAttendees = new Set(
      records.map((r) => r.userId?._id.toString())
    ).size;
    const schedulesUsed = new Set(
      records.map((r) => r.scheduleId?._id.toString())
    ).size;

    // Group by schedule
    const scheduleMap = new Map();

    records.forEach((record) => {
      if (!record.scheduleId) return;

      const scheduleIdStr = record.scheduleId._id.toString();

      if (!scheduleMap.has(scheduleIdStr)) {
        scheduleMap.set(scheduleIdStr, {
          scheduleId: scheduleIdStr,
          scheduleName: record.scheduleId.name,
          massType: record.scheduleId.massType,
          scheduleType: record.scheduleId.scheduleType,
          startTime: record.scheduleId.startTime,
          endTime: record.scheduleId.endTime,
          attendanceCount: 0,
          attendees: [],
        });
      }

      const scheduleData = scheduleMap.get(scheduleIdStr);
      scheduleData.attendanceCount++;
      scheduleData.attendees.push({
        userName: record.userId
          ? `${record.userId.firstName} ${record.userId.lastName}`
          : "Unknown",
        userUsername: record.userId?.username || "N/A",
        scannedAt: record.scannedAt,
        moderatorName: record.scannedBy
          ? `${record.scannedBy.firstName} ${record.scannedBy.lastName}`
          : "N/A",
      });
    });

    const scheduleBreakdown = Array.from(scheduleMap.values()).sort(
      (a, b) => b.attendanceCount - a.attendanceCount
    );

    res.status(200).json({
      success: true,
      stats: {
        totalAttendance,
        uniqueAttendees,
        schedulesUsed,
      },
      scheduleBreakdown,
      data: scheduleBreakdown, // For CSV export
      range,
      startDate,
      endDate: now,
    });
  } catch (error) {
    console.error("Error generating attendance reports:", error);
    res.status(500).json({
      success: false,
      message: "Error generating reports",
      error: error.message,
    });
  }
};
