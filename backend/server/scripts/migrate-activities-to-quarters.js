import mongoose from 'mongoose';
import Assignment from '../models/Assignment.js';
import Quiz from '../models/Quiz.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../config.env' });

const migrateActivitiesToQuarters = async () => {
  try {
    console.log('🔄 Starting migration of activities to quarters...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get current academic year (you can modify this as needed)
    const currentAcademicYear = '2024-2025';
    
    // Migrate Assignments
    console.log('🔄 Migrating Assignments...');
    const assignmentResult = await Assignment.updateMany(
      { 
        quarter: { $exists: false } 
      },
      { 
        $set: { 
          quarter: 'Q1',
          termName: 'Term 1',
          academicYear: currentAcademicYear
        }
      }
    );
    console.log(`✅ Updated ${assignmentResult.modifiedCount} assignments`);

    // Migrate Quizzes
    console.log('🔄 Migrating Quizzes...');
    const quizResult = await Quiz.updateMany(
      { 
        quarter: { $exists: false } 
      },
      { 
        $set: { 
          quarter: 'Q1',
          termName: 'Term 1',
          academicYear: currentAcademicYear
        }
      }
    );
    console.log(`✅ Updated ${quizResult.modifiedCount} quizzes`);

    // Verify migration
    const totalAssignments = await Assignment.countDocuments();
    const totalQuizzes = await Quiz.countDocuments();
    const assignmentsWithQuarter = await Assignment.countDocuments({ quarter: { $exists: true } });
    const quizzesWithQuarter = await Quiz.countDocuments({ quarter: { $exists: true } });

    console.log('\n📊 Migration Summary:');
    console.log(`Total Assignments: ${totalAssignments}`);
    console.log(`Assignments with Quarter: ${assignmentsWithQuarter}`);
    console.log(`Total Quizzes: ${totalQuizzes}`);
    console.log(`Quizzes with Quarter: ${quizzesWithQuarter}`);

    if (assignmentsWithQuarter === totalAssignments && quizzesWithQuarter === totalQuizzes) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️  Migration may have issues. Please check the data.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run migration
migrateActivitiesToQuarters();
