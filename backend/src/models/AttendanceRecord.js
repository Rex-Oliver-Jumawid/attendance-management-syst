const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AttendanceSession",
    required: false, // Optional for permanent QR codes
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MassSchedule",
    required: false, // Optional for backward compatibility
  },
  moderatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  massDate: {
    type: Date,
    default: Date.now,
  },
  scannedAt: {
    type: Date,
    default: Date.now,
  },
  massType: {
    type: String,
    enum: ["Sunday Mass", "Weekday Mass", "Special Mass", "Other"],
    default: "Sunday Mass",
  },
  notes: {
    type: String,
  },
});

// Indexes for reports
attendanceRecordSchema.index({ userId: 1, scannedAt: -1 });
attendanceRecordSchema.index({ moderatorId: 1 });
attendanceRecordSchema.index({ massDate: -1 });
attendanceRecordSchema.index({ scheduleId: 1 });

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);
