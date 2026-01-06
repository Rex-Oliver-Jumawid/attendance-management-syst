// Fix the username index issue
require("dotenv").config();
const mongoose = require("mongoose");

async function fixUsernameIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    // List current indexes
    console.log("\nCurrent indexes:");
    const indexes = await collection.indexes();
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    // Drop the username_1 index if it exists
    try {
      await collection.dropIndex("username_1");
      console.log("\n✓ Dropped username_1 index");
    } catch (err) {
      console.log("\n⚠ username_1 index doesn't exist or already dropped");
    }

    // Create new sparse unique index
    await collection.createIndex(
      { username: 1 },
      { unique: true, sparse: true }
    );
    console.log("✓ Created new sparse unique index on username");

    // Verify new indexes
    console.log("\nNew indexes:");
    const newIndexes = await collection.indexes();
    newIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    await mongoose.disconnect();
    console.log("\n✓ Index fixed successfully!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Error:", error.message);
    process.exit(1);
  }
}

fixUsernameIndex();
