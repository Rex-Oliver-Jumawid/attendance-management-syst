const mongoose = require("mongoose");

const massScheduleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    massType: {
      type: String,
      required: true,
      enum: ["Sunday Mass", "Weekday Mass", "Special Mass", "Other"],
    },
    scheduleType: {
      type: String,
      enum: ["recurring", "specific"],
      default: "recurring",
      required: true,
    },
    // For recurring schedules (weekly)
    dayOfWeek: {
      type: [Number], // 0=Sunday, 1=Monday, ..., 6=Saturday
      validate: {
        validator: function (days) {
          if (this.scheduleType === "recurring") {
            return (
              days &&
              days.length > 0 &&
              days.every((day) => day >= 0 && day <= 6)
            );
          }
          return true; // Not required for specific dates
        },
        message: "Day of week must be between 0 (Sunday) and 6 (Saturday)",
      },
    },
    // For specific date schedules
    specificDate: {
      type: Date,
      validate: {
        validator: function (date) {
          if (this.scheduleType === "specific") {
            return date != null;
          }
          return true; // Not required for recurring
        },
        message: "Specific date is required for specific schedule type",
      },
    },
    startTime: {
      type: String, // Format: "HH:MM" (24-hour)
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    endTime: {
      type: String, // Format: "HH:MM" (24-hour)
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if a given date/time falls within this schedule
massScheduleSchema.methods.isWithinSchedule = function (date) {
  const checkDate = new Date(date);
  const checkTime = `${String(checkDate.getHours()).padStart(2, "0")}:${String(
    checkDate.getMinutes()
  ).padStart(2, "0")}`;

  // Check if time is within range
  if (checkTime < this.startTime || checkTime > this.endTime) {
    return false;
  }

  // Check schedule type
  if (this.scheduleType === "specific") {
    // For specific dates, check if it's the same day
    const scheduleDate = new Date(this.specificDate);
    return (
      checkDate.getFullYear() === scheduleDate.getFullYear() &&
      checkDate.getMonth() === scheduleDate.getMonth() &&
      checkDate.getDate() === scheduleDate.getDate()
    );
  } else {
    // For recurring schedules, check day of week
    const dayOfWeek = checkDate.getDay();
    return this.dayOfWeek.includes(dayOfWeek);
  }
};

// Static method to find active schedule for a given date/time
massScheduleSchema.statics.findCurrentSchedule = async function (
  date = new Date()
) {
  const schedules = await this.find({ isActive: true });

  for (const schedule of schedules) {
    if (schedule.isWithinSchedule(date)) {
      return schedule;
    }
  }

  return null;
};

module.exports = mongoose.model("MassSchedule", massScheduleSchema);
