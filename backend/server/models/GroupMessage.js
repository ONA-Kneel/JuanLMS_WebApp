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
    parentMessageId: { type: String, default: null },
    threadId: {
      type: String,
      default: function () {
        return this._id ? this._id.toString() : undefined;
      },
    },
    title: { type: String, default: null },
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
  if (this.isModified("title") && this.title) {
    this.title = encrypt(this.title);
  }
  next();
});

// Post-save hook: ensure threadId is set for new posts (root messages)
groupMessageSchema.post("save", async function () {
  // If this is a root post (no parentMessageId) and threadId is not set, set it to the message's _id
  if (!this.parentMessageId && !this.threadId && this._id) {
    this.threadId = this._id.toString();
    // Use updateOne to avoid triggering pre-save hooks again
    await this.constructor.updateOne({ _id: this._id }, { threadId: this.threadId });
  }
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
groupMessageSchema.methods.getDecryptedTitle = function () {
  return this.title ? decrypt(this.title) : null;
};

const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

export default GroupMessage; 