// models/ForumPost.js
import mongoose from 'mongoose';
import { encrypt, decrypt } from "../utils/encryption.js";

const forumPostSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true }, // The group chat ID (SJDEF Forum)
    senderId: { type: String, required: true },
    message: {
      type: String,
      required: function () {
        return !this.fileUrl;
      },
      default: null,
    },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    // Forum-specific fields
    title: { type: String, default: null }, // Topic title (only for root posts)
    parentPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', default: null }, // For replies
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', default: null }, // Points to root post
    isRootPost: { type: Boolean, default: true }, // True for topics, false for replies
  },
  { timestamps: true }
);

// Encrypt sensitive fields before saving
forumPostSchema.pre("save", function (next) {
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

// Post-save hook: ensure threadId is set correctly
forumPostSchema.post("save", async function () {
  // If this is a root post, set threadId to its own _id
  if (this.isRootPost && !this.threadId) {
    this.threadId = this._id;
    await this.constructor.updateOne({ _id: this._id }, { threadId: this._id });
  }
  // If this is a reply, ensure threadId points to root
  else if (!this.isRootPost && this.parentPostId) {
    const parent = await this.constructor.findById(this.parentPostId);
    if (parent) {
      const rootThreadId = parent.threadId || parent._id;
      if (this.threadId?.toString() !== rootThreadId.toString()) {
        await this.constructor.updateOne({ _id: this._id }, { threadId: rootThreadId });
      }
    }
  }
});

// Decrypt methods
forumPostSchema.methods.getDecryptedGroupId = function () {
  return this.groupId ? decrypt(this.groupId) : null;
};

forumPostSchema.methods.getDecryptedSenderId = function () {
  return this.senderId ? decrypt(this.senderId) : null;
};

forumPostSchema.methods.getDecryptedMessage = function () {
  return this.message ? decrypt(this.message) : null;
};

forumPostSchema.methods.getDecryptedFileUrl = function () {
  return this.fileUrl ? decrypt(this.fileUrl) : null;
};

forumPostSchema.methods.getDecryptedTitle = function () {
  return this.title ? decrypt(this.title) : null;
};

const ForumPost = mongoose.model('ForumPost', forumPostSchema);

export default ForumPost;

