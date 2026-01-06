const mongoose = require("mongoose");
require("dotenv").config();

async function testAbsenceFollowUp() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const User = require("./src/models/User");
    const MassSchedule = require("./src/models/MassSchedule");
    const AttendanceRecord = require("./src/models/AttendanceRecord");

    // Get all members
    const allMembers = await User.find({
      role: "member",
      isActive: true,
    }).select("email firstName lastName");

    console.log(`Total Active Members: ${allMembers.length}`);
    allMembers.forEach((m, i) => {
      console.log(`${i + 1}. ${m.firstName} ${m.lastName} - ${m.email}`);
    });

    // Get a schedule (use the first one)
    const schedule = await MassSchedule.findOne().sort({ createdAt: -1 });

    if (!schedule) {
      console.log("\n❌ No schedules found in database");
      process.exit(1);
    }

    console.log(`\n=== CHECKING SCHEDULE ===`);
    console.log(`Schedule: ${schedule.name}`);
    console.log(`Schedule ID: ${schedule._id}`);

    // Get attendance records for this schedule
    const attendanceRecords = await AttendanceRecord.find({
      scheduleId: schedule._id,
    })
      .populate("userId", "firstName lastName email")
      .select("userId");

    console.log(`\n=== ATTENDANCE ===`);
    console.log(`Total Attended: ${attendanceRecords.length}`);
    attendanceRecords.forEach((record, i) => {
      if (record.userId) {
        console.log(
          `${i + 1}. ${record.userId.firstName} ${record.userId.lastName}`
        );
      }
    });

    // Calculate absent members
    const attendedUserIds = attendanceRecords
      .map((r) => r.userId?._id.toString())
      .filter(Boolean);
    const absentMembers = allMembers.filter(
      (member) => !attendedUserIds.includes(member._id.toString())
    );

    console.log(`\n=== ABSENT MEMBERS ===`);
    console.log(`Total Absent: ${absentMembers.length}`);
    absentMembers.forEach((m, i) => {
      console.log(`${i + 1}. ${m.firstName} ${m.lastName} - ${m.email}`);
    });

    if (absentMembers.length > 0) {
      console.log(
        `\n✅ Ready to send absence follow-up to ${absentMembers.length} member(s)`
      );
      console.log(
        `\nTo test, go to Admin or Moderator dashboard and click "Email Absent Members" on an expired schedule.`
      );
    } else {
      console.log(`\n⚠️  All members attended - no absent members to email`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    process.exit(1);
  }
}

testAbsenceFollowUp();
