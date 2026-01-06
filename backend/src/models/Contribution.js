const mongoose = require("mongoose");

const contributionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MassSchedule",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be positive"],
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
contributionSchema.index({ scheduleId: 1, date: -1 });
contributionSchema.index({ userId: 1, date: -1 });
contributionSchema.index({ date: -1 });

module.exports = mongoose.model("Contribution", contributionSchema);
