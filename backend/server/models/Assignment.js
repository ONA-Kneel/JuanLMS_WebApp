import mongoose from "mongoose";
const assignmentSchema = new mongoose.Schema({
  classID: { type: String, required: true },
  title: { type: String, required: true },
  instructions: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  dueDate: { type: Date },
  points: { type: Number },
  type: { type: String, enum: ['assignment', 'quiz'], default: 'assignment' },
  activityType: { type: String, enum: ['written', 'performance'], default: 'written' },
  description: { type: String },
  fileUploadRequired: { type: Boolean },
  allowedFileTypes: { type: String },
  fileInstructions: { type: String },
  questions: { type: Array },
  status: { type: String, enum: ['upcoming', 'past-due', 'completed'], default: 'upcoming' },
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedTo: [{
    classID: String,
    studentIDs: [String]
  }],
  attachmentLink: { type: String },
  attachmentFile: { type: String },
  postAt: { type: Date },
  // Quarter management fields
  quarter: { 
    type: String, 
    enum: ['Q1', 'Q2', 'Q3', 'Q4'], 
    required: true 
  },
  termName: { 
    type: String, 
    enum: ['Term 1', 'Term 2'], 
    required: true 
  },
  academicYear: { 
    type: String, 
    required: true 
  }
});

// Add unique compound index to prevent duplicate assignments
assignmentSchema.index({ 
  classID: 1, 
  title: 1, 
  quarter: 1, 
  termName: 1, 
  academicYear: 1 
}, { 
  unique: true,
  name: 'unique_assignment_per_class_quarter'
});

// Pre-save hook to ensure no duplicate views
assignmentSchema.pre('save', function(next) {
  if (this.views && this.views.length > 0) {
    // Remove duplicates by converting to strings, deduplicating, and converting back to ObjectIds
    const uniqueViews = [...new Set(this.views.map(view => view.toString()))]
      .map(viewId => new mongoose.Types.ObjectId(viewId));
    
    if (uniqueViews.length !== this.views.length) {
      console.log(`[DEBUG][MODEL] Removed ${this.views.length - uniqueViews.length} duplicate views from assignment ${this._id}`);
      this.views = uniqueViews;
    }
  }
  next();
});

export default mongoose.model("Assignment", assignmentSchema, "Assignments"); 