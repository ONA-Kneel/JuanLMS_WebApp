// models/GroupMessage.js
import mongoose from 'mongoose';
import { encrypt, decrypt } from "../utils/encryption.js";

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true },
    senderId: { type: String, required: true },
    message: {
      type: String,
      required: function () {
        // message is required only if fileUrl is NOT present
        return !this.fileUrl;
      },
      default: null,
    },
    fileUrl: { type: String, default: null },
  },
  { timestamps: true }
);

// Encrypt message and fileUrl before saving
groupMessageSchema.pre("save", function (next) {
  if (this.isModified("groupId") && this.groupId) {
    this.groupId = encrypt(this.groupId);
  }
  if (this.isModified("senderId") && this.senderId) {
    this.senderId = encrypt(this.senderId);
  }
  if (this.isModified("message") && this.message) {
    this.message = encrypt(this.message);
  }
  if (this.isModified("fileUrl") && this.fileUrl) {
    this.fileUrl = encrypt(this.fileUrl);
  }
  next();
});

// Decrypt methods
groupMessageSchema.methods.getDecryptedGroupId = function () {
  return this.groupId ? decrypt(this.groupId) : null;
};
groupMessageSchema.methods.getDecryptedSenderId = function () {
  return this.senderId ? decrypt(this.senderId) : null;
};
groupMessageSchema.methods.getDecryptedMessage = function () {
  return this.message ? decrypt(this.message) : null;
};
groupMessageSchema.methods.getDecryptedFileUrl = function () {
  return this.fileUrl ? decrypt(this.fileUrl) : null;
};

const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

export default GroupMessage; 