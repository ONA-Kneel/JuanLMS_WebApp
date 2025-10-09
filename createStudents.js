const mongoose = require('mongoose');
const User = require('./models/User.js');
const StudentAssignment = require('./models/StudentAssignment.js');
const Term = require('./models/Term.js');
const Subject = require('./models/Subject.js');

async function createEnrolledStudents() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/JuanLMS');
    console.log('✅ Connected to MongoDB');

    // Get the active term
    const activeTerm = await Term.findOne({ status: 'active' });
    if (!activeTerm) {
      console.log('❌ No active term found. Please create an active term first.');
      return;
    }
    console.log(`📅 Using active term: ${activeTerm.termName} (${activeTerm.schoolYear})`);

    // Sample students data
    const students = [
      {
        firstname: 'John',
        middlename: 'Michael',
        lastname: 'Doe',
        schoolID: '25-00001',
        userID: '25-00001',
        email: 'students.john.doe@sjdefilms.com',
        personalemail: 'john.doe@gmail.com',
        contactNo: '09123456789',
        role: 'students',
        password: 'Student123',
        trackName: 'Academic',
        strandName: 'Science, Technology, Engineering, and Mathematics',
        sectionName: 'St. John Gabriel Perboyre',
        gradeLevel: 'Grade 12'
      },
      {
        firstname: 'Jane',
        middlename: 'Marie',
        lastname: 'Smith',
        schoolID: '25-00002',
        userID: '25-00002',
        email: 'students.jane.smith@sjdefilms.com',
        personalemail: 'jane.smith@gmail.com',
        contactNo: '09123456790',
        role: 'students',
        password: 'Student123',
        trackName: 'Academic',
        strandName: 'Science, Technology, Engineering, and Mathematics',
        sectionName: 'St. John Gabriel Perboyre',
        gradeLevel: 'Grade 12'
      },
      {
        firstname: 'Michael',
        middlename: 'James',
        lastname: 'Johnson',
        schoolID: '25-00003',
        userID: '25-00003',
        email: 'students.michael.johnson@sjdefilms.com',
        personalemail: 'michael.johnson@gmail.com',
        contactNo: '09123456791',
        role: 'students',
        password: 'Student123',
        trackName: 'Academic',
        strandName: 'Science, Technology, Engineering, and Mathematics',
        sectionName: 'St. John Gabriel Perboyre',
        gradeLevel: 'Grade 12'
      },
      {
        firstname: 'Sarah',
        middlename: 'Elizabeth',
        lastname: 'Williams',
        schoolID: '25-00004',
        userID: '25-00004',
        email: 'students.sarah.williams@sjdefilms.com',
        personalemail: 'sarah.williams@gmail.com',
        contactNo: '09123456792',
        role: 'students',
        password: 'Student123',
        trackName: 'Academic',
        strandName: 'Science, Technology, Engineering, and Mathematics',
        sectionName: 'St. John Gabriel Perboyre',
        gradeLevel: 'Grade 12'
      },
      {
        firstname: 'David',
        middlename: 'Robert',
        lastname: 'Brown',
        schoolID: '25-00005',
        userID: '25-00005',
        email: 'students.david.brown@sjdefilms.com',
        personalemail: 'david.brown@gmail.com',
        contactNo: '09123456793',
        role: 'students',
        password: 'Student123',
        trackName: 'Academic',
        strandName: 'Science, Technology, Engineering, and Mathematics',
        sectionName: 'St. John Gabriel Perboyre',
        gradeLevel: 'Grade 12'
      }
    ];

    console.log('🎓 Creating 5 enrolled students...');

    // Create users and student assignments
    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ 
          $or: [
            { schoolID: studentData.schoolID },
            { userID: studentData.userID },
            { email: studentData.email }
          ]
        });

        if (existingUser) {
          console.log(`⚠️  User ${studentData.firstname} ${studentData.lastname} already exists, skipping...`);
          continue;
        }

        // Create user
        const user = new User({
          firstname: studentData.firstname,
          middlename: studentData.middlename,
          lastname: studentData.lastname,
          schoolID: studentData.schoolID,
          userID: studentData.userID,
          email: studentData.email,
          personalemail: studentData.personalemail,
          contactNo: studentData.contactNo,
          role: studentData.role,
          password: studentData.password,
          isArchived: false
        });

        const savedUser = await user.save();
        console.log(`✅ Created user: ${studentData.firstname} ${studentData.lastname} (${studentData.schoolID})`);

        // Create student assignment
        const studentAssignment = new StudentAssignment({
          studentId: savedUser._id,
          studentName: `${studentData.firstname} ${studentData.lastname}`,
          studentSchoolID: studentData.schoolID,
          trackName: studentData.trackName,
          strandName: studentData.strandName,
          sectionName: studentData.sectionName,
          gradeLevel: studentData.gradeLevel,
          termId: activeTerm._id,
          schoolYear: activeTerm.schoolYear,
          termName: activeTerm.termName,
          quarterName: 'Quarter 1',
          enrollmentType: 'Regular',
          status: 'active'
        });

        await studentAssignment.save();
        console.log(`✅ Created student assignment for: ${studentData.firstname} ${studentData.lastname}`);

      } catch (error) {
        console.error(`❌ Error creating student ${studentData.firstname} ${studentData.lastname}:`, error.message);
      }
    }

    console.log('🎉 Successfully created enrolled students!');
    console.log('\n📋 Student Login Credentials:');
    console.log('================================');
    students.forEach(student => {
      console.log(`Email: ${student.email}`);
      console.log(`Password: ${student.password}`);
      console.log(`School ID: ${student.schoolID}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the function
createEnrolledStudents();
