// Script to check Philosophy class in database
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

// Import models
import Class from './server/models/Class.js';
import FacultyAssignment from './server/models/FacultyAssignment.js';
import User from './server/models/User.js';

async function checkPhilosophyClass() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('Connected to MongoDB');

    // Search for Philosophy class
    const philosophyClasses = await Class.find({
      className: { $regex: /Philosophy/i }
    });

    console.log(`Found ${philosophyClasses.length} Philosophy classes:`);
    
    for (const cls of philosophyClasses) {
      console.log('\n--- Philosophy Class Details ---');
      console.log('Class ID:', cls.classID);
      console.log('Class Name:', cls.className);
      console.log('Faculty ID:', cls.facultyID);
      console.log('Section:', cls.section);
      console.log('Academic Year:', cls.academicYear);
      console.log('Term Name:', cls.termName);
      console.log('Needs Confirmation:', cls.needsConfirmation);
      console.log('Is Auto Created:', cls.isAutoCreated);
      console.log('Is Archived:', cls.isArchived);
      
      // Check faculty assignment
      const facultyAssignment = await FacultyAssignment.findOne({
        classID: cls.classID
      });
      
      if (facultyAssignment) {
        console.log('Faculty Assignment Status:', facultyAssignment.status);
        console.log('Faculty Assignment Faculty ID:', facultyAssignment.facultyId);
      } else {
        console.log('No faculty assignment found for this class');
      }
      
      // Check if faculty is still active
      const faculty = await User.findOne({
        $or: [
          { _id: cls.facultyID },
          { userID: cls.facultyID }
        ]
      });
      
      if (faculty) {
        console.log('Faculty Name:', `${faculty.firstname} ${faculty.lastname}`);
        console.log('Faculty User ID:', faculty.userID);
        console.log('Faculty Role:', faculty.role);
        console.log('Faculty Is Archived:', faculty.isArchived);
      } else {
        console.log('Faculty not found in User collection');
      }
    }

    // Check for any faculty assignments related to Philosophy
    const philosophyAssignments = await FacultyAssignment.find({
      subjectName: { $regex: /Philosophy/i }
    });

    console.log(`\nFound ${philosophyAssignments.length} Philosophy faculty assignments:`);
    
    for (const assignment of philosophyAssignments) {
      console.log('\n--- Philosophy Faculty Assignment ---');
      console.log('Assignment ID:', assignment._id);
      console.log('Faculty ID:', assignment.facultyId);
      console.log('Subject Name:', assignment.subjectName);
      console.log('Section Name:', assignment.sectionName);
      console.log('Status:', assignment.status);
      console.log('School Year:', assignment.schoolYear);
      console.log('Term Name:', assignment.termName);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkPhilosophyClass();
