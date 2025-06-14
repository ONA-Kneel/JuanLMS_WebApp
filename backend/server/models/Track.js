import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema({
  trackName: {
    type: String,
    required: true,
    trim: true
  },
  schoolYear: {
    type: String,
    required: true,
    trim: true
  },
  termName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true // This will add createdAt and updatedAt fields automatically
});

// Add compound index to prevent duplicate track names within the same school year and term
trackSchema.index({ trackName: 1, schoolYear: 1, termName: 1 }, { unique: true });

const Track = mongoose.model('Track', trackSchema);

export default Track; 