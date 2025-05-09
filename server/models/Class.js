import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  classID: { type: String, required: true, unique: true },
  className: { type: String, required: true },
  classCode: { type: String, required: true },
  classDesc: { type: String, required: true },
  members: [{ type: String, required: true }], // userIDs
  facultyID: { type: String, required: true },
});

export default mongoose.model("Class", classSchema, "Classes"); 