const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// ─── EDIT THESE ───────────────────────────────────────────────
const ADMIN = {
  username: "Kacchan",
  email: "rogjumawid@mymail.mapua.edu.ph",
  password: "olivero3587", // must be at least 6 characters
  firstName: "Helsinski",
  lastName: "Nakamura",
  phoneNumber: "",
};
// ──────────────────────────────────────────────────────────────

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const users = db.collection("users");

    // Check if email/username already taken
    const existing = await users.findOne({
      $or: [{ email: ADMIN.email }, { username: ADMIN.username }],
    });
    if (existing) {
      console.log("❌ A user with that email or username already exists.");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(ADMIN.password, 10);

    await users.insertOne({
      username: ADMIN.username,
      email: ADMIN.email,
      password: hashedPassword,
      role: "admin",
      firstName: ADMIN.firstName,
      lastName: ADMIN.lastName,
      phoneNumber: ADMIN.phoneNumber,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    });

    console.log("✅ Admin created successfully!");
    console.log(`   Email   : ${ADMIN.email}`);
    console.log(`   Password: ${ADMIN.password}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
