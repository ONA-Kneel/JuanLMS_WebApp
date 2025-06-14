import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  sectionName: {
    type: String,
    required: true,
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
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Add a compound unique index to prevent duplicate section names within the same track and strand
sectionSchema.index({ sectionName: 1, trackName: 1, strandName: 1 }, { unique: true });

const Section = mongoose.model('Section', sectionSchema);

export default Section; 