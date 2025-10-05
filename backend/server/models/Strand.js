import mongoose from 'mongoose';

const strandSchema = new mongoose.Schema({
  strandName: {
    type: String,
    required: true,
    trim: true
  },
  trackName: {
    type: String,
    required: true,
  },
  schoolYear: {
    type: String,
    required: true
  },
  termName: {
    type: String,
    required: true
  },
  // Optional: which quarter this strand belongs to within the term
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

// Uniqueness should be scoped by quarter as well, so the same strand can exist in Q1 and Q2
strandSchema.index(
  { strandName: 1, trackName: 1, schoolYear: 1, termName: 1, quarterName: 1 },
  { unique: true, name: 'uniq_strand_track_year_term_quarter' }
);

const Strand = mongoose.model('Strand', strandSchema);

export default Strand; 