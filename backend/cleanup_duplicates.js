import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StudentAssignment from './server/models/StudentAssignment.js';

dotenv.config({ path: './server/config.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/JuanLMS';

async function cleanupDuplicates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('🔍 Looking for duplicate student assignments...');

    // Find duplicates based on studentSchoolID, schoolYear, termName, quarterName
    const duplicates = await StudentAssignment.aggregate([
      {
        $match: {
          studentSchoolID: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            studentSchoolID: '$studentSchoolID',
            schoolYear: '$schoolYear',
            termName: '$termName',
            quarterName: '$quarterName'
          },
          count: { $sum: 1 },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`Found ${duplicates.length} groups of duplicate student assignments`);

    let totalDeleted = 0;

    for (const duplicate of duplicates) {
      console.log(`\n🔍 Processing duplicates for student ${duplicate._id.studentSchoolID} in ${duplicate._id.quarterName}`);
      
      // Sort by creation date, keep the earliest one
      const sortedDocs = duplicate.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const keepDoc = sortedDocs[0];
      const deleteDocs = sortedDocs.slice(1);

      console.log(`  Keeping: ${keepDoc._id} (created: ${keepDoc.createdAt})`);
      console.log(`  Deleting: ${deleteDocs.length} duplicates`);

      for (const doc of deleteDocs) {
        await StudentAssignment.findByIdAndDelete(doc._id);
        totalDeleted++;
        console.log(`    ✅ Deleted: ${doc._id}`);
      }
    }

    console.log(`\n🎉 Cleanup completed! Deleted ${totalDeleted} duplicate student assignments.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanupDuplicates();
