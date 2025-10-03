import mongoose from 'mongoose';
import StudentAssignment from '../models/StudentAssignment.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juanlms';

async function migrateEnrollmentTypeField() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all student assignments that have the old EnrollmentType field
    const assignmentsWithOldField = await StudentAssignment.find({
      EnrollmentType: { $exists: true }
    });

    console.log(`Found ${assignmentsWithOldField.length} assignments with old EnrollmentType field`);

    let migratedCount = 0;

    for (const assignment of assignmentsWithOldField) {
      // Update the document to use the new field name
      await StudentAssignment.updateOne(
        { _id: assignment._id },
        {
          $set: { enrollmentType: assignment.EnrollmentType },
          $unset: { EnrollmentType: 1 }
        }
      );
      migratedCount++;
      
      if (migratedCount % 100 === 0) {
        console.log(`Migrated ${migratedCount} assignments...`);
      }
    }

    console.log(`✅ Successfully migrated ${migratedCount} student assignments`);
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
migrateEnrollmentTypeField();

