//models/users.js - BACKUP

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
    required: false,
    validate: {
      validator: function(v) {
        return !v || /^\d{11}$/.test(v);
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
  // Track number of attempts to change password
  changePassAttempts: { type: Number, default: 0 },
  // If true, never show the change-password suggestion modal again
  changePassModal: { type: Boolean, default: false },
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
  // if (this.isModified("firstname")) {
  //   this.firstname = encrypt(this.firstname);
  // }
  // if (this.isModified("lastname")) {
  //   this.lastname = encrypt(this.lastname);
  // }
  // if (this.isModified("middlename")) {
  //   this.middlename = encrypt(this.middlename);
  // }
  if (this.isModified("schoolID")) {
    // Validation based on role
    if (this.role === 'students') {
      if (!/^\d{2}-\d{5}$/.test(this.schoolID)) {
        return next(new Error('Student Number must be in the format YY-00000.'));
      }
    } else if (this.role === 'faculty') {
      if (!/^F\d{3}$/.test(this.schoolID)) {
        return next(new Error('Faculty ID must be F followed by exactly 3 digits (e.g., F001, F010, F100).'));
      }
    } else if (this.role === 'admin') {
      if (!/^A\d{3}$/.test(this.schoolID)) {
        return next(new Error('Admin ID must be A followed by exactly 3 digits (e.g., A001, A010, A100).'));
      }
    } else if (this.role === 'vice president of education' || this.role === 'principal') {
      if (!/^N\d{3}$/.test(this.schoolID)) {
        return next(new Error('VP/Principal ID must be N followed by exactly 3 digits (e.g., N001, N010, N100).'));
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
  // firstname is not encrypted, return as-is
  return this.firstname;
};

userSchema.methods.getDecryptedLastname = function () {
  // lastname is not encrypted, return as-is
  return this.lastname;
};

userSchema.methods.getDecryptedMiddlename = function () {
  // middlename is not encrypted, return as-is
  return this.middlename;
};

export default mongoose.model("User", userSchema);
