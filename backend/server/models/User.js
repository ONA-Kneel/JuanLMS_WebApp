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
  contactNo: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{11}$/.test(v);
      },
      message: 'Contact number must be exactly 11 digits and contain only numbers.'
    }
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

// Hash password and encrypt sensitive fields before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified("email")) {
    this.emailHash = crypto.createHash('sha256').update(this.email.toLowerCase()).digest('hex');
    this.email = encrypt(this.email);
  }
  if (this.isModified("firstname")) {
    this.firstname = encrypt(this.firstname);
  }
  if (this.isModified("lastname")) {
    this.lastname = encrypt(this.lastname);
  }
  if (this.isModified("middlename")) {
    this.middlename = encrypt(this.middlename);
  }
  if (this.isModified("schoolID")) {
    // Validation based on role
    if (this.role === 'students') {
      if (!/^\d{2}-\d{5}$/.test(this.schoolID)) {
        return next(new Error('Student Number must be in the format YY-00000.'));
      }
    } else if (this.role === 'faculty') {
      if (!/^F00/.test(this.schoolID)) {
        return next(new Error('Faculty ID must start with F00.'));
      }
    } else if (this.role === 'admin') {
      if (!/^A00/.test(this.schoolID)) {
        return next(new Error('Admin ID must start with A00.'));
      }
    } else if (this.role === 'vice president of education' || this.role === 'principal') {
      if (!/^N00/.test(this.schoolID)) {
        return next(new Error('VP/Principal ID must start with N00.'));
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

userSchema.methods.getDecryptedFirstname = function () {
  return decrypt(this.firstname);
};

userSchema.methods.getDecryptedLastname = function () {
  return decrypt(this.lastname);
};

userSchema.methods.getDecryptedMiddlename = function () {
  return decrypt(this.middlename);
};

export default mongoose.model("User", userSchema);