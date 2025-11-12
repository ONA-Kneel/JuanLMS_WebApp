import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  trackName: {
    type: String,
    required: true,
    trim: true
  },
  strandName: {
    type: String,
    required: true,
    trim: true
  },
  gradeLevel: {
    type: String,
    required: true,
    enum: ['Grade 11', 'Grade 12']
  },
  termName: {
    type: String,
    required: true
  },
  // Optional quarter scoping within the term
  quarterName: {
    type: String,
  },
  schoolYear: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Scope subject uniqueness by quarterName as well
subjectSchema.index(
  { subjectName: 1, trackName: 1, strandName: 1, gradeLevel: 1, termName: 1, schoolYear: 1, quarterName: 1 },
  { unique: true, name: 'uniq_subject_track_strand_grade_year_term_quarter' }
);

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject; 