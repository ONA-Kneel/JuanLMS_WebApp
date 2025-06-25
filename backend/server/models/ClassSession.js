// models/ClassSession.js
import mongoose from 'mongoose';

const ClassSessionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  subject: String,
  schoolID: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId,
  termId: mongoose.Types.ObjectId,
  schoolYear: String
});

export default mongoose.model('ClassSession', ClassSessionSchema);