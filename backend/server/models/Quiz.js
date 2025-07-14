import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  instructions: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  dueDate: { type: Date },
  points: { type: Number, default: 100 }, // total points for the quiz
  type: { type: String, enum: ['quiz'], default: 'quiz' },
  questions: [
    {
      type: {
        type: String, // 'multiple', 'truefalse', 'identification'
        required: true
      },
      question: { type: String, required: true },
      choices: [String], // for multiple choice
      correctAnswers: [Number], // for multiple choice (indexes)
      correctAnswer: mongoose.Schema.Types.Mixed, // for true/false or identification
      points: { type: Number, default: 1 },
      required: { type: Boolean, default: true }
    }
  ],
  environment: { type: String },
  studentGroup: { type: String },
  schedulePost: { type: Boolean, default: false },
  // Timing attributes
  timing: {
    open: Date,
    openEnabled: Boolean,
    close: Date,
    closeEnabled: Boolean,
    timeLimit: Number, // in minutes
    timeLimitEnabled: Boolean,
    whenTimeExpires: String // e.g. 'auto-submit', 'grace-period'
  },
  // Question behaviour
  questionBehaviour: {
    shuffle: { type: Boolean, default: false }
  },
  // Safe Exam Browser
  safeExamBrowser: {
    required: { type: Boolean, default: false }
  },
  // Grading
  grading: {
    gradeToPass: { type: Number, default: 0 },
    attemptsAllowed: { type: String, default: 'Unlimited' }
  },
  // Attachments (optional)
  attachmentLink: { type: String },
  attachmentFile: { type: String },
  postAt: { type: Date },
  // Per-student assignment
  assignedTo: [{
    classID: { type: String, required: true },
    studentIDs: [{ type: String, required: true }]
  }]
});

export default mongoose.model("Quiz", quizSchema, "Quizzes"); 