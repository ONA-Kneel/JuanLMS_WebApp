import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  sectionName: {
    type: String,
    required: [true, 'Section name is required.'],
    trim: true,
    // Consider if section names should be unique, perhaps unique per program and year level.
    // For now, allowing duplicate names across different program/year combinations.
  },
  programName: {
    type: String,
    required: [true, 'Program name is required.'],
    trim: true,
  },
  yearLevel: {
    type: String,
    required: [true, 'Year level is required.'],
    trim: true,
    // Example enum if you want to restrict values, adjust as needed:
    // enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Grade 11', 'Grade 12'] 
  },
  courseName: {
    type: String,
    default: null,
    trim: true,
  },
}, { timestamps: true }); // Adds createdAt and updatedAt

// Optional: Add a compound index for uniqueness if needed, e.g., unique section name per program and year level
// sectionSchema.index({ program: 1, yearLevel: 1, sectionName: 1 }, { unique: true });

const Section = mongoose.model('Section', sectionSchema);

export default Section; 