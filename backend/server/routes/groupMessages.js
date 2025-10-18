// groupMessages.js
// Handles sending and retrieving group chat messages (with optional file attachments)

import express from 'express';
import GroupMessage from '../models/GroupMessage.js';
import GroupChat from '../models/GroupChat.js';
import User from '../models/User.js';
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Storage configuration
const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);


async function initializeGroupMessageStorage() {
  if (USE_CLOUDINARY) {
    console.log('[GROUP_MESSAGES] Using Cloudinary storage');
    try {
      const { messageStorage } = await import('../config/cloudinary.js');
      return multer({ 
        storage: messageStorage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for group messages
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
      console.error('[GROUP_MESSAGES] Cloudinary setup failed, falling back to local storage:', error.message);
    }
  }
  
  // Local storage fallback
  console.log('[GROUP_MESSAGES] Using local storage');
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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for group messages
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
const upload = await initializeGroupMessageStorage();

// --- POST / - Send a message to a group chat ---
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { groupId, senderId, message } = req.body;
    const fileUrl = req.file ? (req.file.secure_url || req.file.path || `uploads/messages/${req.file.filename}`) : null;

    if (!groupId || !senderId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify sender is a participant in the group
    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    if (!groupChat.isParticipant(senderId)) {
      return res.status(403).json({ error: "You are not a participant in this group" });
    }

    const newMessage = new GroupMessage({
      groupId,
      senderId,
      message,
      fileUrl,
    });

    await newMessage.save();

    // Return decrypted message to frontend
    res.status(201).json({
      _id: newMessage._id,
      groupId: newMessage.getDecryptedGroupId(),
      senderId: newMessage.getDecryptedSenderId(),
      message: newMessage.getDecryptedMessage(),
      fileUrl: newMessage.getDecryptedFileUrl(),
      createdAt: newMessage.createdAt,
      updatedAt: newMessage.updatedAt,
    });
  } catch (err) {
    console.error("Error sending group message:", err);
    res.status(500).json({ error: "Server error sending group message" });
  }
});

// --- GET /:groupId - Get all messages from a group chat ---
router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.query; // To verify user is participant

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    // Verify user is a participant in the group
    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    if (!groupChat.isParticipant(userId)) {
      return res.status(403).json({ error: "You are not a participant in this group" });
    }

    // Since groupId is encrypted in the database, we need to fetch all and filter
    // This is a limitation of the current encryption approach
    const messages = await GroupMessage.find({});
    
    // Decrypt all fields and filter by groupId
    const decryptedMessages = messages
      .map(msg => ({
        _id: msg._id,
        groupId: msg.getDecryptedGroupId(),
        senderId: msg.getDecryptedSenderId(),
        message: msg.getDecryptedMessage(),
        fileUrl: msg.getDecryptedFileUrl(),
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      }))
      .filter(m => m.groupId === groupId);
    
    // Sort by createdAt (oldest first)
    decryptedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Populate sender information for each message
    const populatedMessages = await Promise.all(
      decryptedMessages.map(async (msg) => {
        try {
          const sender = await User.findById(msg.senderId);
          if (sender) {
            return {
              ...msg,
              senderName: `${sender.getDecryptedLastname()}, ${sender.getDecryptedFirstname()}`,
              senderFirstname: sender.getDecryptedFirstname(),
              senderLastname: sender.getDecryptedLastname(),
              senderProfilePic: sender.getDecryptedProfilePic(),
              senderRole: sender.role
            };
          } else {
            return {
              ...msg,
              senderName: "Unknown User",
              senderFirstname: "Unknown",
              senderLastname: "User",
              senderProfilePic: null,
              senderRole: null
            };
          }
        } catch (err) {
          console.error("Error populating sender info for message:", msg._id, err);
          return {
            ...msg,
            senderName: "Unknown User",
            senderFirstname: "Unknown",
            senderLastname: "User",
            senderProfilePic: null,
            senderRole: null
          };
        }
      })
    );
    
    res.json(populatedMessages);
  } catch (err) {
    console.error("Error fetching group messages:", err);
    res.status(500).json({ error: "Server error fetching group messages" });
  }
});

// --- DELETE /:messageId - Delete a message (only sender or group admin can do this) ---
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const message = await GroupMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const groupChat = await GroupChat.findById(message.getDecryptedGroupId());
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    const senderId = message.getDecryptedSenderId();
    const isSender = senderId === userId;
    const isAdmin = groupChat.isAdmin(userId);

    if (!isSender && !isAdmin) {
      return res.status(403).json({ error: "You can only delete your own messages or must be an admin" });
    }

    await GroupMessage.findByIdAndDelete(messageId);
    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting group message:", err);
    res.status(500).json({ error: "Server error deleting group message" });
  }
});

export default router; 