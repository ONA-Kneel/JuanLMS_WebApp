import mongoose from 'mongoose';

const termSchema = new mongoose.Schema({
  termName: {
    type: String,
    required: true
  },
  schoolYear: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
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

// Validate that endDate is after startDate
termSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

const Term = mongoose.model('Term', termSchema);
export default Term; 