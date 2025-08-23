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
  postAt: { type: Date }
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