//models/users.js

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { encrypt, decrypt } from "../utils/encryption.js";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
  firstname: String,
  middlename: String,
  lastname: String,
  email: String,
  emailHash: String,
  personalemail: String,
  personalemailHash: String,
  schoolID: String,
  password: String,
  role: String,
  userID: String,
  profilePic: { type: String, default: null },

  // Archive & Recovery fields
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  archiveAttempts: { type: Number, default: 0 },
  archiveLockUntil: { type: Date, default: null },
  recoverAttempts: { type: Number, default: 0 },
  recoverLockUntil: { type: Date, default: null },
});

// Hash password and encrypt sensitive fields before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified("email")) {
    this.emailHash = crypto.createHash('sha256').update(this.email.toLowerCase()).digest('hex');
    this.email = encrypt(this.email);
  }
  if (this.isModified("schoolID")) {
    // Validation based on role
    if (this.role === 'students') {
      if (!/^\d{12}$/.test(this.schoolID)) {
        return next(new Error('Student LRN must be a 12-digit number.'));
      }
    } else {
      if (!/^\d{2}-\d{4}$/.test(this.schoolID)) {
        return next(new Error('School ID must be in the format NN-NNNN for non-students.'));
      }
    }
    this.schoolID = encrypt(this.schoolID);
  }
  if (this.isModified("personalemail")) {
    this.personalemailHash = crypto.createHash('sha256').update(this.personalemail.toLowerCase()).digest('hex');
    this.personalemail = encrypt(this.personalemail);
  }
  if (this.isModified("profilePic") && this.profilePic) {
    this.profilePic = encrypt(this.profilePic);
  }
  next();
});

// Decrypt methods
userSchema.methods.getDecryptedEmail = function () {
  return decrypt(this.email);
};
userSchema.methods.getDecryptedSchoolID = function () {
  return decrypt(this.schoolID);
};
userSchema.methods.getDecryptedPersonalEmail = function () {
  return decrypt(this.personalemail);
};
userSchema.methods.getDecryptedProfilePic = function () {
  if (!this.profilePic) return null;
  if (typeof this.profilePic === 'string' && this.profilePic.includes(':')) {
    return decrypt(this.profilePic);
  }
  return this.profilePic;
};

export default mongoose.model("User", userSchema);