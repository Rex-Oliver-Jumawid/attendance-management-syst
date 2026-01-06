require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

async function clearMemberUsernames() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all members (not moderators or admins)
    const members = await User.find({ role: "member" });
    console.log(`\n📊 Found ${members.length} members`);

    let updatedCount = 0;
    let alreadyClearedCount = 0;

    for (const member of members) {
      if (member.username) {
        console.log(
          `\n👤 Clearing username for: ${member.firstName} ${member.lastName}`
        );
        console.log(`   Email: ${member.email}`);
        console.log(`   Current username: ${member.username}`);

        member.username = undefined;
        await member.save();
        updatedCount++;

        console.log(`   ✅ Username cleared`);
      } else {
        alreadyClearedCount++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Updated: ${updatedCount} members`);
    console.log(`   - Already clear: ${alreadyClearedCount} members`);
    console.log(`   - Total members: ${members.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

clearMemberUsernames();
