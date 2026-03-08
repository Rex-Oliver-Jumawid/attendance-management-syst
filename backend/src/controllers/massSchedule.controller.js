const MassSchedule = require("../models/MassSchedule");
const User = require("../models/User");
const AttendanceRecord = require("../models/AttendanceRecord");
const Contribution = require("../models/Contribution");
const emailService = require("../services/email.service");

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

    // Validate end time is after start time
    if (endTime <= startTime) {
      return res.status(400).json({
        success: false,
        message: "End time must be later than start time",
      });
    }

    // Validate specific date is not in the past
    if (scheduleType === "specific" && specificDate) {
      const now = new Date();
      const selected = new Date(specificDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selected.setHours(0, 0, 0, 0);

      if (selected < today) {
        return res.status(400).json({
          success: false,
          message: "Cannot create a schedule for a past date",
        });
      }

      // If the date is today, check if start time has already passed
      if (selected.getTime() === today.getTime()) {
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        if (startTime <= currentTime) {
          return res.status(400).json({
            success: false,
            message:
              "Cannot create a schedule for a time that has already passed today",
          });
        }
      }
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

    // Send email notification to all members (not admins or moderators)
    try {
      // Get the creator's info first; fall back to any admin with emailPassword
      let sender = await User.findById(adminId).select(
        "firstName lastName email emailPassword",
      );
      console.log(
        `[Email Debug] Creator (${adminId}): email=${sender?.email}, hasPassword=${!!sender?.emailPassword}`,
      );

      if (!sender || !sender.emailPassword) {
        sender = await User.findOne({
          role: "admin",
          isActive: true,
          emailPassword: { $exists: true, $nin: [null, ""] },
        }).select("firstName lastName email emailPassword");
        console.log(
          `[Email Debug] Fallback admin: email=${sender?.email}, hasPassword=${!!sender?.emailPassword}`,
        );
      }

      if (sender && sender.email && sender.emailPassword) {
        const members = await User.find({
          role: "member",
          isActive: true,
        }).select("email");

        const memberEmails = members
          .map((member) => member.email)
          .filter(Boolean);

        console.log(
          `[Email Debug] Found ${members.length} members, ${memberEmails.length} with emails`,
        );

        if (memberEmails.length > 0) {
          console.log(
            `Sending schedule announcement to ${memberEmails.length} members from ${sender.email}...`,
          );

          const adminInfo = {
            name: `${sender.firstName} ${sender.lastName}`,
            email: sender.email,
            password: sender.emailPassword,
          };

          const emailResult = await emailService.sendScheduleAnnouncement(
            schedule,
            memberEmails,
            adminInfo,
          );
          console.log("[Email Debug] Email result:", emailResult);
        } else {
          console.log("[Email Debug] No member emails found — skipping");
        }
      } else {
        console.log(
          "[Email Debug] No admin has email configured - skipping email notification. Set a Gmail App Password in Admin Profile settings.",
        );
      }
    } catch (emailError) {
      // Log error but don't fail the schedule creation
      console.error(
        "[Email Debug] Failed to send email notifications:",
        emailError.message,
      );
      console.error("[Email Debug] Full error:", emailError);
    }

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

    // Block deletion if any contribution with amount > 0 exists for this schedule
    const paidContributionCount = await Contribution.countDocuments({
      scheduleId: id,
      amount: { $gt: 0 },
    });

    if (paidContributionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this schedule — it has ${paidContributionCount} contribution record${paidContributionCount > 1 ? "s" : ""} with a paid amount. Clear all contributions first.`,
      });
    }

    // Safe to delete — remove any zero-amount contributions and attendance records
    await Contribution.deleteMany({ scheduleId: id });

    const deletedRecords = await AttendanceRecord.deleteMany({
      scheduleId: id,
    });
    console.log(
      `Deleted ${deletedRecords.deletedCount} attendance records for schedule ${id}`,
    );

    await schedule.deleteOne();

    res.status(200).json({
      success: true,
      message: "Schedule deleted successfully",
      deletedAttendanceRecords: deletedRecords.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting schedule",
      error: error.message,
    });
  }
};

// @desc    Send absence follow-up email to members who didn't attend
// @route   POST /api/admin/mass-schedules/:id/send-absence-followup
// @access  Private (Admin/Moderator)
exports.sendAbsenceFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // Get the schedule
    const schedule = await MassSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // Get all active members
    const allMembers = await User.find({
      role: "member",
      isActive: true,
    }).select("email firstName lastName");

    if (allMembers.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No active members found",
      });
    }

    // Get members who attended this schedule
    const attendanceRecords = await AttendanceRecord.find({
      scheduleId: id,
    }).select("userId");

    const attendedUserIds = attendanceRecords.map((record) =>
      record.userId.toString(),
    );

    // Find members who didn't attend
    const absentMembers = allMembers.filter(
      (member) => !attendedUserIds.includes(member._id.toString()),
    );

    if (absentMembers.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All members attended this schedule",
      });
    }

    const absentMemberEmails = absentMembers
      .map((member) => member.email)
      .filter(Boolean);

    // Get sender info — try current user first, then fall back to any admin with emailPassword
    let sender = await User.findById(adminId).select(
      "firstName lastName email emailPassword",
    );

    if (!sender || !sender.emailPassword) {
      sender = await User.findOne({
        role: "admin",
        isActive: true,
        emailPassword: { $exists: true, $nin: [null, ""] },
      }).select("firstName lastName email emailPassword");
    }

    if (!sender || !sender.email || !sender.emailPassword) {
      return res.status(400).json({
        success: false,
        message:
          "No email configured. An admin must set up a Gmail App Password in Profile settings before emails can be sent.",
      });
    }

    const adminInfo = {
      name: `${sender.firstName} ${sender.lastName}`,
      email: sender.email,
      password: sender.emailPassword,
    };

    // Send the absence follow-up emails
    console.log(
      `Sending absence follow-up to ${absentMemberEmails.length} members for schedule: ${schedule.name}`,
    );

    const result = await emailService.sendAbsenceFollowUp(
      schedule,
      absentMemberEmails,
      adminInfo,
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Absence follow-up email sent to ${absentMemberEmails.length} members`,
        absentCount: absentMembers.length,
        attendedCount: attendedUserIds.length,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || "Failed to send emails",
      });
    }
  } catch (error) {
    console.error("Error sending absence follow-up:", error);
    res.status(500).json({
      success: false,
      message: "Error sending absence follow-up",
      error: error.message,
    });
  }
};
