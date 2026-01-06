// Script to clear all MassSchedule records from the database
// Usage: node clear-schedules.js

require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
const mongoose = require("mongoose");
const MassSchedule = require("./src/models/MassSchedule");

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  try {
    if (!MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not defined. Please check your .env file."
      );
    }

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const result = await MassSchedule.deleteMany({});
    console.log(`Deleted ${result.deletedCount} MassSchedule records.`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("Error clearing MassSchedule records:", err);
    process.exit(1);
  }
}

main();
