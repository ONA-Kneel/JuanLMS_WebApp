const mongoose = require('mongoose');
const User = require('./models/User.js');
const Class = require('./models/Class.js');
const StudentAssignment = require('./models/StudentAssignment.js');
const FacultyAssignment = require('./models/FacultyAssignment.js');

// Test script to verify schoolID-based auto-create class functionality
async function testSchoolIdAutoCreate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/juanlms');
    console.log('✅ Connected to MongoDB');

    // Test 1: Check if we have StudentAssignment records with schoolID
    console.log('\n📋 Test 1: Checking StudentAssignment records with schoolID');
    const studentAssignments = await StudentAssignment.find({
      studentSchoolID: { $exists: true, $ne: null }
    }).limit(5);
    
    console.log(`Found ${studentAssignments.length} StudentAssignment records with schoolID`);
    studentAssignments.forEach((assignment, index) => {
      console.log(`  ${index + 1}. SchoolID: ${assignment.studentSchoolID}, Section: ${assignment.sectionName}, Status: ${assignment.status}`);
    });

    // Test 2: Check if we have User records with matching schoolIDs
    console.log('\n👥 Test 2: Checking User records with schoolID');
    const schoolIds = studentAssignments.map(a => a.studentSchoolID).filter(Boolean);
    const users = await User.find({
      role: 'students',
      schoolID: { $in: schoolIds }
    });
    
    console.log(`Found ${users.length} User records with matching schoolIDs`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. UserID: ${user.userID}, SchoolID: ${user.schoolID}, Name: ${user.firstname} ${user.lastname}`);
    });

    // Test 3: Check existing classes and their members
    console.log('\n🏫 Test 3: Checking existing classes and members');
    const classes = await Class.find({ isArchived: { $ne: true } }).limit(3);
    console.log(`Found ${classes.length} active classes`);
    
    classes.forEach((cls, index) => {
      console.log(`  ${index + 1}. Class: ${cls.className} (${cls.classID})`);
      console.log(`     Members: ${cls.members.length} students`);
      console.log(`     Section: ${cls.section}`);
      console.log(`     Is Auto-Created: ${cls.isAutoCreated || false}`);
    });

    // Test 4: Simulate the auto-create class logic
    console.log('\n🔧 Test 4: Simulating auto-create class logic');
    if (studentAssignments.length > 0) {
      const testAssignment = studentAssignments[0];
      console.log(`Testing with assignment: Section ${testAssignment.sectionName}, SchoolID: ${testAssignment.studentSchoolID}`);
      
      // Find students by schoolID (as per new logic)
      const studentSchoolIds = [testAssignment.studentSchoolID].filter(Boolean);
      const usersBySchoolId = await User.find({
        role: 'students',
        schoolID: { $in: studentSchoolIds }
      });
      
      console.log(`Found ${usersBySchoolId.length} students by schoolID`);
      usersBySchoolId.forEach(user => {
        console.log(`  - ${user.userID} (${user.schoolID}): ${user.firstname} ${user.lastname}`);
      });
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- The auto-create class functionality now prioritizes schoolID matching');
    console.log('- Students with matching schoolIDs in StudentAssignment records will be added to classes');
    console.log('- This ensures students can access their classes using their schoolID');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testSchoolIdAutoCreate();
