// Script to create Term 2 classes for testing
// Run this from your backend folder: node create_term2_classes.js

import mongoose from 'mongoose';
import Class from './server/models/Class.js';

// Connect to your database (replace with your connection string)
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/JuanLMS';
await mongoose.connect(mongoURI);

console.log('Connected to MongoDB');

// Create some Term 2 classes for testing
const term2Classes = [
  {
    classID: 'TERM2_MATH_001',
    className: 'Advanced Mathematics',
    classCode: 'MATH-ADV-2025-T2',
    classDesc: 'Advanced Mathematics for Term 2',
    members: [],
    facultyID: 'faculty_001',
    section: 'STEM-12A',
    academicYear: '2025-2026',
    termName: 'Term 2',
    isArchived: false
  },
  {
    classID: 'TERM2_SCIENCE_001',
    className: 'Physics',
    classCode: 'PHYS-2025-T2',
    classDesc: 'Physics for Term 2',
    members: [],
    facultyID: 'faculty_002',
    section: 'STEM-12B',
    academicYear: '2025-2026',
    termName: 'Term 2',
    isArchived: false
  },
  {
    classID: 'TERM2_ENG_001',
    className: 'English Literature',
    classCode: 'ENG-LIT-2025-T2',
    classDesc: 'English Literature for Term 2',
    members: [],
    facultyID: 'faculty_003',
    section: 'HUMSS-12A',
    academicYear: '2025-2026',
    termName: 'Term 2',
    isArchived: false
  }
];

try {
  // Clear existing Term 2 classes first
  await Class.deleteMany({ termName: 'Term 2' });
  console.log('Cleared existing Term 2 classes');

  // Create new Term 2 classes
  const createdClasses = await Class.insertMany(term2Classes);
  console.log(`Created ${createdClasses.length} Term 2 classes:`);
  
  createdClasses.forEach(cls => {
    console.log(`- ${cls.className} (${cls.classCode}) - Section: ${cls.section}`);
  });

  console.log('\n✅ Term 2 classes created successfully!');
  console.log('You can now test the Principal Grades page with Term 2 selected.');

} catch (error) {
  console.error('❌ Error creating Term 2 classes:', error);
} finally {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}
