require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");
const AttendanceRecord = require("./src/models/AttendanceRecord");

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected\n");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await AttendanceRecord.find({
      scannedAt: { $gte: today }
    }).populate('userId', 'firstName lastName email');

    console.log(`Found ${records.length} records`);
    
    records.forEach((rec, i) => {
      console.log(`\nRecord ${i + 1}:`);
      console.log("  userId:", rec.userId ? rec.userId._id.toString() : null);
      console.log("  massType:", rec.massType);
      console.log("  scheduleId in doc:", rec.scheduleId);
      console.log("  scheduleId toString:", rec.scheduleId ? rec.scheduleId.toString() : "null");
      
      // Test toJSON/toObject
      const obj = rec.toObject();
      console.log("  scheduleId in toObject():", obj.scheduleId);
      
      const json = rec.toJSON();
      console.log("  scheduleId in toJSON():", json.scheduleId);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

test();
