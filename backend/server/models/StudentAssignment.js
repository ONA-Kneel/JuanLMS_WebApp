import mongoose from 'mongoose';

const studentAssignmentSchema = new mongoose.Schema({
  studentId: {
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

studentAssignmentSchema.index(
  { 
    studentId: 1, 
    trackName: 1, 
    strandName: 1, 
    sectionName: 1, 
    schoolYear: 1,
    termName: 1
  }, 
  { unique: true }
);

const StudentAssignment = mongoose.model('StudentAssignment', studentAssignmentSchema);
export default StudentAssignment; 