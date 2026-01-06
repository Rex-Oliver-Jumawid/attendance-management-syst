const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

console.log("MONGODB_URI:", process.env.MONGODB_URI ? "Found" : "Not found");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    migrateUserRoles();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

async function migrateUserRoles() {
  try {
    const User = mongoose.connection.collection("users");

    // Find all users with role: "user"
    const usersToUpdate = await User.find({ role: "user" }).toArray();
    console.log(`Found ${usersToUpdate.length} users with role: "user"`);

    if (usersToUpdate.length === 0) {
      console.log("No users to migrate!");
      process.exit(0);
    }

    // Update all users with role: "user" to role: "member"
    const result = await User.updateMany(
      { role: "user" },
      { $set: { role: "member" } }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} users`);
    console.log("Migration complete!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}
