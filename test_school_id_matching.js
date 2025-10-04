// Test script to verify school ID matching works
const mongoose = require('mongoose');
const User = require('./backend/server/models/User.js');
const StudentAssignment = require('./backend/server/models/StudentAssignment.js');

async function testSchoolIdMatching() {
  try {
    await mongoose.connect('mongodb+srv://Rayhan:webprogrammer123@juanlms.td1v92f.mongodb.net/JuanLMS?retryWrites=true&w=majority&appName=JuanLMS');
    console.log('Connected to MongoDB Atlas');
    
    // Find a student with school ID
    const student = await User.findOne({ 
      role: 'students',
      schoolID: { $exists: true, $ne: null }
    });
    
    if (!student) {
      console.log('No student with school ID found');
      return;
    }
    
    console.log('Found student:', {
      _id: student._id.toString(),
      userID: student.userID,
      schoolID: student.schoolID,
      name: `${student.firstname} ${student.lastname}`
    });
    
    // Test the matching logic
    const assignments = await StudentAssignment.find({
      $or: [
        { studentId: student._id },
        { studentSchoolID: student.schoolID }
      ],
      status: 'active'
    });
    
    console.log(`Found ${assignments.length} assignments for student ${student.schoolID}`);
    
    assignments.forEach((assignment, index) => {
      console.log(`Assignment ${index + 1}:`, {
        studentSchoolID: assignment.studentSchoolID,
        sectionName: assignment.sectionName,
        studentName: assignment.studentName
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testSchoolIdMatching();

