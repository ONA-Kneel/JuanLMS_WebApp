/**
 * Cleanup Script: Move Quiz 1 to Completed Status
 * 
 * This script finds "Quiz 1" in the database and creates a quiz response
 * to mark it as completed for the current user, moving it from "Upcoming" to "Completed" tab.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Quiz from './models/Quiz.js';
import QuizResponse from './models/QuizResponse.js';
import User from './models/User.js';

dotenv.config({ path: './config.env' });

async function cleanupQuiz1() {
  try {
    console.log('🔍 Starting Quiz 1 cleanup process...\n');
    
    // Connect to database
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB via Mongoose');
    
    // Step 1: Find Quiz 1
    console.log('\n📋 Step 1: Finding Quiz 1...');
    const quiz1 = await Quiz.findOne({ 
      title: { $regex: /^Quiz 1/i } 
    });
    
    if (!quiz1) {
      console.log('❌ Quiz 1 not found in database');
      console.log('Available quizzes:');
      const allQuizzes = await Quiz.find({});
      allQuizzes.forEach(quiz => {
        console.log(`  - ${quiz.title} (ID: ${quiz._id})`);
      });
      return;
    }
    
    console.log(`✅ Found Quiz 1: "${quiz1.title}"`);
    console.log(`   Quiz ID: ${quiz1._id}`);
    console.log(`   Class ID: ${quiz1.assignedTo?.[0]?.classID || 'N/A'}`);
    console.log(`   Questions: ${quiz1.questions?.length || 0}`);
    console.log(`   Total Points: ${quiz1.points || 0}`);
    
    // Step 2: Get student information
    console.log('\n👤 Step 2: Getting student information...');
    
    // You can modify this to target a specific student
    // For now, we'll get the first student assigned to this quiz
    const assignedStudents = quiz1.assignedTo?.[0]?.studentIDs || [];
    if (assignedStudents.length === 0) {
      console.log('❌ No students assigned to Quiz 1');
      return;
    }
    
    console.log(`📝 Students assigned to Quiz 1: ${assignedStudents.length}`);
    assignedStudents.forEach((studentId, index) => {
      console.log(`   ${index + 1}. ${studentId}`);
    });
    
    // Get the first student's details
    const firstStudentId = assignedStudents[0];
    const student = await User.findOne({ 
      userID: firstStudentId
    });
    
    if (!student) {
      console.log(`❌ Student not found: ${firstStudentId}`);
      return;
    }
    
    console.log(`✅ Found student: ${student.firstName} ${student.lastName} (${student.userID})`);
    console.log(`   Student ObjectId: ${student._id}`);
    
    // Step 3: Check if quiz response already exists
    console.log('\n🔍 Step 3: Checking for existing quiz response...');
    const existingResponse = await QuizResponse.findOne({
      quizId: quiz1._id,
      studentId: student._id
    });
    
    if (existingResponse) {
      console.log('⚠️  Quiz response already exists!');
      console.log(`   Response ID: ${existingResponse._id}`);
      console.log(`   Submitted: ${existingResponse.submittedAt}`);
      console.log(`   Score: ${existingResponse.score || 'Not graded'}`);
      console.log('\n🔄 Updating existing response...');
      
      // Update the existing response to ensure it's marked as completed
      const updateResult = await QuizResponse.updateOne(
        { _id: existingResponse._id },
        {
          $set: {
            submittedAt: new Date(),
            graded: true,
            score: existingResponse.score || 85, // Default score if not set
            updatedAt: new Date()
          }
        }
      );
      
      if (updateResult.modifiedCount > 0) {
        console.log('✅ Existing quiz response updated successfully');
      } else {
        console.log('ℹ️  No changes needed to existing response');
      }
    } else {
      console.log('📝 No existing response found, creating new one...');
      
      // Step 4: Create quiz response with sample answers
      console.log('\n📝 Step 4: Creating quiz response...');
      
      // Generate sample answers based on quiz questions
      const answers = [];
      const checkedAnswers = [];
      let totalScore = 0;
      
      if (quiz1.questions && quiz1.questions.length > 0) {
        quiz1.questions.forEach((question, index) => {
          let studentAnswer;
          let correct = false;
          
          // Generate appropriate answer based on question type
          if (question.type === 'multiple') {
            // For multiple choice, randomly select an answer (or use correct one)
            const correctIndex = question.correctAnswers?.[0] || 0;
            studentAnswer = correctIndex;
            correct = true; // Mark as correct for cleanup purposes
          } else if (question.type === 'truefalse') {
            // For true/false, use the correct answer
            studentAnswer = question.correctAnswer;
            correct = true;
          } else if (question.type === 'identification') {
            // For identification, use a sample answer
            studentAnswer = question.correctAnswer || 'Sample Answer';
            correct = true;
          }
          
          answers.push({
            questionId: question._id || new mongoose.Types.ObjectId(),
            answer: studentAnswer
          });
          
          checkedAnswers.push({
            correct: correct,
            studentAnswer: studentAnswer,
            correctAnswer: question.correctAnswer || question.correctAnswers
          });
          
          if (correct) {
            totalScore += question.points || 1;
          }
        });
      }
      
      // Create the quiz response
      const quizResponse = {
        quizId: quiz1._id,
        studentId: student._id,
        answers: answers,
        submittedAt: new Date(),
        graded: true,
        score: totalScore,
        checkedAnswers: checkedAnswers,
        violationCount: 0,
        violationEvents: [],
        questionTimes: new Array(quiz1.questions?.length || 0).fill(30), // 30 seconds per question
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const insertResult = await QuizResponse.create(quizResponse);
      
      if (insertResult._id) {
        console.log('✅ Quiz response created successfully!');
        console.log(`   Response ID: ${insertResult._id}`);
        console.log(`   Score: ${totalScore}/${quiz1.points}`);
        console.log(`   Questions answered: ${answers.length}`);
      } else {
        console.log('❌ Failed to create quiz response');
        return;
      }
    }
    
    // Step 5: Verify the cleanup
    console.log('\n✅ Step 5: Verifying cleanup...');
    const finalResponse = await QuizResponse.findOne({
      quizId: quiz1._id,
      studentId: student._id
    });
    
    if (finalResponse) {
      console.log('🎉 Quiz 1 cleanup completed successfully!');
      console.log(`   Quiz: "${quiz1.title}"`);
      console.log(`   Student: ${student.firstName} ${student.lastName}`);
      console.log(`   Status: Completed`);
      console.log(`   Score: ${finalResponse.score}/${quiz1.points}`);
      console.log(`   Submitted: ${finalResponse.submittedAt}`);
      
      console.log('\n📱 Next Steps:');
      console.log('1. Refresh your web app');
      console.log('2. Go to Student Activities');
      console.log('3. Check the "Completed" tab');
      console.log('4. Quiz 1 should now appear there!');
    } else {
      console.log('❌ Verification failed - quiz response not found');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the cleanup
console.log('🚀 Quiz 1 Cleanup Script');
console.log('========================\n');

cleanupQuiz1()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
