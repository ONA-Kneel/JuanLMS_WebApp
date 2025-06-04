import mongoose from "mongoose";

const lessonProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  fileUrl: { type: String, required: true },
  lastPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now }
});

lessonProgressSchema.index({ userId: 1, lessonId: 1, fileUrl: 1 }, { unique: true });

export default mongoose.model("LessonProgress", lessonProgressSchema, "LessonProgress"); 