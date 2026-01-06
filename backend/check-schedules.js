// Check what schedules exist
require("dotenv").config();
const mongoose = require("mongoose");
const MassSchedule = require("./src/models/MassSchedule");

async function checkSchedules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const schedules = await MassSchedule.find();
    console.log(`Found ${schedules.length} schedules:\n`);

    schedules.forEach((schedule) => {
      console.log("---");
      console.log("Name:", schedule.name);
      console.log("Mass Type:", schedule.massType);
      console.log("Schedule Type:", schedule.scheduleType);
      if (schedule.scheduleType === "recurring") {
        console.log("Day of Week:", schedule.dayOfWeek);
      }
      if (schedule.specificDate) {
        console.log("Specific Date:", schedule.specificDate);
      }
      console.log("_id:", schedule._id.toString());
      console.log("");
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkSchedules();
