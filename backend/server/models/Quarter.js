import mongoose from 'mongoose';

const quarterSchema = new mongoose.Schema({
  quarterName: {
    type: String,
    required: true,
    enum: ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4']
  },
  schoolYear: {
    type: String,
    required: true
  },
  termName: {
    type: String,
    required: true,
    enum: ['Term 1', 'Term 2']
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
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Validate that endDate is after startDate
quarterSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Validate quarter belongs to correct term
quarterSchema.pre('save', function(next) {
  const term1Quarters = ['Quarter 1', 'Quarter 2'];
  const term2Quarters = ['Quarter 3', 'Quarter 4'];
  
  if (this.termName === 'Term 1' && !term1Quarters.includes(this.quarterName)) {
    next(new Error('Quarter 1 and Quarter 2 must belong to Term 1'));
  } else if (this.termName === 'Term 2' && !term2Quarters.includes(this.quarterName)) {
    next(new Error('Quarter 3 and Quarter 4 must belong to Term 2'));
  } else {
    next();
  }
});

export default mongoose.model('Quarter', quarterSchema);
