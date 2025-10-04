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
  isArchived: { type: Boolean, default: false },
  isAutoCreated: { type: Boolean, default: false }, // Flag to indicate auto-created class
  needsConfirmation: { type: Boolean, default: false } // Flag to indicate faculty needs to confirm
});

// Enforce uniqueness for auto-created classes within (faculty, subject, section, term, schoolYear)
// Using a partial index to avoid affecting manually created classes
classSchema.index(
  { facultyID: 1, className: 1, section: 1, academicYear: 1, termName: 1 },
  { unique: true, name: 'uniq_auto_class_faculty_subject_section_term_year', partialFilterExpression: { isAutoCreated: true } }
);

export default mongoose.model("Class", classSchema, "Classes"); 