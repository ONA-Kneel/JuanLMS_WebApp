import mongoose from 'mongoose';

const gradingDataSchema = new mongoose.Schema({
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  sectionName: {
    type: String,
    required: true
  },
  trackName: {
    type: String,
    required: true
  },
  strandName: {
    type: String,
    required: true
  },
  gradeLevel: {
    type: String,
    enum: ['Grade 11', 'Grade 12'],
    required: true
  },
  schoolYear: {
    type: String,
    required: true
  },
  termName: {
    type: String,
    required: true
  },
  grades: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentName: {
      type: String,
      required: true
    },
    grade: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    feedback: {
      type: String,
      default: ''
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  excelFileName: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'error'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

gradingDataSchema.index({ facultyId: 1, assignmentId: 1, sectionName: 1 });

const GradingData = mongoose.model('GradingData', gradingDataSchema);

export default GradingData; 