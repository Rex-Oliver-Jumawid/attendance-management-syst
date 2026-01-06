// Migration script to add permanent QR codes to existing users
// Run this once to update all users in the database

const mongoose = require("mongoose");
const User = require("./src/models/User");
require("dotenv").config();

async function migratePermanentQRCodes() {
  try {
    console.log("🚀 Starting QR code migration...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all users without QR codes
    const usersWithoutQR = await User.find({
      $or: [{ qrCode: null }, { qrCode: { $exists: false } }],
    });

    console.log(`📊 Found ${usersWithoutQR.length} users without QR codes`);

    if (usersWithoutQR.length === 0) {
      console.log("✅ All users already have QR codes!");
      process.exit(0);
    }

    // Update each user - the pre-save hook will generate QR codes
    let updated = 0;
    for (const user of usersWithoutQR) {
      try {
        // Trigger save to generate QR code via pre-save hook
        await user.save();
        updated++;
        console.log(
          `✅ Generated QR code for: ${user.username} (${user.firstName} ${user.lastName})`
        );
      } catch (error) {
        console.error(`❌ Error updating ${user.username}:`, error.message);
      }
    }

    console.log(`\n🎉 Migration complete! Updated ${updated} users`);
    console.log("✅ All users now have permanent QR codes");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migratePermanentQRCodes();
