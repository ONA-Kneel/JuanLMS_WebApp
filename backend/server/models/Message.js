// models/Message.js
import mongoose from 'mongoose';
import { encrypt, decrypt } from "../utils/encryption.js";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    message: {
      type: String,
      required: function () {
        // message is required only if fileUrl is NOT present
        return !this.fileUrl;
      },
      default: null,
    },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null }, // Store original filename
  },
  { timestamps: true }
);

// Encrypt message and fileUrl before saving
messageSchema.pre("save", function (next) {
  try {
    if (this.isModified("senderId") && this.senderId) {
      this.senderId = encrypt(this.senderId);
    }
    if (this.isModified("receiverId") && this.receiverId) {
      this.receiverId = encrypt(this.receiverId);
    }
    if (this.isModified("message") && this.message) {
      this.message = encrypt(this.message);
    }
  if (this.isModified("fileUrl") && this.fileUrl) {
    this.fileUrl = encrypt(this.fileUrl);
  }
  if (this.isModified("fileName") && this.fileName) {
    this.fileName = encrypt(this.fileName);
  }
  next();
  } catch (encryptError) {
    console.error('[MESSAGE MODEL] Encryption error in pre-save hook:', encryptError);
    console.error('[MESSAGE MODEL] Error details:', {
      hasSenderId: !!this.senderId,
      hasReceiverId: !!this.receiverId,
      hasMessage: !!this.message,
      hasFileUrl: !!this.fileUrl,
      fileUrlLength: this.fileUrl?.length || 0
    });
    next(encryptError); // Pass error to save callback
  }
});

// Decrypt methods
messageSchema.methods.getDecryptedSenderId = function () {
  return this.senderId ? decrypt(this.senderId) : null;
};
messageSchema.methods.getDecryptedReceiverId = function () {
  return this.receiverId ? decrypt(this.receiverId) : null;
};
messageSchema.methods.getDecryptedMessage = function () {
  return this.message ? decrypt(this.message) : null;
};
messageSchema.methods.getDecryptedFileUrl = function () {
  return this.fileUrl ? decrypt(this.fileUrl) : null;
};
messageSchema.methods.getDecryptedFileName = function () {
  return this.fileName ? decrypt(this.fileName) : null;
};

const Message = mongoose.model('Message', messageSchema);

export default Message;

