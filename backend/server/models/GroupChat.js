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

// Helpers to avoid double-encryption and to safely decrypt values that may have been encrypted more than once
function isProbablyEncrypted(value) {
  return typeof value === 'string' && value.includes(':');
}

function deepDecrypt(value) {
  let output = value;
  // Attempt multiple decrypt passes (handles past double-encryption)
  for (let i = 0; i < 3; i += 1) {
    if (isProbablyEncrypted(output)) {
      const nextVal = decrypt(output);
      if (nextVal === output) break;
      output = nextVal;
    } else {
      break;
    }
  }
  return output;
}

// Encrypt sensitive fields before saving (only if not already encrypted)
groupChatSchema.pre("save", function (next) {
  if (this.isModified("name") && this.name) {
    this.name = isProbablyEncrypted(this.name) ? this.name : encrypt(this.name);
  }
  if (this.isModified("description") && this.description) {
    this.description = isProbablyEncrypted(this.description) ? this.description : encrypt(this.description);
  }
  if (this.isModified("createdBy") && this.createdBy) {
    this.createdBy = isProbablyEncrypted(this.createdBy) ? this.createdBy : encrypt(this.createdBy);
  }
  if (this.isModified("participants") && Array.isArray(this.participants)) {
    this.participants = this.participants.map(p => (isProbablyEncrypted(p) ? p : encrypt(p)));
  }
  if (this.isModified("admins") && Array.isArray(this.admins)) {
    this.admins = this.admins.map(a => (isProbablyEncrypted(a) ? a : encrypt(a)));
  }
  next();
});

// Decrypt methods
groupChatSchema.methods.getDecryptedName = function () {
  return this.name ? deepDecrypt(this.name) : null;
};

groupChatSchema.methods.getDecryptedDescription = function () {
  return this.description ? deepDecrypt(this.description) : null;
};

groupChatSchema.methods.getDecryptedCreatedBy = function () {
  return this.createdBy ? deepDecrypt(this.createdBy) : null;
};

groupChatSchema.methods.getDecryptedParticipants = function () {
  return this.participants.map(participant => deepDecrypt(participant));
};

groupChatSchema.methods.getDecryptedAdmins = function () {
  return this.admins.map(admin => deepDecrypt(admin));
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
    // Assign plain values; pre-save hook will encrypt as needed
    this.participants = [...decryptedParticipants, userId];
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
  
  // Assign plain values; pre-save hook will encrypt as needed
  this.participants = updatedParticipants;
  this.admins = updatedAdmins;
  return true;
};

const GroupChat = mongoose.model('GroupChat', groupChatSchema);

export default GroupChat; 