const mongoose = require("mongoose");

const moderatorAssignmentSchema = new mongoose.Schema({
  moderatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Admin who assigned
    required: true,
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
  },
});

moderatorAssignmentSchema.index({ moderatorId: 1, isActive: 1 });

module.exports = mongoose.model(
  "ModeratorAssignment",
  moderatorAssignmentSchema
);
