import mongoose from 'mongoose';

const programSchema = new mongoose.Schema({
  programName: {
    type: String,
    required: [true, 'Program name is required.'],
    trim: true,
    unique: true, // Assuming program names should be unique
  },
  yearLevel: {
    type: String,
    required: [true, 'Year level is required for the program.'],
    enum: ['College', 'Senior High'],
  },
}, { timestamps: true }); // This will add createdAt and updatedAt automatically

// Optional: Pre-save hook if you want to ensure 'active' status uniqueness (like in SchoolYear)
// For now, we'll assume multiple programs can be active simultaneously.
// If only one program can be active, uncomment and adapt the following:
/*
programSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'active') {
    try {
      await this.constructor.updateMany({ _id: { $ne: this._id }, status: 'active' }, { $set: { status: 'inactive' } });
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});
*/

const Program = mongoose.model('Program', programSchema);

export default Program; 