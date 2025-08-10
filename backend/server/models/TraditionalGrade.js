import mongoose from 'mongoose';

const traditionalGradeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  // New simplified grade structure
  prelims: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  midterms: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  final: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  finalGrade: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  remark: {
    type: String,
    enum: ['PASSED', 'FAILED', ''],
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique grades per student-subject-section-term
traditionalGradeSchema.index(
  { 
    studentId: 1, 
    subjectId: 1, 
    sectionName: 1, 
    schoolYear: 1, 
    termName: 1 
  }, 
  { unique: true }
);

// Index for faculty queries
traditionalGradeSchema.index({ facultyId: 1, sectionName: 1, schoolYear: 1, termName: 1 });

// Index for student queries
traditionalGradeSchema.index({ studentId: 1, schoolYear: 1, termName: 1 });

// Virtual for calculating final grade if not manually set
traditionalGradeSchema.virtual('calculatedFinalGrade').get(function() {
  if (this.finalGrade !== null) {
    return this.finalGrade;
  }
  
  const { prelims, midterms, final } = this;
  if (prelims !== null && midterms !== null && final !== null) {
    // Calculate final grade: 30% prelims + 30% midterms + 40% final
    return Math.round((prelims * 0.3) + (midterms * 0.3) + (final * 0.4));
  }
  
  return null;
});

// Method to update remark based on final grade
traditionalGradeSchema.methods.updateRemark = function() {
  const finalGrade = this.finalGrade || this.calculatedFinalGrade;
  if (finalGrade !== null) {
    if (finalGrade >= 75) {
      this.remark = 'PASSED';
    } else if (finalGrade < 75) {
      this.remark = 'FAILED';
    }
  }
  return this.remark;
};

// Pre-save middleware to update remark
traditionalGradeSchema.pre('save', function(next) {
  this.updateRemark();
  next();
});

const TraditionalGrade = mongoose.model('TraditionalGrade', traditionalGradeSchema);

export default TraditionalGrade; 