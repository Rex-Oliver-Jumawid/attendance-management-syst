// Script to clear all attendance and contribution records linked to schedules
// Usage: node clear-schedule-records.js

require("dotenv").config({
  path: require("path").resolve(__dirname, ".env"),
});
const mongoose = require("mongoose");
const AttendanceRecord = require("./src/models/AttendanceRecord");
const Contribution = require("./src/models/Contribution");

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  try {
    if (!MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not defined. Please check your .env file."
      );
    }
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Delete attendance records with a scheduleId
    const attendanceResult = await AttendanceRecord.deleteMany({
      scheduleId: { $exists: true, $ne: null },
    });
    console.log(
      `Deleted ${attendanceResult.deletedCount} AttendanceRecord(s) with scheduleId.`
    );

    // Delete contribution records with a scheduleId
    const contributionResult = await Contribution.deleteMany({
      scheduleId: { $exists: true, $ne: null },
    });
    console.log(
      `Deleted ${contributionResult.deletedCount} Contribution(s) with scheduleId.`
    );

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("Error clearing schedule-linked records:", err);
    process.exit(1);
  }
}

main();
