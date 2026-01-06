const mongoose = require("mongoose");
require("dotenv").config();

async function testEmailSending() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const User = require("./src/models/User");
    const emailService = require("./src/services/email.service");

    // Get admin info
    const admin = await User.findOne({ role: "admin" }).select(
      "firstName lastName email emailPassword"
    );

    if (!admin || !admin.emailPassword) {
      console.log("❌ Admin email not configured");
      process.exit(1);
    }

    console.log(`Admin: ${admin.firstName} ${admin.lastName}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Password configured: YES\n`);

    // Get active members
    const members = await User.find({
      role: "member",
      isActive: true,
    }).select("email");

    const memberEmails = members.map((m) => m.email).filter(Boolean);
    console.log(`Found ${memberEmails.length} active members\n`);
    console.log("Member emails:", memberEmails);

    // Create a test schedule object
    const testSchedule = {
      name: "Test Sunday Mass",
      massType: "Regular Sunday Mass",
      scheduleType: "recurring",
      dayOfWeek: [0], // Sunday
      startTime: "08:00 AM",
      endTime: "09:00 AM",
    };

    console.log("\n=== TESTING EMAIL SEND ===");
    console.log("Attempting to send email...\n");

    const adminInfo = {
      name: `${admin.firstName} ${admin.lastName}`,
      email: admin.email,
      password: admin.emailPassword,
    };

    const result = await emailService.sendScheduleAnnouncement(
      testSchedule,
      memberEmails,
      adminInfo
    );

    console.log("\n=== RESULT ===");
    console.log(result);

    await mongoose.connection.close();
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

testEmailSending();
