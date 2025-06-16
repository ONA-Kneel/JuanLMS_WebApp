import mongoose from 'mongoose';

const facultyAssignmentSchema = new mongoose.Schema({
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  trackName: {
    type: String,
    required: true
  },
  strandName: {
    type: String,
    required: true
  },
  sectionName: {
    type: String,
    required: true
  },
  subjectName: {
    type: String,
    required: true
  },
  gradeLevel: {
    type: String,
    enum: ['Grade 11', 'Grade 12'],
    required: true
  },
  termId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Term',
    required: true
  },
  // New hidden fields for unique identification
  schoolYear: {
    type: String,
    required: true
  },
  termName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Update unique index to include schoolYear and termName
facultyAssignmentSchema.index(
  { 
    facultyId: 1, 
    trackName: 1, 
    strandName: 1, 
    sectionName: 1, 
    schoolYear: 1,
    termName: 1
  }, 
  { unique: true }
);

const FacultyAssignment = mongoose.model('FacultyAssignment', facultyAssignmentSchema);
export default FacultyAssignment; 