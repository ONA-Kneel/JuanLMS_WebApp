import mongoose from 'mongoose';

const schoolYearSchema = new mongoose.Schema({
  schoolYearStart: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        return v > 1900 && v < 2100;
      },
      message: 'Start year must be between 1900 and 2100'
    }
  },
  schoolYearEnd: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        return v === this.schoolYearStart + 1;
      },
      message: 'End year must be start year + 1'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'inactive'
  }
}, {
  timestamps: true,
  collection: 'schoolyears'
});

// Ensure only one active school year exists
schoolYearSchema.pre('save', async function(next) {
  if (this.status === 'active') {
    const activeSchoolYear = await this.constructor.findOne({ 
      status: 'active',
      _id: { $ne: this._id }
    });
    if (activeSchoolYear) {
      throw new Error('Another active school year already exists');
    }
  }
  next();
});

// Pre-remove middleware for cascading deletes
schoolYearSchema.pre('remove', async function(next) {
  try {
    const schoolYearName = `${this.schoolYearStart}-${this.schoolYearEnd}`;
    
    // Import models here to avoid circular dependencies
    const Term = mongoose.model('Term');
    const Track = mongoose.model('Track');
    const Strand = mongoose.model('Strand');
    const Section = mongoose.model('Section');
    const Subject = mongoose.model('Subject');
    const StudentAssignment = mongoose.model('StudentAssignment');
    const FacultyAssignment = mongoose.model('FacultyAssignment');
    
    // Delete all related entities
    await Promise.all([
      Term.deleteMany({ schoolYear: schoolYearName }),
      Track.deleteMany({ schoolYear: schoolYearName }),
      Strand.deleteMany({ schoolYear: schoolYearName }),
      Section.deleteMany({ schoolYear: schoolYearName }),
      Subject.deleteMany({ schoolYear: schoolYearName }),
      StudentAssignment.deleteMany({ schoolYear: schoolYearName }),
      FacultyAssignment.deleteMany({ schoolYear: schoolYearName })
    ]);
    
    console.log(`Cascading delete completed for school year: ${schoolYearName}`);
    next();
  } catch (error) {
    console.error('Error in cascading delete:', error);
    next(error);
  }
});

const SchoolYear = mongoose.model('SchoolYear', schoolYearSchema);

export default SchoolYear; 