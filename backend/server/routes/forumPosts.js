// forumPosts.js
// Handles forum posts and replies (separate from regular group messages)

import express from 'express';
import ForumPost from '../models/ForumPost.js';
import GroupChat from '../models/GroupChat.js';
import User from '../models/User.js';
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getIO } from '../server.js';

const router = express.Router();

console.log('[FORUM_POSTS] Route module loaded');

// Storage configuration
const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

async function initializeForumStorage() {
  if (USE_CLOUDINARY) {
    console.log('[FORUM_POSTS] Using Cloudinary storage');
    try {
      const { messageStorage } = await import('../config/cloudinary.js');
      return multer({ storage: messageStorage });
    } catch (error) {
      console.error('[FORUM_POSTS] Cloudinary setup failed, falling back to local storage:', error.message);
    }
  }
  
  console.log('[FORUM_POSTS] Using local storage');
  const uploadDir = './uploads/forum';
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

const upload = await initializeForumStorage();

console.log('[FORUM_POSTS] Upload middleware initialized, routes ready');

// --- POST / - Create a forum post or reply ---
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  console.log('[FORUM_POSTS] POST / received');
  try {
    const { groupId, senderId, message, parentPostId, title } = req.body;
    const fileUrl = req.file ? (req.file.secure_url || req.file.path || `uploads/forum/${req.file.filename}`) : null;

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

    const isReply = !!parentPostId;
    let threadId = null;

    if (isReply) {
      // This is a reply - find the parent post
      const parentPost = await ForumPost.findById(parentPostId);
      if (!parentPost) {
        return res.status(404).json({ error: "Parent post not found" });
      }
      
      const parentGroupId = parentPost.getDecryptedGroupId();
      if (parentGroupId !== groupId) {
        return res.status(400).json({ error: "Parent post does not belong to this group" });
      }
      
      // Get the threadId from parent (should point to root post)
      threadId = parentPost.threadId || parentPost._id;
    }

    const newPost = new ForumPost({
      groupId,
      senderId,
      message: message || null,
      fileUrl: fileUrl || null,
      fileName: req.file?.originalname || null,
      title: isReply ? null : (title?.trim() || null),
      parentPostId: isReply ? parentPostId : null,
      threadId: isReply ? threadId : null, // Will be set to _id in post-save hook for root posts
      isRootPost: !isReply,
    });

    await newPost.save();

    // Reload to get final values
    const savedPost = await ForumPost.findById(newPost._id);

    // Populate sender info
    const sender = await User.findById(senderId);
    const senderInfo = sender ? {
      senderName: `${sender.getDecryptedLastname()}, ${sender.getDecryptedFirstname()}`,
      senderFirstname: sender.getDecryptedFirstname(),
      senderLastname: sender.getDecryptedLastname(),
      senderProfilePic: sender.getDecryptedProfilePic(),
      senderRole: sender.role
    } : {
      senderName: "Unknown User",
      senderFirstname: "Unknown",
      senderLastname: "User",
      senderProfilePic: null,
      senderRole: null
    };

    const responseData = {
      _id: savedPost._id,
      groupId: savedPost.getDecryptedGroupId(),
      senderId: savedPost.getDecryptedSenderId(),
      message: savedPost.getDecryptedMessage(),
      fileUrl: savedPost.getDecryptedFileUrl(),
      fileName: savedPost.fileName,
      title: savedPost.getDecryptedTitle(),
      parentPostId: savedPost.parentPostId ? String(savedPost.parentPostId) : null,
      threadId: savedPost.threadId ? String(savedPost.threadId) : String(savedPost._id),
      isRootPost: savedPost.isRootPost,
      createdAt: savedPost.createdAt,
      updatedAt: savedPost.updatedAt,
      ...senderInfo
    };

    // Emit socket event for real-time updates
    try {
      const io = getIO();
      if (io) {
        io.to(groupId).emit("getForumPost", {
          ...responseData,
          text: responseData.message,
          parentMessageId: responseData.parentPostId, // For compatibility
        });
      }
    } catch (emitErr) {
      console.error('[FORUM_POSTS] Socket emit failed (non-fatal):', emitErr.message);
    }

    res.status(201).json(responseData);
  } catch (err) {
    console.error("Error creating forum post:", err);
    res.status(500).json({ error: "Server error creating forum post" });
  }
});

// --- GET /:groupId - Get all forum posts for a group ---
router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    // Verify user is a participant
    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    if (!groupChat.isParticipant(userId)) {
      return res.status(403).json({ error: "You are not a participant in this group" });
    }

    // Fetch all forum posts for this group
    const allPosts = await ForumPost.find({});
    
    // Decrypt and filter by groupId
    const decryptedPosts = allPosts
      .map(post => ({
        _id: post._id,
        groupId: post.getDecryptedGroupId(),
        senderId: post.getDecryptedSenderId(),
        message: post.getDecryptedMessage(),
        fileUrl: post.getDecryptedFileUrl(),
        fileName: post.fileName,
        title: post.getDecryptedTitle(),
        parentPostId: post.parentPostId ? String(post.parentPostId) : null,
        threadId: post.threadId ? String(post.threadId) : String(post._id),
        isRootPost: post.isRootPost,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      }))
      .filter(p => p.groupId === groupId);

    // Sort by createdAt (oldest first)
    decryptedPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Populate sender information
    const populatedPosts = await Promise.all(
      decryptedPosts.map(async (post) => {
        try {
          const sender = await User.findById(post.senderId);
          if (sender) {
            return {
              ...post,
              senderName: `${sender.getDecryptedLastname()}, ${sender.getDecryptedFirstname()}`,
              senderFirstname: sender.getDecryptedFirstname(),
              senderLastname: sender.getDecryptedLastname(),
              senderProfilePic: sender.getDecryptedProfilePic(),
              senderRole: sender.role
            };
          } else {
            return {
              ...post,
              senderName: "Unknown User",
              senderFirstname: "Unknown",
              senderLastname: "User",
              senderProfilePic: null,
              senderRole: null
            };
          }
        } catch (err) {
          console.error("Error populating sender info for forum post:", post._id, err);
          return {
            ...post,
            senderName: "Unknown User",
            senderFirstname: "Unknown",
            senderLastname: "User",
            senderProfilePic: null,
            senderRole: null
          };
        }
      })
    );
    
    res.json(populatedPosts);
  } catch (err) {
    console.error("Error fetching forum posts:", err);
    res.status(500).json({ error: "Server error fetching forum posts" });
  }
});

// --- DELETE /:postId - Delete a forum post ---
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    const groupChat = await GroupChat.findById(post.getDecryptedGroupId());
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    const senderId = post.getDecryptedSenderId();
    const isSender = senderId === userId;
    const isAdmin = groupChat.isAdmin(userId);

    if (!isSender && !isAdmin) {
      return res.status(403).json({ error: "You can only delete your own posts or must be an admin" });
    }

    await ForumPost.findByIdAndDelete(postId);
    res.json({ message: "Forum post deleted successfully" });
  } catch (err) {
    console.error("Error deleting forum post:", err);
    res.status(500).json({ error: "Server error deleting forum post" });
  }
});

export default router;

