// Script to debug database connection and collections
import mongoose from 'mongoose';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juanlms';

async function debugDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log('Database name:', mongoose.connection.db.databaseName);

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    // Check Assignments collection specifically
    const assignmentsCollection = mongoose.connection.db.collection('Assignments');
    const assignmentCount = await assignmentsCollection.countDocuments();
    console.log(`\nAssignments collection count: ${assignmentCount}`);

    if (assignmentCount > 0) {
      const sampleAssignments = await assignmentsCollection.find({}).limit(3).toArray();
      console.log('\nSample assignments:');
      sampleAssignments.forEach(assignment => {
        console.log(`- Title: ${assignment.title}, ActivityType: ${assignment.activityType || 'undefined'}`);
      });
    }

    // Check Quizzes collection specifically
    const quizzesCollection = mongoose.connection.db.collection('Quizzes');
    const quizCount = await quizzesCollection.countDocuments();
    console.log(`\nQuizzes collection count: ${quizCount}`);

    if (quizCount > 0) {
      const sampleQuizzes = await quizzesCollection.find({}).limit(3).toArray();
      console.log('\nSample quizzes:');
      sampleQuizzes.forEach(quiz => {
        console.log(`- Title: ${quiz.title}, ActivityType: ${quiz.activityType || 'undefined'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the debug
debugDatabase();

