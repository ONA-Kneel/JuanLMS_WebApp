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
  },
  // Optional rubric scores 1-5
  behavior: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  classParticipation: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  classActivity: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  // Track if reports have been sent to VPE
  sentToVPE: {
    type: Boolean,
    default: false
  },
  sentToVPEDate: {
    type: Date,
    default: null
  },
  // Control visibility to VPE users
  show: {
    type: String,
    enum: ['yes', 'no'],
    default: 'no'
  }
}, {
  timestamps: true
});

// Index for better query performance
studentReportSchema.index({ facultyId: 1, date: -1 });
studentReportSchema.index({ studentId: 1, date: -1 });
studentReportSchema.index({ schoolYear: 1, termName: 1 });
studentReportSchema.index({ sentToVPE: 1, facultyId: 1 });
studentReportSchema.index({ show: 1, facultyId: 1 });

export default mongoose.model("StudentReport", studentReportSchema);

