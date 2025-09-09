// Migration script to add activityType field to existing assignments and quizzes
import mongoose from 'mongoose';
import Assignment from '../models/Assignment.js';
import Quiz from '../models/Quiz.js';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juanlms';

async function migrateActivityTypes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update assignments that don't have activityType
    const assignmentResult = await Assignment.updateMany(
      { activityType: { $exists: false } },
      { $set: { activityType: 'written' } }
    );
    console.log(`Updated ${assignmentResult.modifiedCount} assignments with default activityType: written`);

    // Update quizzes that don't have activityType
    const quizResult = await Quiz.updateMany(
      { activityType: { $exists: false } },
      { $set: { activityType: 'written' } }
    );
    console.log(`Updated ${quizResult.modifiedCount} quizzes with default activityType: written`);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateActivityTypes();

