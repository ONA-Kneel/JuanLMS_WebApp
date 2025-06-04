//models/users.js

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstname: String,
  middlename: String,
  lastname: String,
  email: String,
  personalemail: String,
  contactno: String,
  // password: String, // plain text for now
  role: String,
  userID: String,

  // Assignment Handles
  programAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    default: null,
  },
  courseAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null,
  },
  sectionAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    default: null,
  },
  yearLevelAssigned: {
    type: String,
    default: null,
  },

  // Archive & Recovery fields
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  archiveAttempts: { type: Number, default: 0 },
  archiveLockUntil: { type: Date, default: null },
  recoverAttempts: { type: Number, default: 0 },
  recoverLockUntil: { type: Date, default: null },
});

export default mongoose.model("User", userSchema);