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
      return multer({ storage: messageStorage });
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
  return multer({ storage: localStorage });
}

// Initialize upload middleware
const upload = await initializeGroupMessageStorage();

// --- POST / - Send a message to a group chat ---
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { groupId, senderId, message, parentMessageId, title } = req.body;
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

    // Normalize parentMessageId - handle string, empty string, null, undefined
    const normalizedParentId = parentMessageId && String(parentMessageId).trim() 
      ? String(parentMessageId).trim() 
      : null;
    
    // Debug logging
    console.log('[POST /group-messages] Received:', {
      groupId,
      senderId,
      hasMessage: !!message,
      hasFile: !!fileUrl,
      rawParentMessageId: parentMessageId,
      normalizedParentId: normalizedParentId,
      parentMessageIdType: typeof parentMessageId,
      title: title
    });
    
    let resolvedThreadId = null;
    if (normalizedParentId) {
      const parentMessage = await GroupMessage.findById(normalizedParentId);
      if (!parentMessage) {
        console.error('[POST /group-messages] Parent message not found:', normalizedParentId);
        return res.status(404).json({ error: "Parent message not found" });
      }
      const parentGroupId = parentMessage.getDecryptedGroupId();
      if (parentGroupId !== groupId) {
        return res.status(400).json({ error: "Parent message does not belong to this group" });
      }
      // For replies, always use parent's threadId (or parent's _id if parent is root)
      resolvedThreadId = (parentMessage.threadId && String(parentMessage.threadId).trim()) 
        ? String(parentMessage.threadId).trim() 
        : String(parentMessage._id);
      console.log('[POST /group-messages] Reply detected:', {
        normalizedParentId,
        resolvedThreadId,
        parentThreadId: parentMessage.threadId
      });
    }

    const newMessage = new GroupMessage({
      groupId,
      senderId,
      message,
      fileUrl,
      parentMessageId: normalizedParentId,
      threadId: resolvedThreadId, // For replies, this should be set; for new posts, it's null
      title: title?.trim() ? title.trim() : null,
    });

    // Explicitly mark parentMessageId as modified to ensure it's saved even if null
    if (normalizedParentId !== undefined) {
      newMessage.markModified('parentMessageId');
    }
    
    await newMessage.save();
    
    // Reload from database to verify what was actually saved
    const savedMessage = await GroupMessage.findById(newMessage._id);
    
    console.log('[POST /group-messages] Saved message:', {
      _id: String(savedMessage._id),
      parentMessageId: savedMessage.parentMessageId,
      parentMessageIdType: typeof savedMessage.parentMessageId,
      threadId: savedMessage.threadId,
      hasParent: !!savedMessage.parentMessageId,
      normalizedParentId: normalizedParentId
    });

    // For new posts (no parentMessageId), set threadId to the message's own _id
    if (!normalizedParentId) {
      if (!savedMessage.threadId) {
        savedMessage.threadId = String(savedMessage._id);
        await savedMessage.save();
      }
    } else {
      // For replies, ensure threadId and parentMessageId are set correctly
      if (!savedMessage.threadId || String(savedMessage.threadId).trim() === '') {
        // Re-fetch parent to get its threadId as fallback
        const parentMsg = await GroupMessage.findById(normalizedParentId);
        if (parentMsg) {
          const parentThreadId = (parentMsg.threadId && String(parentMsg.threadId).trim())
            ? String(parentMsg.threadId).trim()
            : String(parentMsg._id);
          savedMessage.threadId = parentThreadId;
          await savedMessage.save();
        }
      }
      
      // Double-check parentMessageId was saved - CRITICAL FIX
      if (!savedMessage.parentMessageId && normalizedParentId) {
        console.error('[POST /group-messages] WARNING: parentMessageId was not saved! Forcing update...', {
          messageId: String(savedMessage._id),
          expectedParentId: normalizedParentId
        });
        // Force update parentMessageId using updateOne to bypass any hooks
        await GroupMessage.updateOne(
          { _id: savedMessage._id },
          { $set: { parentMessageId: normalizedParentId } }
        );
      }
    }

    // Reload one more time to get the absolute latest values
    const finalMessage = await GroupMessage.findById(savedMessage._id);
    const finalThreadId = finalMessage.threadId 
      ? String(finalMessage.threadId) 
      : (normalizedParentId ? null : String(finalMessage._id)); // For replies, don't fallback to _id

    const finalParentId = finalMessage.parentMessageId 
      ? String(finalMessage.parentMessageId) 
      : null;

    console.log('[POST /group-messages] Final message before response:', {
      _id: String(finalMessage._id),
      parentMessageId: finalParentId,
      threadId: finalThreadId,
      title: finalMessage.getDecryptedTitle()
    });

    // Return decrypted message to frontend
    res.status(201).json({
      _id: finalMessage._id,
      groupId: finalMessage.getDecryptedGroupId(),
      senderId: finalMessage.getDecryptedSenderId(),
      message: finalMessage.getDecryptedMessage(),
      fileUrl: finalMessage.getDecryptedFileUrl(),
      parentMessageId: finalParentId,
      threadId: finalThreadId || String(finalMessage._id), // Final fallback only for root posts
      title: finalMessage.getDecryptedTitle(),
      createdAt: finalMessage.createdAt,
      updatedAt: finalMessage.updatedAt,
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
    
    // First pass: decrypt and filter by groupId
    const decryptedMessages = messages
      .map(msg => {
        // Debug: Log raw parentMessageId from database
        const rawParentId = msg.parentMessageId;
        const rawThreadId = msg.threadId;
        
        // Convert parentMessageId - handle ObjectId, string, null, undefined
        let parentMessageId = null;
        if (rawParentId !== null && rawParentId !== undefined) {
          if (typeof rawParentId === 'object' && rawParentId.toString) {
            // It's an ObjectId
            parentMessageId = rawParentId.toString();
          } else {
            parentMessageId = String(rawParentId);
          }
        }
        
        // Convert threadId
        let threadId = null;
        if (rawThreadId !== null && rawThreadId !== undefined) {
          if (typeof rawThreadId === 'object' && rawThreadId.toString) {
            threadId = rawThreadId.toString();
          } else {
            threadId = String(rawThreadId);
          }
        }
        
        const decrypted = {
          _id: msg._id,
          groupId: msg.getDecryptedGroupId(),
          senderId: msg.getDecryptedSenderId(),
          message: msg.getDecryptedMessage(),
          fileUrl: msg.getDecryptedFileUrl(),
          parentMessageId: parentMessageId,
          threadId: threadId,
          title: msg.getDecryptedTitle(),
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
        };
        
        // Debug logging for messages with parentMessageId
        if (parentMessageId) {
          console.log('[GET /group-messages] Found reply:', {
            _id: String(msg._id),
            parentMessageId: parentMessageId,
            threadId: threadId,
            rawParentId: rawParentId,
            rawParentIdType: typeof rawParentId
          });
        }
        
        return decrypted;
      })
      .filter(m => m.groupId === groupId);
    
    console.log('[GET /group-messages] Total messages for group:', decryptedMessages.length);
    console.log('[GET /group-messages] Messages with parentMessageId:', decryptedMessages.filter(m => m.parentMessageId).length);
    
    // Second pass: resolve threadId for messages that don't have it set
    // Create a map of message _id to threadId for quick lookup
    const messageMap = new Map();
    decryptedMessages.forEach(msg => {
      messageMap.set(String(msg._id), msg);
    });
    
    // Resolve threadId for each message
    decryptedMessages.forEach(msg => {
      if (!msg.threadId) {
        if (msg.parentMessageId) {
          // This is a reply - find parent and use its threadId
          const parent = messageMap.get(msg.parentMessageId);
          if (parent) {
            msg.threadId = parent.threadId || String(parent._id);
          } else {
            // Parent not found in this batch, try to fetch it
            // For now, use parent's _id as threadId (assuming parent is root)
            msg.threadId = msg.parentMessageId;
          }
        } else {
          // This is a root post - use its own _id
          msg.threadId = String(msg._id);
        }
      }
    });
    
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