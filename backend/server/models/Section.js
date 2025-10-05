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
    enum: ['active', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Add a compound unique index to prevent duplicate section names within the same track, strand, school year, term, and quarter
// This allows the same section name to exist in different quarters of the same term
sectionSchema.index({ sectionName: 1, trackName: 1, strandName: 1, schoolYear: 1, termName: 1, quarterName: 1 }, { unique: true });

const Section = mongoose.model('Section', sectionSchema);

export default Section; 