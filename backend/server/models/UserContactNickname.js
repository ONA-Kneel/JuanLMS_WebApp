// models/UserContactNickname.js
import mongoose from "mongoose";
import { encrypt, decrypt } from "../utils/encryption.js";

const userContactNicknameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nickname: {
    type: String,
    required: true,
    maxlength: 50
  }
}, {
  timestamps: true
});

// Create a compound index to ensure unique user-contact pairs
userContactNicknameSchema.index({ userId: 1, contactId: 1 }, { unique: true });

// Encrypt nickname before saving
userContactNicknameSchema.pre("save", async function (next) {
  if (this.isModified("nickname") && this.nickname) {
    this.nickname = encrypt(this.nickname);
  }
  next();
});

// Decrypt method
userContactNicknameSchema.methods.getDecryptedNickname = function () {
  if (!this.nickname) return null;
  if (typeof this.nickname === 'string' && this.nickname.includes(':')) {
    return decrypt(this.nickname);
  }
  return this.nickname;
};

export default mongoose.model("UserContactNickname", userContactNicknameSchema);


