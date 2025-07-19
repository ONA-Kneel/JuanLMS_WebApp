import mongoose from "mongoose";
const submissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  files: [{
    url: String,
    name: String
  }],
  fileUrl: { type: String }, // legacy, keep for backward compatibility
  fileName: { type: String }, // legacy, keep for backward compatibility
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['turned-in', 'graded'], default: 'turned-in' },
  grade: { type: Number },
  feedback: { type: String }
});
export default mongoose.model("Submission", submissionSchema, "Submissions"); 