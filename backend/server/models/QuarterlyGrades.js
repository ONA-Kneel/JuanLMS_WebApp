import mongoose from 'mongoose';

const QuarterlyGradesSchema = new mongoose.Schema({
  classId: {
    type: String,
    required: true,
    index: true
  },
  className: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true,
    index: true
  },
  academicYear: {
    type: String,
    required: true,
    index: true
  },
  termName: {
    type: String,
    required: true,
    index: true
  },
  quarter: {
    type: String,
    required: true,
    enum: ['Q1', 'Q2', 'Q3', 'Q4'],
    index: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  grades: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    quarterlyGrade: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    academicYear: {
      type: String,
      required: true
    },
    termName: {
      type: String,
      required: true
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient querying
QuarterlyGradesSchema.index({ classId: 1, section: 1, quarter: 1, facultyId: 1 });
QuarterlyGradesSchema.index({ classId: 1, section: 1, studentId: 1 });
QuarterlyGradesSchema.index({ academicYear: 1, termName: 1, quarter: 1 });

const QuarterlyGrades = mongoose.model('QuarterlyGrades', QuarterlyGradesSchema);

export default QuarterlyGrades;
