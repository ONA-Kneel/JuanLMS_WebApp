// messages.js
// Handles sending and retrieving chat messages (with optional file attachments) between users in JuanLMS.
// Uses Multer for file upload and Mongoose for message storage.

import express from 'express';
import Message from '../models/Message.js';
import multer from "multer";
import path from "path";
import fs from "fs";

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
router.post('/', upload.single('file'), async (req, res) => {
  const { senderId, receiverId, message } = req.body;
  // If a file is uploaded, store its URL (relative to server root)
  const fileUrl = req.file ? `uploads/messages/${req.file.filename}` : null;

  // Message object structure: senderId, receiverId, message (text), fileUrl (optional)
  const newMessage = new Message({ senderId, receiverId, message, fileUrl });
  await newMessage.save();

  res.status(201).json(newMessage);
});

// --- GET /:userId/:chatWithId - fetch messages between two users ---
router.get('/:userId/:chatWithId', async (req, res) => {
  const { userId, chatWithId } = req.params;
  try {
    // Find all messages between the two users, sorted by timestamp (oldest first)
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: chatWithId },
        { senderId: chatWithId, receiverId: userId },
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Server error fetching messages" });
  }
});

export default router;
