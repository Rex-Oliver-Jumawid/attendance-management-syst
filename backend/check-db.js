require("dotenv").config();
const mongoose = require("mongoose");
const MassSchedule = require("./src/models/MassSchedule");
const AttendanceRecord = require("./src/models/AttendanceRecord");

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check schedules
    const schedules = await MassSchedule.find({});
    console.log("\n📅 SCHEDULES IN DATABASE:", schedules.length);
    schedules.forEach((schedule, index) => {
      console.log(`\n${index + 1}. ${schedule.name}`);
      console.log(`   ID: ${schedule._id}`);
      console.log(`   Type: ${schedule.scheduleType}`);
      console.log(`   Mass Type: ${schedule.massType}`);
      console.log(`   Active: ${schedule.isActive}`);
      if (schedule.scheduleType === "recurring") {
        console.log(`   Days: ${schedule.dayOfWeek}`);
      } else {
        console.log(`   Date: ${schedule.specificDate}`);
      }
      console.log(`   Time: ${schedule.startTime} - ${schedule.endTime}`);
    });

    // Check today's schedules
    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`\n🔍 TODAY IS: ${today.toDateString()} (Day ${dayOfWeek})`);
    console.log(
      `   Looking for schedules with dayOfWeek=${dayOfWeek} or specificDate between ${todayStart} and ${todayEnd}`
    );

    const todaySchedules = await MassSchedule.find({
      isActive: true,
      $or: [
        {
          scheduleType: "recurring",
          dayOfWeek: dayOfWeek,
        },
        {
          scheduleType: "specific",
          specificDate: {
            $gte: todayStart,
            $lte: todayEnd,
          },
        },
      ],
    });

    console.log(`\n📌 SCHEDULES FOR TODAY: ${todaySchedules.length}`);
    todaySchedules.forEach((schedule) => {
      console.log(`   - ${schedule.name} (${schedule.massType})`);
    });

    // Check attendance records
    const attendanceCount = await AttendanceRecord.countDocuments({});
    console.log(`\n👥 ATTENDANCE RECORDS: ${attendanceCount}`);

    if (attendanceCount > 0) {
      const recentAttendance = await AttendanceRecord.find({})
        .sort({ scannedAt: -1 })
        .limit(5)
        .populate("userId", "firstName lastName")
        .populate("scheduleId", "name");

      console.log("\n   Recent records:");
      recentAttendance.forEach((record, index) => {
        console.log(
          `   ${index + 1}. ${record.userId?.firstName} ${
            record.userId?.lastName
          } - ${record.scheduleId?.name} - ${record.scannedAt}`
        );
      });
    }

    await mongoose.connection.close();
    console.log("\n✅ Database check complete");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDatabase();
