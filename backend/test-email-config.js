const mongoose = require("mongoose");
require("dotenv").config();

async function checkEmailConfig() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const User = require("./src/models/User");

    // Check admin email configuration
    console.log("=== CHECKING ADMIN EMAIL CONFIG ===");
    const admins = await User.find({ role: "admin" }).select(
      "email firstName lastName emailPassword"
    );

    admins.forEach((admin) => {
      console.log(`\nAdmin: ${admin.firstName} ${admin.lastName}`);
      console.log(`Email: ${admin.email}`);
      console.log(
        `Email Password Configured: ${admin.emailPassword ? "✅ YES" : "❌ NO"}`
      );
      if (admin.emailPassword) {
        console.log(
          `Password Length: ${admin.emailPassword.length} characters`
        );
      }
    });

    // Check for active members
    console.log("\n\n=== CHECKING ACTIVE MEMBERS ===");
    const members = await User.find({ role: "member", isActive: true }).select(
      "email firstName lastName"
    );

    console.log(`Total Active Members: ${members.length}`);

    if (members.length > 0) {
      console.log("\nMember Emails:");
      members.forEach((member, i) => {
        console.log(
          `${i + 1}. ${member.firstName} ${member.lastName} - ${member.email}`
        );
      });
    } else {
      console.log("❌ No active members found - emails won't be sent!");
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkEmailConfig();
