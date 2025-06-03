import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  courseName: {
    type: String,
    required: [true, 'Course name is required.'],
    trim: true,
    // We might want to make course names unique within a specific program, but not globally unique without more context.
    // For now, we'll allow duplicate course names across different programs.
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program', // This refers to the Program model
    required: [true, 'Program is required for the course.'],
  },
}, { timestamps: true }); // This will add createdAt and updatedAt automatically

// Optional: Add a compound index if you want courseName to be unique per program
// courseSchema.index({ program: 1, courseName: 1 }, { unique: true });

const Course = mongoose.model('Course', courseSchema);

export default Course; 