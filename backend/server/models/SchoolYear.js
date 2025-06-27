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

const SchoolYear = mongoose.model('SchoolYear', schoolYearSchema);

export default SchoolYear; 