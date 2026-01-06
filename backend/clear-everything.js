// Script to clear EVERYTHING from the database including users and schedules
// Usage: node clear-everything.js
// WARNING: This is a complete database reset!

require("dotenv").config({
  path: require("path").resolve(__dirname, ".env"),
});
const mongoose = require("mongoose");
const readline = require("readline");
const User = require("./src/models/User");
const MassSchedule = require("./src/models/MassSchedule");
const ModeratorAssignment = require("./src/models/ModeratorAssignment");
const AttendanceRecord = require("./src/models/AttendanceRecord");
const AttendanceSession = require("./src/models/AttendanceSession");
const Contribution = require("./src/models/Contribution");
const Expense = require("./src/models/Expense");

const MONGODB_URI = process.env.MONGODB_URI;

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  try {
    if (!MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not defined. Please check your .env file."
      );
    }

    console.log("\n🚨 DANGER: This will delete EVERYTHING from the database!");
    console.log("   - ALL Users (including admins and moderators)");
    console.log("   - ALL Mass Schedules");
    console.log("   - ALL Moderator Assignments");
    console.log("   - ALL Attendance Records");
    console.log("   - ALL Attendance Sessions");
    console.log("   - ALL Contributions");
    console.log("   - ALL Expenses\n");

    const answer1 = await askQuestion(
      "Are you ABSOLUTELY sure? Type 'DELETE EVERYTHING' to confirm: "
    );

    if (answer1 !== "DELETE EVERYTHING") {
      console.log("Operation cancelled.");
      rl.close();
      process.exit(0);
    }

    const answer2 = await askQuestion("\nLast chance! Type 'YES' to proceed: ");

    if (answer2.toUpperCase() !== "YES") {
      console.log("Operation cancelled.");
      rl.close();
      process.exit(0);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("\n✓ Connected to MongoDB");

    // Delete in order (relationships first)
    const attendanceRecordResult = await AttendanceRecord.deleteMany({});
    console.log(
      `✓ Deleted ${attendanceRecordResult.deletedCount} attendance record(s)`
    );

    const sessionResult = await AttendanceSession.deleteMany({});
    console.log(
      `✓ Deleted ${sessionResult.deletedCount} attendance session(s)`
    );

    const contributionResult = await Contribution.deleteMany({});
    console.log(`✓ Deleted ${contributionResult.deletedCount} contribution(s)`);

    const expenseResult = await Expense.deleteMany({});
    console.log(`✓ Deleted ${expenseResult.deletedCount} expense(s)`);

    const moderatorAssignmentResult = await ModeratorAssignment.deleteMany({});
    console.log(
      `✓ Deleted ${moderatorAssignmentResult.deletedCount} moderator assignment(s)`
    );

    const scheduleResult = await MassSchedule.deleteMany({});
    console.log(`✓ Deleted ${scheduleResult.deletedCount} mass schedule(s)`);

    const userResult = await User.deleteMany({});
    console.log(`✓ Deleted ${userResult.deletedCount} user(s)`);

    console.log("\n✓ ALL data cleared successfully!");
    console.log(
      "⚠️  Remember to create a new admin user before using the application!\n"
    );

    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB\n");
    rl.close();
    process.exit(0);
  } catch (err) {
    console.error("\n✗ Error clearing database:", err.message);
    rl.close();
    process.exit(1);
  }
}

main();
