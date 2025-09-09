// Script to check the actual database state of activities
import mongoose from 'mongoose';
import Assignment from '../models/Assignment.js';
import Quiz from '../models/Quiz.js';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juanlms';

async function checkActivities() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the testv4 activity
    const testv4Assignment = await Assignment.findOne({ title: 'testv4' });
    if (testv4Assignment) {
      console.log('Found testv4 assignment:');
      console.log('Title:', testv4Assignment.title);
      console.log('Type:', testv4Assignment.type);
      console.log('ActivityType:', testv4Assignment.activityType);
      console.log('CreatedAt:', testv4Assignment.createdAt);
      console.log('Full document:', JSON.stringify(testv4Assignment, null, 2));
    } else {
      console.log('testv4 assignment not found in Assignment collection');
    }

    // Check all recent assignments
    const recentAssignments = await Assignment.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\nRecent assignments:');
    recentAssignments.forEach(assignment => {
      console.log(`- ${assignment.title}: activityType = ${assignment.activityType || 'undefined'}`);
    });

    // Check all recent quizzes
    const recentQuizzes = await Quiz.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\nRecent quizzes:');
    recentQuizzes.forEach(quiz => {
      console.log(`- ${quiz.title}: activityType = ${quiz.activityType || 'undefined'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the check
checkActivities();

