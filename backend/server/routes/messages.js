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
import { getIO } from '../server.js';

const router = express.Router();

// Storage configuration
const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);


async function initializeMessageStorage() {
  if (USE_CLOUDINARY) {
    console.log('[MESSAGES] Using Cloudinary storage');
    try {
      const { messageStorage } = await import('../config/cloudinary.js');
      return multer({ 
        storage: messageStorage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for messages
        fileFilter: (req, file, cb) => {
          const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'audio/mpeg', 'audio/mp3', 'video/mp4',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
          ];
          
          if (allowedTypes.includes(file.mimetype) ||
              file.originalname.endsWith('.xlsx') ||
              file.originalname.endsWith('.xls')) {
            cb(null, true);
          } else {
            cb(new Error('File type not allowed. Allowed types: images, PDF, Word docs, audio, video, Excel files'), false);
          }
        }
      });
    } catch (error) {
      console.error('[MESSAGES] Cloudinary setup failed, falling back to local storage:', error.message);
    }
  }
  
  // Local storage fallback
  console.log('[MESSAGES] Using local storage');
  const uploadDir = './uploads/messages';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
    }
  });
  
  return multer({ 
    storage: localStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for messages
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'audio/mpeg', 'audio/mp3', 'video/mp4',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (allowedTypes.includes(file.mimetype) ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls')) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed. Allowed types: images, PDF, Word docs, audio, video, Excel files'), false);
      }
    }
  });
}

// Initialize upload middleware
const upload = await initializeMessageStorage();

// --- POST / - send a message (optionally with a file) ---
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;
    // If a file is uploaded, store its URL
    const fileUrl = req.file ? (req.file.secure_url || req.file.path || `uploads/messages/${req.file.filename}`) : null;

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

    // --- Emit real-time event to receiver sockets (server-side guarantee) ---
    try {
      const io = getIO();
      const payload = {
        senderId,
        receiverId,
        text: newMessage.getDecryptedMessage(),
        fileUrl: newMessage.getDecryptedFileUrl(),
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Notify all connected sockets that belong to the receiver
      for (const [socketId, socket] of io.sockets.sockets) {
        if (socket.userId === receiverId) {
          io.to(socketId).emit('getMessage', payload);
          io.to(socketId).emit('receiveMessage', { ...payload, message: payload.text });
        }
      }
    } catch (emitErr) {
      console.error('[MESSAGES] Socket emit failed:', emitErr.message);
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// --- GET /user/:userId - fetch all messages involving the user (sent or received) ---
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const messages = await Message.find({}); // Cannot query by encrypted fields; decrypt then filter

    const decryptedMessages = messages.map((msg) => ({
      ...msg.toObject(),
      senderId: msg.getDecryptedSenderId(),
      receiverId: msg.getDecryptedReceiverId(),
      message: msg.getDecryptedMessage(),
      fileUrl: msg.getDecryptedFileUrl(),
    }));

    const userMessages = decryptedMessages.filter(
      (m) => m.senderId === userId || m.receiverId === userId
    );

    // Sort by createdAt ascending for consistency; clients can regroup as needed
    userMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(userMessages);
  } catch (err) {
    console.error('Error fetching user messages:', err);
    res.status(500).json({ error: 'Server error fetching user messages' });
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
