import mongoose from "mongoose";
const submissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String },
  fileName: { type: String },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['turned-in', 'graded'], default: 'turned-in' },
  grade: { type: Number },
  feedback: { type: String }
});
export default mongoose.model("Submission", submissionSchema, "Submissions"); 