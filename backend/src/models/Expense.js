const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be positive"],
    },
    category: {
      type: String,
      enum: [
        "Utilities",
        "Maintenance",
        "Supplies",
        "Events",
        "Salaries",
        "Charity",
        "Other",
      ],
      default: "Other",
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
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

// Index for efficient monthly queries
expenseSchema.index({ year: -1, month: -1 });
expenseSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
