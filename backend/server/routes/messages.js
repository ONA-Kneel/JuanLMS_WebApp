// messages.js
// Handles sending and retrieving chat messages (with optional file attachments) between users in JuanLMS.
// Uses Multer for file upload and Mongoose for message storage.

import express from 'express';
import Message from '../models/Message.js';
import multer from "multer";
import path from "path";
import fs from "fs";
import { createMessageNotification } from '../services/notificationService.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Ensure upload directory exists ---
// This ensures the uploads/messages directory exists before saving files
const uploadDir = './uploads/messages';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// --- Multer setup for file uploads ---
// Multer is used to handle multipart/form-data (file uploads) in Express
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use a timestamp to avoid filename collisions
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// --- POST / - send a message (optionally with a file) ---
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;
    // If a file is uploaded, store its URL (relative to server root)
    const fileUrl = req.file ? `uploads/messages/${req.file.filename}` : null;

    // Message object structure: senderId, receiverId, message (text), fileUrl (optional)
    const newMessage = new Message({ senderId, receiverId, message, fileUrl });
    await newMessage.save();

    // Create notification for the receiver
    await createMessageNotification(senderId, receiverId, newMessage);

    // Return decrypted message to frontend
    res.status(201).json({
      ...newMessage.toObject(),
      senderId: newMessage.getDecryptedSenderId(),
      receiverId: newMessage.getDecryptedReceiverId(),
      message: newMessage.getDecryptedMessage(),
      fileUrl: newMessage.getDecryptedFileUrl(),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// --- GET /:userId/:chatWithId - fetch messages between two users ---
router.get('/:userId/:chatWithId', authenticateToken, async (req, res) => {
  const { userId, chatWithId } = req.params;
  try {
    const messages = await Message.find({}); // We'll filter after decrypting
    // Decrypt all fields
    const decryptedMessages = messages.map(msg => ({
      ...msg.toObject(),
      senderId: msg.getDecryptedSenderId(),
      receiverId: msg.getDecryptedReceiverId(),
      message: msg.getDecryptedMessage(),
      fileUrl: msg.getDecryptedFileUrl(),
    }));
    // Filter messages for this chat
    const filtered = decryptedMessages.filter(m =>
      (m.senderId === userId && m.receiverId === chatWithId) ||
      (m.senderId === chatWithId && m.receiverId === userId)
    );
    // Sort by createdAt (oldest first)
    filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(filtered);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Server error fetching messages" });
  }
});

export default router;
