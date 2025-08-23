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
    enum: ['active', 'inactive', 'archived'],
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

// Pre-remove middleware for cascading deletes
termSchema.pre('remove', async function(next) {
  try {
    // Import models here to avoid circular dependencies
    const Track = mongoose.model('Track');
    const Strand = mongoose.model('Strand');
    const Section = mongoose.model('Section');
    const Subject = mongoose.model('Subject');
    const StudentAssignment = mongoose.model('StudentAssignment');
    const FacultyAssignment = mongoose.model('FacultyAssignment');
    
    // Delete all related entities for this specific term
    await Promise.all([
      Track.deleteMany({ schoolYear: this.schoolYear, termName: this.termName }),
      Strand.deleteMany({ schoolYear: this.schoolYear, termName: this.termName }),
      Section.deleteMany({ schoolYear: this.schoolYear, termName: this.termName }),
      Subject.deleteMany({ schoolYear: this.schoolYear, termName: this.termName }),
      StudentAssignment.deleteMany({ termId: this._id }),
      FacultyAssignment.deleteMany({ termId: this._id })
    ]);
    
    console.log(`Cascading delete completed for term: ${this.termName} (${this.schoolYear})`);
    next();
  } catch (error) {
    console.error('Error in cascading delete:', error);
    next(error);
  }
});

const Term = mongoose.model('Term', termSchema);
export default Term; 