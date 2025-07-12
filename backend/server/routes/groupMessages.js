// groupMessages.js
// Handles sending and retrieving group chat messages (with optional file attachments)

import express from 'express';
import GroupMessage from '../models/GroupMessage.js';
import GroupChat from '../models/GroupChat.js';
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// --- Ensure upload directory exists ---
const uploadDir = './uploads/messages';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// --- Multer setup for file uploads ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// --- POST / - Send a message to a group chat ---
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { groupId, senderId, message } = req.body;
    const fileUrl = req.file ? `uploads/messages/${req.file.filename}` : null;

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
router.get('/:groupId', async (req, res) => {
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

    const messages = await GroupMessage.find({});
    
    // Decrypt all fields
    const decryptedMessages = messages.map(msg => ({
      _id: msg._id,
      groupId: msg.getDecryptedGroupId(),
      senderId: msg.getDecryptedSenderId(),
      message: msg.getDecryptedMessage(),
      fileUrl: msg.getDecryptedFileUrl(),
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    }));

    // Filter messages for this group
    const groupMessages = decryptedMessages.filter(m => m.groupId === groupId);
    
    // Sort by createdAt (oldest first)
    groupMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    res.json(groupMessages);
  } catch (err) {
    console.error("Error fetching group messages:", err);
    res.status(500).json({ error: "Server error fetching group messages" });
  }
});

// --- DELETE /:messageId - Delete a message (only sender or group admin can do this) ---
router.delete('/:messageId', async (req, res) => {
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