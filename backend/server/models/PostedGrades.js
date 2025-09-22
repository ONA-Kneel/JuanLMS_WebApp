import mongoose from 'mongoose';

const PostedGradesSchema = new mongoose.Schema({
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
    studentName: {
      type: String,
      required: true
    },
    schoolID: {
      type: String,
      required: true
    },
    quarterlyGrade: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    termFinalGrade: {
      type: Number,
      min: 0,
      max: 100
    },
    remarks: {
      type: String,
      enum: ['PASSED', 'REPEAT', null]
    }
  }],
  postedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  trackInfo: {
    track: String,
    percentages: {
      quarterly: Number,
      performance: Number,
      written: Number
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
PostedGradesSchema.index({ classId: 1, section: 1, quarter: 1, facultyId: 1 });
PostedGradesSchema.index({ classId: 1, section: 1, studentId: 1 });
PostedGradesSchema.index({ academicYear: 1, termName: 1, quarter: 1 });

const PostedGrades = mongoose.model('PostedGrades', PostedGradesSchema);

export default PostedGrades;
