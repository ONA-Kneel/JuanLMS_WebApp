// Cleanup script to remove temporary users and their references from classes
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';
import Class from './server/models/Class.js';

// Load environment variables
dotenv.config({ path: './server/config.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juanlms';

async function cleanupTempUsers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('📍 MongoDB URI:', MONGODB_URI ? 'Present' : 'Missing');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    console.log('✅ Connected to MongoDB');

    // Find all temporary users
    console.log('\n🔍 Finding temporary users...');
    const tempUsers = await User.find({
      $or: [
        { userID: { $regex: /^TEMP-/ } },
        { email: { $regex: /@temp\.com$/ } },
        { isTemporary: true }
      ]
    });

    console.log(`📊 Found ${tempUsers.length} temporary users`);

    if (tempUsers.length === 0) {
      console.log('✅ No temporary users found. Database is clean!');
      await mongoose.connection.close();
      return;
    }

    // Show details of temp users
    console.log('\n📝 Temporary users to be removed:');
    tempUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. UserID: ${user.userID}, Email: ${user.email}, Name: ${user.firstname} ${user.lastname}`);
    });

    // Get all temp user IDs for removal
    const tempUserIds = tempUsers.map(user => user._id);
    const tempUserIdStrings = tempUserIds.map(id => String(id));

    // Find classes that have temp users as members
    console.log('\n🔍 Finding classes with temporary users...');
    const classesWithTempUsers = await Class.find({
      members: { $in: tempUserIdStrings }
    });

    console.log(`📊 Found ${classesWithTempUsers.length} classes with temporary users`);

    // Remove temp users from classes
    if (classesWithTempUsers.length > 0) {
      console.log('\n🧹 Removing temporary users from classes...');
      
      for (const classDoc of classesWithTempUsers) {
        const originalMemberCount = classDoc.members.length;
        
        // Filter out temp user IDs from members array
        classDoc.members = classDoc.members.filter(memberId => 
          !tempUserIdStrings.includes(String(memberId)) &&
          !String(memberId).startsWith('TEMP-')
        );
        
        const removedCount = originalMemberCount - classDoc.members.length;
        
        if (removedCount > 0) {
          await classDoc.save();
          console.log(`  ✅ Class "${classDoc.className}" (${classDoc.classID}): Removed ${removedCount} temp user(s), ${classDoc.members.length} members remaining`);
        }
      }
    }

    // Delete temp users from database
    console.log('\n🗑️ Deleting temporary users...');
    const deleteResult = await User.deleteMany({
      $or: [
        { userID: { $regex: /^TEMP-/ } },
        { email: { $regex: /@temp\.com$/ } },
        { isTemporary: true }
      ]
    });

    console.log(`✅ Deleted ${deleteResult.deletedCount} temporary users`);

    console.log('\n✨ Cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Temporary users deleted: ${deleteResult.deletedCount}`);
    console.log(`  - Classes updated: ${classesWithTempUsers.length}`);

    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the cleanup
cleanupTempUsers();

