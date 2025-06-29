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
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Add a compound unique index to prevent duplicate strand names within the same track, school year, and term
strandSchema.index({ strandName: 1, trackName: 1, schoolYear: 1, termName: 1 }, { unique: true });

const Strand = mongoose.model('Strand', strandSchema);

export default Strand; 