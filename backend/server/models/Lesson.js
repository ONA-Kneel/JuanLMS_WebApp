import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
  classID: { type: String, required: true },
  title: { type: String, required: true },
  // Optional external link for a lesson (e.g., Google Drive, external PDF)
  link: { type: String },
  files: [
    {
      fileUrl: String,
      fileName: String
    }
  ],
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Lesson", lessonSchema, "Lessons");
