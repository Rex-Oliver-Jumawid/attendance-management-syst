require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");
const AttendanceRecord = require("./src/models/AttendanceRecord");

async function checkToday() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log("Current time:", now);
    console.log("Start of today:", startOfToday);
    console.log("");

    const todayRecords = await AttendanceRecord.find({
      scannedAt: { $gte: startOfToday }
    }).populate('userId', 'firstName lastName');
    
    console.log(`Today's records: ${todayRecords.length}\n`);

    todayRecords.forEach(record => {
      console.log("---");
      if (record.userId) {
        console.log("User:", record.userId.firstName, record.userId.lastName);
      }
      console.log("Mass Type:", record.massType);
      console.log("Scanned At:", record.scannedAt);
      console.log("scheduleId:", record.scheduleId ? record.scheduleId.toString() : "NULL");
      console.log("");
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkToday();
