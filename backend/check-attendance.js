// Check attendance records
require("dotenv").config();
const mongoose = require("mongoose");
const AttendanceRecord = require("./src/models/AttendanceRecord");

async function checkAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const records = await AttendanceRecord.find({
      $or: [{ scheduleId: { $exists: false } }, { scheduleId: null }],
    });

    console.log(`Found ${records.length} records without scheduleId:\n`);

    records.forEach((record) => {
      const scannedDate = new Date(record.scannedAt);
      console.log("---");
      console.log("Mass Type:", record.massType);
      console.log("Scanned At:", record.scannedAt);
      console.log("Date only:", scannedDate.toDateString());
      console.log("Day of Week:", scannedDate.getDay());
      console.log("_id:", record._id.toString());
      console.log("");
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkAttendance();
