const MassSchedule = require("../models/MassSchedule");

// @desc    Create mass schedule
// @route   POST /api/admin/mass-schedules
// @access  Private (Admin)
exports.createSchedule = async (req, res) => {
  try {
    const {
      name,
      massType,
      scheduleType,
      dayOfWeek,
      specificDate,
      startTime,
      endTime,
      isActive,
    } = req.body;
    const adminId = req.user.id;

    // Basic validation
    if (!name || !massType || !scheduleType || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message:
          "Name, mass type, schedule type, start time, and end time are required",
      });
    }

    // Validate schedule type specific requirements
    if (
      scheduleType === "recurring" &&
      (!dayOfWeek || dayOfWeek.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Day of week is required for recurring schedules",
      });
    }

    if (scheduleType === "specific" && !specificDate) {
      return res.status(400).json({
        success: false,
        message: "Specific date is required for specific date schedules",
      });
    }

    const scheduleData = {
      name,
      massType,
      scheduleType,
      startTime,
      endTime,
      createdBy: adminId,
      isActive: isActive !== undefined ? isActive : true,
    };

    // Add schedule type specific fields
    if (scheduleType === "recurring") {
      scheduleData.dayOfWeek = dayOfWeek;
    } else {
      scheduleData.specificDate = specificDate;
      scheduleData.dayOfWeek = []; // Empty array for specific dates
    }

    const schedule = await MassSchedule.create(scheduleData);

    res.status(201).json({
      success: true,
      message: "Mass schedule created successfully",
      schedule,
    });
  } catch (error) {
    console.error("Create schedule error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating mass schedule",
      error: error.message,
    });
  }
};

// @desc    Get all mass schedules
// @route   GET /api/admin/mass-schedules
// @access  Private (Admin/Moderator)
exports.getAllSchedules = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = active !== undefined ? { isActive: active === "true" } : {};

    const schedules = await MassSchedule.find(filter)
      .populate("createdBy", "firstName lastName username")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      schedules,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching schedules",
      error: error.message,
    });
  }
};

// @desc    Get current active schedule
// @route   GET /api/mass-schedules/current
// @access  Public
exports.getCurrentSchedule = async (req, res) => {
  try {
    const schedule = await MassSchedule.findCurrentSchedule();

    if (!schedule) {
      return res.status(200).json({
        success: true,
        schedule: null,
        message: "No active schedule found for current time",
      });
    }

    res.status(200).json({
      success: true,
      schedule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching current schedule",
      error: error.message,
    });
  }
};

// @desc    Update mass schedule
// @route   PUT /api/admin/mass-schedules/:id
// @access  Private (Admin)
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      massType,
      scheduleType,
      dayOfWeek,
      specificDate,
      startTime,
      endTime,
      isActive,
    } = req.body;

    const schedule = await MassSchedule.findById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // Update fields
    if (name) schedule.name = name;
    if (massType) schedule.massType = massType;
    if (scheduleType) schedule.scheduleType = scheduleType;
    if (startTime) schedule.startTime = startTime;
    if (endTime) schedule.endTime = endTime;
    if (isActive !== undefined) schedule.isActive = isActive;

    // Update schedule type specific fields
    if (scheduleType === "recurring" && dayOfWeek) {
      schedule.dayOfWeek = dayOfWeek;
      schedule.specificDate = undefined;
    } else if (scheduleType === "specific" && specificDate) {
      schedule.specificDate = specificDate;
      schedule.dayOfWeek = [];
    }

    await schedule.save();

    res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      schedule,
    });
  } catch (error) {
    console.error("Update schedule error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating schedule",
      error: error.message,
    });
  }
};

// @desc    Delete mass schedule
// @route   DELETE /api/admin/mass-schedules/:id
// @access  Private (Admin)
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await MassSchedule.findById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    await schedule.deleteOne();

    res.status(200).json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting schedule",
      error: error.message,
    });
  }
};
