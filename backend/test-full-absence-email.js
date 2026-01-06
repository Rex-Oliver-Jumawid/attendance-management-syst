const mongoose = require("mongoose");
require("dotenv").config();

async function testFullEmailFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const User = require("./src/models/User");
    const MassSchedule = require("./src/models/MassSchedule");
    const emailService = require("./src/services/email.service");

    // Get admin
    const admin = await User.findOne({ role: "admin" }).select(
      "firstName lastName email emailPassword"
    );

    if (!admin || !admin.emailPassword) {
      console.log("❌ Admin email not configured");
      process.exit(1);
    }

    console.log("=== ADMIN INFO ===");
    console.log(`Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Password Configured: YES\n`);

    // Get a schedule
    const schedule = await MassSchedule.findOne().sort({ createdAt: -1 });
    if (!schedule) {
      console.log("❌ No schedules found");
      process.exit(1);
    }

    console.log("=== SCHEDULE INFO ===");
    console.log(`Name: ${schedule.name}`);
    console.log(`Type: ${schedule.massType}`);
    console.log(`Time: ${schedule.startTime} - ${schedule.endTime}\n`);

    // Get absent members (members who didn't attend)
    const allMembers = await User.find({
      role: "member",
      isActive: true,
    }).select("email firstName lastName");

    const AttendanceRecord = require("./src/models/AttendanceRecord");
    const attendanceRecords = await AttendanceRecord.find({
      scheduleId: schedule._id,
    }).select("userId");

    const attendedUserIds = attendanceRecords.map((r) => r.userId.toString());
    const absentMembers = allMembers.filter(
      (m) => !attendedUserIds.includes(m._id.toString())
    );

    console.log("=== MEMBERS STATUS ===");
    console.log(`Total Members: ${allMembers.length}`);
    console.log(`Attended: ${attendedUserIds.length}`);
    console.log(`Absent: ${absentMembers.length}\n`);

    if (absentMembers.length === 0) {
      console.log("✅ All members attended - no emails to send");
      process.exit(0);
    }

    const absentEmails = absentMembers.map((m) => m.email).filter(Boolean);
    console.log("Absent Members:");
    absentMembers.forEach((m, i) => {
      console.log(`${i + 1}. ${m.firstName} ${m.lastName} - ${m.email}`);
    });

    console.log("\n=== SENDING ABSENCE FOLLOW-UP EMAIL ===");
    console.log("Attempting to send...\n");

    const adminInfo = {
      name: `${admin.firstName} ${admin.lastName}`,
      email: admin.email,
      password: admin.emailPassword,
    };

    const result = await emailService.sendAbsenceFollowUp(
      schedule,
      absentEmails,
      adminInfo
    );

    console.log("\n=== RESULT ===");
    if (result.success) {
      console.log("✅ SUCCESS!");
      console.log(`Message ID: ${result.messageId}`);
      console.log(`Emails sent to ${absentEmails.length} member(s)`);
      console.log(
        "\nCheck the member email inboxes for the absence follow-up!"
      );
    } else {
      console.log("❌ FAILED!");
      console.log(`Error: ${result.message}`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error);
    process.exit(1);
  }
}

testFullEmailFlow();
