require("dotenv").config();
const mongoose = require("mongoose");
const AttendanceRecord = require("./src/models/AttendanceRecord");

async function checkFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const records = await AttendanceRecord.find().limit(5);
    console.log(`Found ${records.length} records\n`);

    records.forEach((record, i) => {
      console.log(`Record ${i + 1}:`);
      console.log("  scheduleId:", record.scheduleId);
      console.log("  massType:", record.massType);
      console.log("  scannedAt:", record.scannedAt);
      console.log("");
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkFields();
