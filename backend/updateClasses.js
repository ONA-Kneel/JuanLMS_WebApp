// Simple script to update existing classes
// Run this from your backend folder: node updateClasses.js

import mongoose from 'mongoose';

// Connect to your database (replace with your connection string)
const mongoURI = 'mongodb://localhost:27017/JuanLMS';
await mongoose.connect(mongoURI);

// Get the Classes collection
const Classes = mongoose.connection.collection('Classes');

// Update all existing classes
const result = await Classes.updateMany(
  {}, // Update all classes
  {
    $set: {
      academicYear: "2025-2026",
      termName: "Term 1"
    }
  }
);

console.log(`Updated ${result.modifiedCount} classes`);
console.log('All classes now have academicYear: 2025-2026 and termName: Term 1');

// Show the updated classes
const classes = await Classes.find({}).toArray();
classes.forEach(cls => {
  console.log(`- ${cls.className}: ${cls.academicYear} | ${cls.termName}`);
});

await mongoose.disconnect();
console.log('Done!');

