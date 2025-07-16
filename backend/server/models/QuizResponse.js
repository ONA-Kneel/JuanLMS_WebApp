import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  answer: { type: mongoose.Schema.Types.Mixed, required: true }, // can be string, array, boolean, etc.
});

const QuizResponseSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [AnswerSchema],
  submittedAt: { type: Date, default: Date.now },
  graded: { type: Boolean, default: false },
  score: { type: Number },
  feedback: { type: String },
  checkedAnswers: [{
    correct: Boolean,
    studentAnswer: mongoose.Schema.Types.Mixed,
    correctAnswer: mongoose.Schema.Types.Mixed
  }],
}, { timestamps: true });

export default mongoose.model('QuizResponse', QuizResponseSchema); 