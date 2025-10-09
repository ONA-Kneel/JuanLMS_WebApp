const mongoose = require('mongoose');
const User = require('./backend/server/models/User.js');

async function disablePasswordHashingForStudents() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/JuanLMS');
    console.log('✅ Connected to MongoDB');

    // Find all students with role 'students'
    const students = await User.find({ role: 'students' });
    console.log(`📊 Found ${students.length} students`);

    if (students.length === 0) {
      console.log('❌ No students found');
      return;
    }

    // Update each student's password to the unhashed version
    for (const student of students) {
      try {
        // Set the password to the original unhashed version
        const originalPassword = 'Student123';
        
        // Update the password directly in the database
        await User.updateOne(
          { _id: student._id },
          { $set: { password: originalPassword } }
        );
        
        console.log(`✅ Updated password for student: ${student.firstname} ${student.lastname}`);
      } catch (error) {
        console.error(`❌ Error updating student ${student.firstname} ${student.lastname}:`, error.message);
      }
    }

    console.log('🎉 Successfully updated all student passwords to unhashed versions!');
    console.log('\n📋 Updated Student Login Credentials:');
    console.log('=====================================');
    students.forEach(student => {
      console.log(`Name: ${student.firstname} ${student.lastname}`);
      console.log(`Password: Student123`);
      console.log('---');
    });

    console.log('\n⚠️  IMPORTANT: To prevent future password hashing for students,');
    console.log('   you may need to modify the User model pre-save middleware.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the function
disablePasswordHashingForStudents();
