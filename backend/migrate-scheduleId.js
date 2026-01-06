// Migration script to add scheduleId to existing attendance records
require("dotenv").config();
const mongoose = require("mongoose");
const AttendanceRecord = require("./src/models/AttendanceRecord");
const MassSchedule = require("./src/models/MassSchedule");

async function migrateScheduleIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Get all attendance records without scheduleId
    const recordsWithoutSchedule = await AttendanceRecord.find({
      $or: [{ scheduleId: { $exists: false } }, { scheduleId: null }],
    });

    console.log(
      `Found ${recordsWithoutSchedule.length} records without scheduleId\n`
    );

    if (recordsWithoutSchedule.length === 0) {
      console.log("✓ All records already have scheduleId!");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Get all schedules
    const schedules = await MassSchedule.find();
    console.log(`Found ${schedules.length} schedules\n`);

    let updatedCount = 0;

    // For each record, find matching schedule by massType
    for (const record of recordsWithoutSchedule) {
      const scannedDate = new Date(record.scannedAt);
      const dayOfWeek = scannedDate.getDay();

      // Find matching schedule by massType and day
      const matchingSchedule = schedules.find((schedule) => {
        if (schedule.massType !== record.massType) return false;

        if (schedule.scheduleType === "recurring") {
          // Match by day of week
          return schedule.dayOfWeek === dayOfWeek;
        } else if (
          schedule.scheduleType === "specific" &&
          schedule.specificDate
        ) {
          // Match by specific date
          const scheduleDate = new Date(schedule.specificDate);
          return scheduleDate.toDateString() === scannedDate.toDateString();
        }

        return false;
      });

      if (matchingSchedule) {
        record.scheduleId = matchingSchedule._id;
        await record.save();
        updatedCount++;
        console.log(
          `✓ Updated record ${record._id} -> schedule ${matchingSchedule.name}`
        );
      } else {
        console.log(
          `⚠ No matching schedule found for record ${record._id} (${record.massType})`
        );
      }
    }

    console.log(`\n✓ Migration complete! Updated ${updatedCount} records`);

    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB\n");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Error:", error.message);
    process.exit(1);
  }
}

migrateScheduleIds();
