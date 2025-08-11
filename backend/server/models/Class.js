import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  classID: { type: String, required: true, unique: true },
  className: { type: String, required: true },
  classCode: { type: String, required: true, unique: true }, // Auto-generated unique identifier
  classDesc: { type: String, required: true },
  members: [{ type: String, required: true }], // userIDs
  facultyID: { type: String, required: true },
  image: { type: String }, // URL or path to the class image
  section: { type: String }, // Section name from academic settings (e.g., "CKY111", "ABM111")
  academicYear: { type: String }, // e.g., "2025-2026"
  termName: { type: String }, // e.g., "Term 1"
  isArchived: { type: Boolean, default: false }
});

export default mongoose.model("Class", classSchema, "Classes"); 