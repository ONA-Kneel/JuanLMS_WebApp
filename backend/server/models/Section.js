import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  sectionName: {
    type: String,
    required: true,
    trim: true
  },
  sectionCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  trackName: {
    type: String,
    required: true,
  },
  strandName: {
    type: String,
    required: true,
  },
  gradeLevel: {
    type: String,
    required: true,
    enum: ['Grade 11', 'Grade 12']
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
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Scope uniqueness by quarterName so sections can repeat across quarters
sectionSchema.index(
  { sectionName: 1, trackName: 1, strandName: 1, schoolYear: 1, termName: 1, quarterName: 1 },
  { unique: true, name: 'uniq_section_track_strand_year_term_quarter' }
);

const Section = mongoose.model('Section', sectionSchema);

export default Section; 