const QRCode = require("qrcode");
const crypto = require("crypto");
const AttendanceSession = require("../models/AttendanceSession");
const AttendanceRecord = require("../models/AttendanceRecord");
const MassSchedule = require("../models/MassSchedule");

// @desc    Generate QR code for church attendance
// @route   POST /api/user/qr/generate
// @access  Private (User)
exports.generateQR = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has an active QR session
    const existingSession = await AttendanceSession.findOne({
      userId,
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: "You already have an active QR code",
        session: {
          qrCodeImage: existingSession.qrCodeImage,
          expiresAt: existingSession.expiresAt,
          massType: existingSession.massType,
        },
      });
    }

    // Find current mass schedule
    const currentSchedule = await MassSchedule.findCurrentSchedule();
    const massType = currentSchedule ? currentSchedule.massType : "Other";
    const scheduleId = currentSchedule ? currentSchedule._id : null;

    // Generate unique QR code data
    const qrData = crypto.randomBytes(32).toString("hex");

    // Calculate expiry time
    const expiryMinutes = parseInt(process.env.QR_EXPIRY_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Generate QR code image (Base64)
    const qrCodeImage = await QRCode.toDataURL(qrData);

    // Create session with mass type
    const session = await AttendanceSession.create({
      userId,
      qrCode: qrData,
      qrCodeImage,
      massType,
      scheduleId,
      expiresAt,
      status: "active",
    });

    res.status(201).json({
      success: true,
      message: "QR code generated successfully",
      session: {
        id: session._id,
        qrCodeImage: session.qrCodeImage,
        massType: session.massType,
        scheduleName: currentSchedule?.name,
        generatedAt: session.generatedAt,
        expiresAt: session.expiresAt,
        expiresIn: `${expiryMinutes} minutes`,
      },
    });
  } catch (error) {
    console.error("Generate QR error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating QR code",
      error: error.message,
    });
  }
};

// @desc    Get user's attendance history
// @route   GET /api/user/attendance/history
// @access  Private (User)
exports.getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    // Build query
    const query = { userId };

    // Add date filters if provided
    if (startDate || endDate) {
      query.scannedAt = {};
      if (startDate) {
        query.scannedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.scannedAt.$lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await AttendanceRecord.countDocuments(query);

    // Get records with pagination
    const records = await AttendanceRecord.find(query)
      .populate("scannedBy", "firstName lastName username")
      .populate("scheduleId", "name massType")
      .sort({ scannedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Map records to include moderator info
    const mappedRecords = records.map((record) => ({
      _id: record._id,
      scannedAt: record.scannedAt,
      massType: record.massType,
      notes: record.notes,
      moderatorId: record.scannedBy
        ? {
            firstName: record.scannedBy.firstName,
            lastName: record.scannedBy.lastName,
            username: record.scannedBy.username,
          }
        : null,
      schedule: record.scheduleId
        ? {
            name: record.scheduleId.name,
            massType: record.scheduleId.massType,
          }
        : null,
    }));

    res.json({
      success: true,
      records: mappedRecords,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get attendance history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance history",
      error: error.message,
    });
  }
};

// @desc    Get user's attendance statistics
// @route   GET /api/user/attendance/stats
// @access  Private (User)
exports.getAttendanceStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Build query
    const query = { userId };

    // Add date filters if provided
    if (startDate || endDate) {
      query.scannedAt = {};
      if (startDate) {
        query.scannedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.scannedAt.$lte = new Date(endDate);
      }
    }

    // Get total attendance count
    const totalAttendance = await AttendanceRecord.countDocuments({ userId });

    // Get this month's attendance
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthAttendance = await AttendanceRecord.countDocuments({
      userId,
      scannedAt: { $gte: startOfMonth },
    });

    // Get last mass attended
    const lastMass = await AttendanceRecord.findOne({ userId })
      .sort({ scannedAt: -1 })
      .limit(1);

    // Get attendance by mass type
    const byMassType = await AttendanceRecord.aggregate([
      { $match: { userId: require("mongoose").Types.ObjectId(userId) } },
      { $group: { _id: "$massType", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalAttendance,
        thisMonthAttendance,
        lastMassDate: lastMass ? lastMass.scannedAt : null,
        byMassType: byMassType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Get attendance stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance statistics",
      error: error.message,
    });
  }
};
