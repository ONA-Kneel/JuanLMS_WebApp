import mongoose from 'mongoose';

const studentAssignmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // Allow manual entries when the student does not yet exist in the system
  studentName: {
    type: String
  },
  studentSchoolID: {
    type: String
  },
  // New fields for detailed student information
  enrollmentNo: {
    type: String
  },
  enrollmentDate: {
    type: Date
  },
  lastName: {
    type: String
  },
  firstName: {
    type: String
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
  // Optional quarter scoping within the term
  quarterName: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  isApproved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Keep a uniqueness guard. Only prevent the same student from being assigned multiple times to the same combination.
// Allow multiple students in the same section/track/strand combination.
studentAssignmentSchema.index(
  {
    studentId: 1,
    schoolYear: 1,
    termName: 1,
    quarterName: 1
  },
  { unique: true, partialFilterExpression: { studentId: { $exists: true, $ne: null } } }
);

// Add unique constraint for studentSchoolID to prevent duplicates within the same quarter
studentAssignmentSchema.index(
  {
    studentSchoolID: 1,
    schoolYear: 1,
    termName: 1,
    quarterName: 1
  },
  { unique: true, partialFilterExpression: { studentSchoolID: { $exists: true, $ne: null } } }
);

// Add comprehensive unique constraint to prevent exact duplicate assignments within the same quarter
studentAssignmentSchema.index(
  {
    studentSchoolID: 1,
    trackName: 1,
    strandName: 1,
    sectionName: 1,
    schoolYear: 1,
    termName: 1,
    quarterName: 1
  },
  { unique: true, partialFilterExpression: { studentSchoolID: { $exists: true, $ne: null } } }
);

// Add index for manual entries (when studentId doesn't exist)
studentAssignmentSchema.index(
  {
    studentName: 1,
    sectionName: 1,
    schoolYear: 1,
    termName: 1
  },
  { unique: false, partialFilterExpression: { studentId: { $exists: false } } }
);

const StudentAssignment = mongoose.model('StudentAssignment', studentAssignmentSchema);
export default StudentAssignment; 