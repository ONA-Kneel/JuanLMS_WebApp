import mongoose from "mongoose";

const studentReportSchema = new mongoose.Schema({
  facultyName: {
    type: String,
    required: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  studentReport: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  termName: {
    type: String,
    required: true,
    trim: true
  },
  schoolYear: {
    type: String,
    required: true,
    trim: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
studentReportSchema.index({ facultyId: 1, date: -1 });
studentReportSchema.index({ studentId: 1, date: -1 });
studentReportSchema.index({ schoolYear: 1, termName: 1 });

export default mongoose.model("StudentReport", studentReportSchema);
