// routes/messages.js

import express from 'express';
import Message from '../models/Message.js';
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadDir = './uploads/messages';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

router.post('/', upload.single('file'), async (req, res) => {
  const { senderId, receiverId, message } = req.body;
  const fileUrl = req.file ? `uploads/messages/${req.file.filename}` : null;

  const newMessage = new Message({ senderId, receiverId, message, fileUrl });
  await newMessage.save();

  res.status(201).json(newMessage);
});

router.get('/:userId/:chatWithId', async (req, res) => {
  const { userId, chatWithId } = req.params;
  try {
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
