const mongoose = require('mongoose');
const User = require('./server/models/User.js');
const { encrypt, decrypt } = require('./server/utils/encryption.js');
const crypto = require('crypto');

async function updateStudentEmails() {
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

    // Update each student's email to the new format
    for (const student of students) {
      try {
        // Get decrypted firstname and lastname
        const firstname = student.getDecryptedFirstname ? student.getDecryptedFirstname() : student.firstname;
        const lastname = student.getDecryptedLastname ? student.getDecryptedLastname() : student.lastname;
        
        // Create new email format: students.firstname.lastname@sjdefilms.com
        const newEmail = `students.${firstname.toLowerCase()}.${lastname.toLowerCase()}@sjdefilms.com`;
        
        // Create email hash for the new email
        const emailHash = crypto.createHash('sha256').update(newEmail.toLowerCase()).digest('hex');
        
        // Encrypt the new email
        const encryptedEmail = encrypt(newEmail);
        
        // Update the student's email
        await User.updateOne(
          { _id: student._id },
          { 
            $set: { 
              email: encryptedEmail,
              emailHash: emailHash
            } 
          }
        );
        
        console.log(`✅ Updated email for: ${firstname} ${lastname}`);
        console.log(`   Old email: ${student.getDecryptedEmail ? student.getDecryptedEmail() : 'N/A'}`);
        console.log(`   New email: ${newEmail}`);
        console.log('---');
        
      } catch (error) {
        console.error(`❌ Error updating student ${student.firstname} ${student.lastname}:`, error.message);
      }
    }

    console.log('🎉 Successfully updated all student emails!');
    console.log('\n📋 Updated Student Login Credentials:');
    console.log('=====================================');
    
    // Fetch updated students to show new credentials
    const updatedStudents = await User.find({ role: 'students' });
    for (const student of updatedStudents) {
      const firstname = student.getDecryptedFirstname ? student.getDecryptedFirstname() : student.firstname;
      const lastname = student.getDecryptedLastname ? student.getDecryptedLastname() : student.lastname;
      const email = student.getDecryptedEmail ? student.getDecryptedEmail() : 'N/A';
      
      console.log(`Name: ${firstname} ${lastname}`);
      console.log(`Email: ${email}`);
      console.log(`Password: Student123`);
      console.log('---');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the function
updateStudentEmails();
