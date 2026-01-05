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
    required: true,
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

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);
