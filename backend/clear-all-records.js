// Script to clear all records from the database (keeps users and schedules)
// Usage: node clear-all-records.js
// This will clear: attendance records, contributions, expenses, sessions

require("dotenv").config({
  path: require("path").resolve(__dirname, ".env"),
});
const mongoose = require("mongoose");
const readline = require("readline");
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

    console.log(
      "\n⚠️  WARNING: This will delete ALL records from the database!"
    );
    console.log("   - Attendance Records");
    console.log("   - Attendance Sessions");
    console.log("   - Contributions");
    console.log("   - Expenses");
    console.log("\nThis will NOT delete:");
    console.log("   - Users");
    console.log("   - Mass Schedules");
    console.log("   - Moderator Assignments\n");

    const answer = await askQuestion(
      "Are you sure you want to continue? (yes/no): "
    );

    if (answer.toLowerCase() !== "yes") {
      console.log("Operation cancelled.");
      rl.close();
      process.exit(0);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("\n✓ Connected to MongoDB");

    // Delete attendance records
    const attendanceResult = await AttendanceRecord.deleteMany({});
    console.log(
      `✓ Deleted ${attendanceResult.deletedCount} attendance record(s)`
    );

    // Delete attendance sessions
    const sessionResult = await AttendanceSession.deleteMany({});
    console.log(
      `✓ Deleted ${sessionResult.deletedCount} attendance session(s)`
    );

    // Delete contributions
    const contributionResult = await Contribution.deleteMany({});
    console.log(`✓ Deleted ${contributionResult.deletedCount} contribution(s)`);

    // Delete expenses
    const expenseResult = await Expense.deleteMany({});
    console.log(`✓ Deleted ${expenseResult.deletedCount} expense(s)`);

    console.log("\n✓ All records cleared successfully!");

    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB\n");
    rl.close();
    process.exit(0);
  } catch (err) {
    console.error("\n✗ Error clearing records:", err.message);
    rl.close();
    process.exit(1);
  }
}

main();
