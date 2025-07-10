// models/GroupChat.js
import mongoose from 'mongoose';
import { encrypt, decrypt } from "../utils/encryption.js";

const groupChatSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    createdBy: { type: String, required: true },
    participants: [{ type: String, required: true }], // Array of user IDs
    admins: [{ type: String, required: true }], // Array of admin user IDs
    isActive: { type: Boolean, default: true },
    maxParticipants: { type: Number, default: 50 },
  },
  { timestamps: true }
);

// Encrypt sensitive fields before saving
groupChatSchema.pre("save", function (next) {
  if (this.isModified("name") && this.name) {
    this.name = encrypt(this.name);
  }
  if (this.isModified("description") && this.description) {
    this.description = encrypt(this.description);
  }
  if (this.isModified("createdBy") && this.createdBy) {
    this.createdBy = encrypt(this.createdBy);
  }
  if (this.isModified("participants")) {
    this.participants = this.participants.map(participant => encrypt(participant));
  }
  if (this.isModified("admins")) {
    this.admins = this.admins.map(admin => encrypt(admin));
  }
  next();
});

// Decrypt methods
groupChatSchema.methods.getDecryptedName = function () {
  return this.name ? decrypt(this.name) : null;
};

groupChatSchema.methods.getDecryptedDescription = function () {
  return this.description ? decrypt(this.description) : null;
};

groupChatSchema.methods.getDecryptedCreatedBy = function () {
  return this.createdBy ? decrypt(this.createdBy) : null;
};

groupChatSchema.methods.getDecryptedParticipants = function () {
  return this.participants.map(participant => decrypt(participant));
};

groupChatSchema.methods.getDecryptedAdmins = function () {
  return this.admins.map(admin => decrypt(admin));
};

// Method to check if user is admin
groupChatSchema.methods.isAdmin = function (userId) {
  const decryptedAdmins = this.getDecryptedAdmins();
  return decryptedAdmins.includes(userId);
};

// Method to check if user is participant
groupChatSchema.methods.isParticipant = function (userId) {
  const decryptedParticipants = this.getDecryptedParticipants();
  return decryptedParticipants.includes(userId);
};

// Method to add participant
groupChatSchema.methods.addParticipant = function (userId) {
  const decryptedParticipants = this.getDecryptedParticipants();
  if (!decryptedParticipants.includes(userId) && decryptedParticipants.length < this.maxParticipants) {
    decryptedParticipants.push(userId);
    this.participants = decryptedParticipants.map(participant => encrypt(participant));
    return true;
  }
  return false;
};

// Method to remove participant
groupChatSchema.methods.removeParticipant = function (userId) {
  const decryptedParticipants = this.getDecryptedParticipants();
  const decryptedAdmins = this.getDecryptedAdmins();
  
  // Don't allow removing the creator
  if (userId === this.getDecryptedCreatedBy()) {
    return false;
  }
  
  const updatedParticipants = decryptedParticipants.filter(p => p !== userId);
  const updatedAdmins = decryptedAdmins.filter(a => a !== userId);
  
  this.participants = updatedParticipants.map(participant => encrypt(participant));
  this.admins = updatedAdmins.map(admin => encrypt(admin));
  return true;
};

const GroupChat = mongoose.model('GroupChat', groupChatSchema);

export default GroupChat; 