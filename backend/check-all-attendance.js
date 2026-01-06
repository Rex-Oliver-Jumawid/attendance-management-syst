require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");
const AttendanceRecord = require("./src/models/AttendanceRecord");

async function checkAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const all = await AttendanceRecord.find().populate(
      "userId",
      "firstName lastName"
    );

    console.log(`Total records: ${all.length}\n`);

    all.forEach((record) => {
      const scannedDate = new Date(record.scannedAt);
      console.log("---");
      if (record.userId) {
        console.log("User:", record.userId.firstName, record.userId.lastName);
      }
      console.log("Mass Type:", record.massType);
      console.log("Scanned At:", record.scannedAt);
      console.log("Date:", scannedDate.toDateString());
      console.log(
        "scheduleId:",
        record.scheduleId ? record.scheduleId.toString() : "NULL"
      );
      console.log("");
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkAll();
