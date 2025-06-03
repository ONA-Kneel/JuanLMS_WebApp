import mongoose from 'mongoose';

const schoolYearSchema = new mongoose.Schema({
  startYear: {
    type: Number,
    required: [true, 'Start year is required.'],
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value for start year.'
    }
  },
  endYear: {
    type: Number,
    required: [true, 'End year is required.'],
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value for end year.'
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive'],
    default: 'inactive',
  },
}, { timestamps: true });

// Pre-save hook to ensure endYear is greater than startYear
schoolYearSchema.pre('save', function(next) {
  if (this.startYear >= this.endYear) {
    next(new Error('End year must be greater than start year.'));
  } else {
    next();
  }
});

// Pre-save hook to ensure only one active school year
schoolYearSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'active') {
    try {
      // `this.constructor` refers to the Mongoose model
      await this.constructor.updateMany({ _id: { $ne: this._id }, status: 'active' }, { $set: { status: 'inactive' } });
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const SchoolYear = mongoose.model('SchoolYear', schoolYearSchema);

export default SchoolYear;
