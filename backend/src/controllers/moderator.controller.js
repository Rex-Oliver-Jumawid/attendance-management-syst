const AttendanceSession = require("../models/AttendanceSession");
const AttendanceRecord = require("../models/AttendanceRecord");
const User = require("../models/User");

// @desc    Scan QR code and record attendance
// @route   POST /api/moderator/scan
// @access  Private (Moderator)
exports.scanQR = async (req, res) => {
  try {
    const { qrCode, notes } = req.body; // Remove massType from request
    const moderatorId = req.user.id;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: "QR code is required",
      });
    }

    // Find the QR session
    const session = await AttendanceSession.findOne({ qrCode }).populate(
      "userId",
      "firstName lastName username email"
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Invalid QR code",
      });
    }

    // Check if QR is valid
    if (!session.isValid()) {
      return res.status(400).json({
        success: false,
        message:
          session.status === "used"
            ? "QR code already used"
            : "QR code has expired",
      });
    }

    // Use mass type from the session
    const massType = session.massType;

    // Mark session as used
    session.status = "used";
    session.usedAt = new Date();
    session.scannedBy = moderatorId;
    await session.save();

    // Create attendance record
    const record = await AttendanceRecord.create({
      userId: session.userId._id,
      sessionId: session._id,
      moderatorId,
      massType,
      notes,
    });

    // Populate the record for response
    await record.populate("userId", "firstName lastName username");
    await record.populate("moderatorId", "firstName lastName username");

    res.status(201).json({
      success: true,
      message: "Attendance recorded successfully",
      record: {
        id: record._id,
        user: {
          id: record.userId._id,
          name: `${record.userId.firstName} ${record.userId.lastName}`,
          username: record.userId.username,
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
    const moderatorId = req.user.id;

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

    const records = await AttendanceRecord.find({
      scannedBy: moderatorId,
      scannedAt: { $gte: startDate },
    })
      .populate("userId", "firstName lastName username email")
      .sort({ scannedAt: -1 })
      .limit(parseInt(limit));

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
      .populate("userId", "firstName lastName username")
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
