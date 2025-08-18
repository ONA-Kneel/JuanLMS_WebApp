import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  instructions: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  dueDate: { type: Date },
  points: { type: Number, min: 1, max: 100, default: 100 }, // total points for the quiz
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
      points: { type: Number, min: 1, default: 1 },
      required: { type: Boolean, default: true },
      image: { type: String } // URL for question image
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

// Ensure total points are synchronized and within 1–100 on save/update
quizSchema.pre('validate', function(next) {
  try {
    const total = Array.isArray(this.questions)
      ? this.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)
      : 0;
    // Keep points in sync with sum of question points
    this.points = total;
    if (total < 1 || total > 100) {
      return next(new Error('Total quiz points must be between 1 and 100.'));
    }
    // Guard each question's points
    if (Array.isArray(this.questions)) {
      for (const q of this.questions) {
        const qp = Number(q.points) || 0;
        if (qp < 1) {
          return next(new Error('Each question must be at least 1 point.'));
        }
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
});

export default mongoose.model("Quiz", quizSchema, "Quizzes"); 