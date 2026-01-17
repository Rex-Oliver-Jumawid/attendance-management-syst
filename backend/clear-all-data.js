const mongoose = require("mongoose");
require("dotenv").config();

const AttendanceRecord = require("./src/models/AttendanceRecord");
const Contribution = require("./src/models/Contribution");
const Expense = require("./src/models/Expense");

async function clearAllData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Delete all attendance records
    const attendanceResult = await AttendanceRecord.deleteMany({});
    console.log(
      `✓ Deleted ${attendanceResult.deletedCount} attendance records`,
    );

    // Delete all contributions
    const contributionResult = await Contribution.deleteMany({});
    console.log(`✓ Deleted ${contributionResult.deletedCount} contributions`);

    // Delete all expenses
    const expenseResult = await Expense.deleteMany({});
    console.log(`✓ Deleted ${expenseResult.deletedCount} expenses`);

    console.log("\n✅ All data cleared successfully!");
    console.log("Note: Users and schedules were NOT deleted.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

clearAllData();
