const User = require("../models/User");
const ModeratorAssignment = require("../models/ModeratorAssignment");
const AttendanceRecord = require("../models/AttendanceRecord");
const AttendanceSession = require("../models/AttendanceSession");
const MassSchedule = require("../models/MassSchedule");

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
    const { userId, username, password } = req.body;
    const adminId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required for moderators",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({
      username,
      _id: { $ne: userId },
    });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
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

    // Update user role, username, and password
    user.role = "moderator";
    user.username = username;
    user.password = password; // Will be hashed by pre-save middleware
    await user.save();

    // Create moderator assignment record
    const assignment = await ModeratorAssignment.create({
      moderatorId: userId,
      assignedBy: adminId,
      notes: "Assigned as moderator with new password",
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
    console.log("Attempting to remove moderator with ID:", userId);

    const user = await User.findById(userId);
    console.log("Found user:", user ? user.username : "null");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "moderator") {
      console.log("User role is not moderator, it is:", user.role);
      return res.status(400).json({
        success: false,
        message: "User is not a moderator",
      });
    }

    // Change role back to member and clear credentials
    user.role = "member";
    user.username = undefined;
    user.password = undefined;
    await user.save();
    console.log("User role changed to member and credentials cleared");

    // Deactivate assignment
    await ModeratorAssignment.updateMany(
      { moderatorId: userId },
      { isActive: false },
    );
    console.log("Moderator assignments deactivated");

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
    console.error("Error in removeModerator:", error);
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
      "-password",
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
      }),
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

// @desc    Create new moderator account
// @route   POST /api/admin/moderators/create
// @access  Private (Admin)
exports.createModerator = async (req, res) => {
  try {
    const { firstName, lastName, email, username, password } = req.body;
    const adminId = req.user.id;

    // Validation
    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.username === username
            ? "Username already exists"
            : "Email already exists",
      });
    }

    // Create new moderator user
    const moderator = await User.create({
      firstName,
      lastName,
      email,
      username,
      password, // Will be hashed by pre-save middleware
      role: "moderator",
      isActive: true,
    });

    // Create moderator assignment record
    await ModeratorAssignment.create({
      moderatorId: moderator._id,
      assignedBy: adminId,
      notes: "Created as new moderator account",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Moderator account created successfully",
      moderator: {
        id: moderator._id,
        username: moderator.username,
        email: moderator.email,
        role: moderator.role,
        firstName: moderator.firstName,
        lastName: moderator.lastName,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating moderator",
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
    // Count only members (excluding moderators and admins)
    const totalUsers = await User.countDocuments({
      role: "member",
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
    console.log("=== getAttendanceReports START ===");
    const { range = "day", scheduleId } = req.query;
    console.log("Range:", range, "ScheduleId:", scheduleId);

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

    console.log("Date range:", startDate, "to", now);

    // Build query
    const query = { scannedAt: { $gte: startDate } };
    if (scheduleId) {
      query.scheduleId = scheduleId;
    }

    // Get attendance records with populated data
    const records = await AttendanceRecord.find(query)
      .populate("userId", "firstName lastName email")
      .populate("moderatorId", "firstName lastName")
      .sort({ scannedAt: -1 });

    console.log(`Found ${records.length} attendance records`);

    // Calculate stats
    const totalAttendance = records.length;
    const uniqueAttendees = new Set(
      records.map((r) => r.userId?._id.toString()),
    ).size;

    // For "day" range, get schedules for today and match them with attendance
    let scheduleBreakdown = [];

    if (range === "day") {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Find all schedules for today
      const todaySchedules = await MassSchedule.find({
        isActive: true,
        $or: [
          {
            scheduleType: "recurring",
            dayOfWeek: dayOfWeek,
          },
          {
            scheduleType: "specific",
            specificDate: {
              $gte: todayStart,
              $lte: todayEnd,
            },
          },
        ],
      });

      console.log(
        `Found ${todaySchedules.length} schedules for today (day ${dayOfWeek})`,
      );

      // Create breakdown for each schedule
      todaySchedules.forEach((schedule) => {
        // Filter records that match this schedule's ID
        const scheduleRecords = records.filter((record) => {
          return (
            record.scheduleId &&
            record.scheduleId.toString() === schedule._id.toString()
          );
        });

        const attendees = scheduleRecords.map((record) => ({
          recordId: record._id.toString(),
          userName: record.userId
            ? `${record.userId.firstName} ${record.userId.lastName}`
            : "Unknown",
          scannedAt: record.scannedAt,
          moderatorName: record.moderatorId
            ? `${record.moderatorId.firstName} ${record.moderatorId.lastName}`
            : "N/A",
        }));

        scheduleBreakdown.push({
          scheduleId: schedule._id.toString(),
          scheduleName: schedule.name,
          massType: schedule.massType,
          scheduleType: schedule.scheduleType,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          attendanceCount: scheduleRecords.length,
          attendees: attendees,
        });
      });

      // Sort by start time
      scheduleBreakdown.sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0;
        return a.startTime.localeCompare(b.startTime);
      });
    } else {
      // For other ranges (week, month, all), get schedule info for each record
      console.log(`Processing ${records.length} records for range: ${range}`);

      const scheduleIds = [
        ...new Set(
          records.map((r) => r.scheduleId?.toString()).filter(Boolean),
        ),
      ];
      console.log(`Found ${scheduleIds.length} unique schedule IDs`);

      const schedules = await MassSchedule.find({ _id: { $in: scheduleIds } });
      console.log(`Loaded ${schedules.length} schedules from database`);

      const scheduleMap = new Map(schedules.map((s) => [s._id.toString(), s]));

      const allAttendees = records.map((record) => {
        const schedule = record.scheduleId
          ? scheduleMap.get(record.scheduleId.toString())
          : null;
        return {
          recordId: record._id.toString(),
          userName: record.userId
            ? `${record.userId.firstName} ${record.userId.lastName}`
            : "Unknown",
          userEmail: record.userId?.email || "N/A",
          scannedAt: record.scannedAt,
          scheduleName: schedule?.name || record.massType || "Other",
          massType: schedule?.massType || record.massType || "Other",
          moderatorName: record.moderatorId
            ? `${record.moderatorId.firstName} ${record.moderatorId.lastName}`
            : "N/A",
        };
      });

      console.log(`Created ${allAttendees.length} attendee records`);
      console.log(`Sample attendee:`, allAttendees[0]);

      // Return a single "schedule" entry with all attendees
      scheduleBreakdown = [
        {
          scheduleId: "all-records",
          scheduleName: "All Records",
          massType: "All",
          scheduleType: "recurring",
          startTime: "N/A",
          endTime: "N/A",
          attendanceCount: allAttendees.length,
          attendees: allAttendees,
        },
      ];
    }

    const schedulesUsed = scheduleBreakdown.length;

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
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error generating reports",
      error: error.message,
    });
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/admin/attendance/:id
// @access  Private (Admin)
exports.deleteAttendanceRecord = async (req, res) => {
  try {
    const recordId = req.params.id;

    const record = await AttendanceRecord.findById(recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    await AttendanceRecord.findByIdAndDelete(recordId);

    res.status(200).json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting attendance record",
      error: error.message,
    });
  }
};

// @desc    Delete a member user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot delete an admin user",
      });
    }

    if (user.role === "moderator") {
      return res.status(400).json({
        success: false,
        message: "Demote the moderator to member first before deleting",
      });
    }

    // Delete related records
    await AttendanceRecord.deleteMany({ userId });
    await AttendanceSession.deleteMany({ userId });

    const Contribution = require("../models/Contribution");
    await Contribution.deleteMany({ userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User and related records deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};

// @desc    Update admin email configuration for sending notifications
// @route   PUT /api/admin/email-config
// @access  Private (Admin)
exports.updateEmailConfig = async (req, res) => {
  try {
    const { emailPassword } = req.body;

    if (!emailPassword) {
      return res.status(400).json({
        success: false,
        message: "Email password is required",
      });
    }

    // Update the admin's email password
    await User.findByIdAndUpdate(req.user.id, {
      emailPassword: emailPassword,
    });

    res.status(200).json({
      success: true,
      message: "Email configuration updated successfully",
    });
  } catch (error) {
    console.error("Error updating email configuration:", error);
    res.status(500).json({
      success: false,
      message: "Error updating email configuration",
      error: error.message,
    });
  }
};
