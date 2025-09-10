import mongoose from 'mongoose';

const semestralGradeSchema = new mongoose.Schema({
  // PRIMARY IDENTIFIER - Using schoolID for consistency
  schoolID: {
    type: String,
    required: true,
    index: true
  },
  
  // Student information
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  
  // Subject and class information
  subjectCode: {
    type: String,
    required: true
  },
  subjectName: {
    type: String,
    required: true
  },
  classID: {
    type: String,
    required: true
  },
  
  // Academic context
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
  
  // Faculty information
  facultyID: {
    type: String,
    required: true
  },
  
  // Grades structure
  grades: {
    quarter1: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    quarter2: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    quarter3: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    quarter4: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    semesterFinal: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    remarks: {
      type: String,
      enum: ['PASSED', 'FAILED', 'REPEAT', 'INCOMPLETE'],
      default: 'INCOMPLETE'
    }
  },
  
  // Status and locking
  isLocked: {
    type: Boolean,
    default: false
  },
  
  // Quarter-specific locking
  quarter1Locked: {
    type: Boolean,
    default: false
  },
  quarter2Locked: {
    type: Boolean,
    default: false
  },
  quarter3Locked: {
    type: Boolean,
    default: false
  },
  quarter4Locked: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
semestralGradeSchema.index({ 
  schoolID: 1, 
  subjectCode: 1, 
  academicYear: 1, 
  termName: 1 
});

// Index for faculty queries
semestralGradeSchema.index({ 
  facultyID: 1, 
  academicYear: 1, 
  termName: 1 
});

// Index for class queries
semestralGradeSchema.index({ 
  classID: 1, 
  academicYear: 1, 
  termName: 1 
});

// Pre-save middleware to update lastUpdated
semestralGradeSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Method to calculate semester final grade
semestralGradeSchema.methods.calculateSemesterFinal = function() {
  const { quarter1, quarter2, quarter3, quarter4 } = this.grades;
  
  if (this.termName === 'Term 1') {
    // Term 1: Average of Q1 and Q2
    if (quarter1 !== null && quarter2 !== null) {
      return (quarter1 + quarter2) / 2;
    }
  } else if (this.termName === 'Term 2') {
    // Term 2: Average of Q3 and Q4
    if (quarter3 !== null && quarter4 !== null) {
      return (quarter3 + quarter4) / 2;
    }
  }
  
  return null;
};

// Method to calculate remarks based on semester final grade
semestralGradeSchema.methods.calculateRemarks = function() {
  const semesterFinal = this.grades.semesterFinal;
  
  if (semesterFinal === null) {
    return 'INCOMPLETE';
  }
  
  if (semesterFinal >= 85) {
    return 'PASSED';
  } else if (semesterFinal >= 80) {
    return 'INCOMPLETE';
  } else if (semesterFinal >= 75) {
    return 'REPEAT';
  } else {
    return 'FAILED';
  }
};

const SemestralGrade = mongoose.model('semestral_grade_collections', semestralGradeSchema);

export default SemestralGrade;
