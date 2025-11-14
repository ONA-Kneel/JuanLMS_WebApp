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

// Log Cloudinary configuration status
console.log('[MESSAGES] Cloudinary config check:', {
  hasUrl: !!process.env.CLOUDINARY_URL,
  hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
  hasApiKey: !!process.env.CLOUDINARY_API_KEY,
  hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
  useCloudinary: !!USE_CLOUDINARY,
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'not set'
});


// File filter to allow common document and media types
const fileFilter = (req, file, cb) => {
  // Allowed file types for messages
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain', 'text/csv',
    // Media
    'video/mp4', 'video/mpeg', 'video/quicktime',
    'audio/mpeg', 'audio/mp3', 'audio/wav',
    // Archives
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed', 'application/rar'
  ];

  // Also check file extension as fallback
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', 
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
    '.mp4', '.mpeg', '.mov', '.mp3', '.wav', '.zip', '.rar'];

  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

async function initializeMessageStorage() {
  // Re-check Cloudinary config at runtime (in case env vars were loaded after module import)
  const hasCloudinary = process.env.CLOUDINARY_URL || 
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  
  if (hasCloudinary) {
    console.log('[MESSAGES] Attempting to use Cloudinary storage');
    try {
      const { messageStorage } = await import('../config/cloudinary.js');
      console.log('[MESSAGES] Cloudinary storage initialized successfully');
      return multer({ 
        storage: messageStorage,
        fileFilter: fileFilter,
        limits: {
          fileSize: 50 * 1024 * 1024 // 50MB limit
        }
      });
    } catch (error) {
      console.error('[MESSAGES] Cloudinary setup failed:', error);
      console.error('[MESSAGES] Error stack:', error.stack);
      console.error('[MESSAGES] Falling back to local storage');
    }
  } else {
    console.log('[MESSAGES] Cloudinary not configured, using local storage');
  }
  
  // Local storage fallback
  const uploadDir = './uploads/messages';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('[MESSAGES] Created upload directory:', uploadDir);
  }
  
  const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
    }
  });
  
  console.log('[MESSAGES] Local storage initialized');
  return multer({ 
    storage: localStorage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit
    }
  });
}

// Initialize upload middleware
let upload = null;
let uploadPromise = null;

const getUpload = async () => {
  if (upload) return upload;
  if (!uploadPromise) {
    uploadPromise = (async () => {
      try {
        upload = await initializeMessageStorage();
        if (!upload) {
          throw new Error('Upload middleware initialization returned null');
        }
        console.log('[MESSAGES] Upload middleware ready');
        return upload;
      } catch (error) {
        console.error('[MESSAGES] Error initializing upload middleware:', error);
        console.error('[MESSAGES] Error stack:', error.stack);
        // Fallback to basic multer without storage
        upload = multer({
          fileFilter: fileFilter,
          limits: {
            fileSize: 50 * 1024 * 1024 // 50MB limit
          }
        });
        console.log('[MESSAGES] Using fallback multer (no storage)');
        return upload;
      }
    })();
  }
  return uploadPromise;
};

// Initialize on module load (non-blocking)
getUpload().catch(err => {
  console.error('[MESSAGES] Failed to initialize upload on module load:', err);
});

// Helper middleware to ensure upload is initialized
const ensureUpload = async (req, res, next) => {
  try {
    await getUpload();
    next();
  } catch (error) {
    console.error('Error ensuring upload middleware:', error);
    return res.status(503).json({ error: 'File upload service is initializing, please try again' });
  }
};

// --- POST / - send a message (optionally with a file) ---
router.post('/', (req, res, next) => {
  console.log('[MESSAGES] POST /messages route hit');
  console.log('[MESSAGES] Request headers:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    hasAuth: !!req.headers.authorization
  });
  next();
}, authenticateToken, (req, res, next) => {
  console.log('[MESSAGES] Authentication passed');
  next();
}, ensureUpload, async (req, res, next) => {
  try {
    const uploadMiddleware = await getUpload();
    if (!uploadMiddleware) {
      console.error('[MESSAGES] Upload middleware is null!');
      return res.status(500).json({ 
        error: 'File upload service not available',
        details: 'Upload middleware failed to initialize'
      });
    }
    
    console.log('[MESSAGES] Processing file upload with multer...');
    uploadMiddleware.single('file')(req, res, (err) => {
      if (err) {
        console.error('[MESSAGES] Multer error:', err);
        console.error('[MESSAGES] Multer error type:', err.constructor.name);
        // Handle multer errors (file filter, file size, etc.)
        if (err instanceof multer.MulterError) {
          console.error('[MESSAGES] MulterError code:', err.code);
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              error: 'File too large',
              details: 'Maximum file size is 50MB'
            });
          }
          return res.status(400).json({ 
            error: 'File upload error',
            details: err.message,
            code: err.code
          });
        }
        // Handle file filter errors
        if (err.message && err.message.includes('File type not allowed')) {
          return res.status(400).json({ 
            error: 'File type not allowed',
            details: err.message
          });
        }
        return res.status(400).json({ 
          error: 'File upload failed',
          details: err.message
        });
      }
      console.log('[MESSAGES] File upload processed, file:', req.file ? 'present' : 'not present');
      next();
    });
  } catch (uploadSetupError) {
    console.error('[MESSAGES] Error setting up upload middleware:', uploadSetupError);
    return res.status(500).json({ 
      error: 'Failed to setup file upload',
      details: uploadSetupError.message
    });
  }
}, async (req, res) => {
  try {
    console.log('[MESSAGES] POST / - Received request:', {
      hasFile: !!req.file,
      body: {
        senderId: req.body.senderId,
        receiverId: req.body.receiverId,
        message: req.body.message,
        messageLength: req.body.message?.length
      }
    });
    
    const { senderId, receiverId, message } = req.body;
    
    // Validate required fields
    if (!senderId || !receiverId) {
      console.error('[MESSAGES] Missing required fields:', { senderId: !!senderId, receiverId: !!receiverId });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: !senderId ? 'senderId is required' : 'receiverId is required'
      });
    }

    // If a file is uploaded, store its URL and original filename
    let fileUrl = null;
    let fileName = null;
    if (req.file) {
      // Store the original filename
      fileName = req.file.originalname || null;
      
      // Cloudinary returns secure_url, local storage returns path
      if (req.file.secure_url) {
        fileUrl = req.file.secure_url;
      } else if (req.file.path) {
        // For local storage, use the path as-is (it's already relative to server root)
        fileUrl = req.file.path;
      } else if (req.file.filename) {
        // Fallback: construct path from filename
        fileUrl = `uploads/messages/${req.file.filename}`;
      }
      
      console.log('[MESSAGES] File uploaded successfully:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        secure_url: req.file.secure_url || 'N/A',
        path: req.file.path || 'N/A',
        filename: req.file.filename || 'N/A',
        finalFileUrl: fileUrl,
        storedFileName: fileName
      });
    } else {
      console.log('[MESSAGES] No file in request');
    }

    // Validate that either message or fileUrl is provided
    if (!message && !fileUrl) {
      console.error('[MESSAGES] Validation failed: No message or file provided');
      return res.status(400).json({ 
        error: 'Either message text or file attachment is required'
      });
    }

    // Message object structure: senderId, receiverId, message (text), fileUrl (optional), fileName (optional)
    console.log('[MESSAGES] Creating message object:', {
      hasSenderId: !!senderId,
      hasReceiverId: !!receiverId,
      hasMessage: !!message,
      hasFileUrl: !!fileUrl,
      hasFileName: !!fileName,
      messageLength: message?.length || 0,
      fileUrlLength: fileUrl?.length || 0,
      fileName: fileName || 'N/A'
    });
    
    const newMessage = new Message({ senderId, receiverId, message: message || null, fileUrl, fileName });
    
    try {
      console.log('[MESSAGES] Attempting to save message to database...');
      await newMessage.save();
      console.log('[MESSAGES] Message saved successfully, _id:', newMessage._id);
    } catch (saveError) {
      console.error('[MESSAGES] Error saving message to database:', saveError);
      console.error('[MESSAGES] Save error name:', saveError.name);
      console.error('[MESSAGES] Save error message:', saveError.message);
      console.error('[MESSAGES] Save error stack:', saveError.stack);
      if (saveError.errors) {
        console.error('[MESSAGES] Validation errors:', saveError.errors);
      }
      return res.status(500).json({ 
        error: 'Failed to save message',
        details: saveError.message,
        errorType: saveError.name
      });
    }

    // Create notification for the receiver
    try {
    await createMessageNotification(senderId, receiverId, newMessage);
    } catch (notifError) {
      console.error('Error creating notification (non-fatal):', notifError.message);
      // Don't fail the request if notification fails
    }

    // Safely decrypt fields with error handling (declare outside try for socket emit access)
    let decryptedSenderId, decryptedReceiverId, decryptedMessage, decryptedFileUrl, decryptedFileName;
    
    // Return decrypted message to frontend
    try {
      
      try {
        decryptedSenderId = newMessage.getDecryptedSenderId();
      } catch (e) {
        console.error('Error decrypting senderId:', e);
        decryptedSenderId = senderId; // Fallback to original
      }
      
      try {
        decryptedReceiverId = newMessage.getDecryptedReceiverId();
      } catch (e) {
        console.error('Error decrypting receiverId:', e);
        decryptedReceiverId = receiverId; // Fallback to original
      }
      
      try {
        decryptedMessage = newMessage.getDecryptedMessage();
      } catch (e) {
        console.error('Error decrypting message:', e);
        decryptedMessage = message || null; // Fallback to original or null
      }
      
      try {
        decryptedFileUrl = newMessage.getDecryptedFileUrl();
      } catch (e) {
        console.error('Error decrypting fileUrl:', e);
        decryptedFileUrl = fileUrl || null; // Fallback to original or null
      }
      
      try {
        decryptedFileName = newMessage.getDecryptedFileName();
      } catch (e) {
        console.error('Error decrypting fileName:', e);
        decryptedFileName = fileName || null; // Fallback to original or null
      }
      
    res.status(201).json({
      ...newMessage.toObject(),
        senderId: decryptedSenderId,
        receiverId: decryptedReceiverId,
        message: decryptedMessage,
        fileUrl: decryptedFileUrl,
        fileName: decryptedFileName,
      });
    } catch (decryptError) {
      console.error('Error preparing response:', decryptError);
      console.error('Error stack:', decryptError.stack);
      return res.status(500).json({ 
        error: 'Failed to prepare message response',
        details: decryptError.message 
      });
    }

    // --- Emit real-time event to receiver sockets (server-side guarantee) ---
    try {
      const io = getIO();
      if (io) {
        // Use already decrypted values to avoid re-decryption errors
      const payload = {
          senderId: decryptedSenderId || senderId,
          receiverId: decryptedReceiverId || receiverId,
          text: decryptedMessage || '',
          fileUrl: decryptedFileUrl || null,
          fileName: decryptedFileName || null,
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
      }
    } catch (emitErr) {
      console.error('[MESSAGES] Socket emit failed (non-fatal):', emitErr.message);
      console.error('[MESSAGES] Socket emit error stack:', emitErr.stack);
    }
  } catch (error) {
    console.error('[MESSAGES] ========== UNHANDLED ERROR ==========');
    console.error('[MESSAGES] Error sending message:', error);
    console.error('[MESSAGES] Error name:', error.name);
    console.error('[MESSAGES] Error message:', error.message);
    console.error('[MESSAGES] Error stack:', error.stack);
    if (error.errors) {
      console.error('[MESSAGES] Error details:', error.errors);
    }
    console.error('[MESSAGES] =====================================');
    
    // Make sure we haven't already sent a response
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to send message',
        details: error.message,
        errorType: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      console.error('[MESSAGES] Response already sent, cannot send error response');
    }
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
      fileName: msg.getDecryptedFileName(),
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
      fileName: msg.getDecryptedFileName(),
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
