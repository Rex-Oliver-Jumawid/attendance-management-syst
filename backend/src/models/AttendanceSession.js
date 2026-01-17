const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  qrCode: {
    type: String,
    required: true,
    unique: true,
    index: true, // Combined with unique
  },
  qrCodeImage: {
    type: String, // Base64 image
    required: true,
  },
  massType: {
    type: String,
    required: true,
    enum: ["Sunday Mass", "Weekday Mass", "Special Mass", "Other"],
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MassSchedule",
  },
  status: {
    type: String,
    enum: ["active", "expired", "used"],
    default: "active",
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  usedAt: {
    type: Date,
  },
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Moderator who scanned
  },
});

// Indexes
attendanceSessionSchema.index({ userId: 1, status: 1 });

// Check if QR is valid
attendanceSessionSchema.methods.isValid = function () {
  return this.status === "active" && this.expiresAt > new Date();
};

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
