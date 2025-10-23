import mongoose from 'mongoose';

const detailedGradesSchema = new mongoose.Schema({
  classId: {
    type: String,
    required: true
  },
  className: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  termName: {
    type: String,
    required: true
  },
  quarter: {
    type: String,
    required: true
  },
  quarterlyExamHPS: {
    type: Number,
    default: 100
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    schoolID: {
      type: String,
      required: true
    },
    writtenWorks: {
      raw: { type: Number, default: 0 },
      hps: { type: Number, default: 0 },
      ps: { type: Number, default: 0 },
      ws: { type: Number, default: 0 }
    },
    performanceTasks: {
      raw: { type: Number, default: 0 },
      hps: { type: Number, default: 0 },
      ps: { type: Number, default: 0 },
      ws: { type: Number, default: 0 }
    },
    quarterlyExam: {
      type: Number,
      default: 0
    },
    initialGrade: {
      type: Number,
      default: 0
    },
    finalGrade: {
      type: Number,
      default: 0
    },
    trackInfo: {
      track: { type: String, default: 'Academic' },
      percentages: {
        written: { type: Number, default: 25 },
        performance: { type: Number, default: 50 },
        quarterly: { type: Number, default: 25 }
      }
    }
  }],
  savedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for efficient queries
detailedGradesSchema.index({ classId: 1, section: 1, quarter: 1, facultyId: 1 });

const DetailedGrades = mongoose.model('DetailedGrades', detailedGradesSchema);

export default DetailedGrades;
