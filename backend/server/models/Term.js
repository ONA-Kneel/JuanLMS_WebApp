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

// Add compound unique index to prevent duplicate terms with same name and school year
termSchema.index({ termName: 1, schoolYear: 1 }, { unique: true });

// Validate that endDate is after startDate
termSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Pre-save hook to cascade inactive status to related entities
termSchema.pre('save', async function(next) {
  // Only cascade if status is being changed to 'inactive' and it wasn't inactive before
  if (this.isModified('status') && this.status === 'inactive') {
    try {
      // Import models here to avoid circular dependencies
      const Track = mongoose.model('Track');
      const Strand = mongoose.model('Strand');
      const Section = mongoose.model('Section');
      const Subject = mongoose.model('Subject');
      const StudentAssignment = mongoose.model('StudentAssignment');
      const FacultyAssignment = mongoose.model('FacultyAssignment');
      const Quarter = mongoose.model('Quarter');
      
      console.log(`[Term Model] Cascading inactive status for term: ${this.termName} (${this.schoolYear})`);
      
      // Cascade to all related entities (only non-archived ones)
      await Promise.all([
        // Set quarters to inactive
        Quarter.updateMany(
          { schoolYear: this.schoolYear, termName: this.termName, status: { $ne: 'archived' } },
          { $set: { status: 'inactive' } }
        ),
        
        // Set student assignments to inactive
        StudentAssignment.updateMany(
          { termId: this._id, status: { $ne: 'archived' } },
          { $set: { status: 'inactive' } }
        ),
        
        // Set faculty assignments to inactive
        FacultyAssignment.updateMany(
          { termId: this._id, status: { $ne: 'archived' } },
          { $set: { status: 'inactive' } }
        ),
        
        // Set structural entities to inactive
        Track.updateMany(
          { schoolYear: this.schoolYear, termName: this.termName, status: { $ne: 'archived' } },
          { $set: { status: 'inactive' } }
        ),
        Strand.updateMany(
          { schoolYear: this.schoolYear, termName: this.termName, status: { $ne: 'archived' } },
          { $set: { status: 'inactive' } }
        ),
        Section.updateMany(
          { schoolYear: this.schoolYear, termName: this.termName, status: { $ne: 'archived' } },
          { $set: { status: 'inactive' } }
        ),
        Subject.updateMany(
          { schoolYear: this.schoolYear, termName: this.termName, status: { $ne: 'archived' } },
          { $set: { status: 'inactive' } }
        )
      ]);
      
      console.log(`[Term Model] Successfully cascaded inactive status for term: ${this.termName}`);
    } catch (error) {
      console.error('[Term Model] Error cascading inactive status:', error);
      // Don't block the save, but log the error
    }
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