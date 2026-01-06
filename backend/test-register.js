// Quick test to see if member registration works
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

async function testRegister() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Try creating a member
    const testUser = {
      email: `test${Date.now()}@example.com`,
      firstName: "Test",
      lastName: "User",
      phoneNumber: "1234567890",
      role: "member",
      isActive: true,
    };

    console.log("\nAttempting to create user:", testUser);

    const user = await User.create(testUser);
    console.log("\n✓ User created successfully!");
    console.log("User ID:", user._id);
    console.log("QR Code:", user.qrCode ? "Generated" : "NOT generated");
    console.log("QR Image:", user.qrCodeImage ? "Generated" : "NOT generated");

    // Clean up
    await User.findByIdAndDelete(user._id);
    console.log("\n✓ Test user deleted");

    await mongoose.disconnect();
    console.log("✓ Test complete\n");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ ERROR:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

testRegister();
