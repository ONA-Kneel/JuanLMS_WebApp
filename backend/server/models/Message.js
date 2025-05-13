// models/Message.js
import mongoose from 'mongoose';

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
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);

export default Message;

