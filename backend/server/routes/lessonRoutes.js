// lessonRoutes.js
// Handles lesson upload (with multiple files) and retrieval for classes in JuanLMS.
// Uses Multer for file upload and Mongoose for lesson storage.

import express from 'express';
import multer from 'multer';
import Lesson from '../models/Lesson.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import database from '../connect.cjs';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authMiddleware.js';
import LessonProgress from '../models/LessonProgress.js';
import { getIO } from '../server.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lessonsUploadDir = path.join(__dirname, '..', 'uploads', 'lessons');

// Storage configuration
// Temporarily disable Cloudinary to test with local storage
const USE_CLOUDINARY = false; // process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);


async function initializeLessonStorage() {
  if (USE_CLOUDINARY) {
    console.log('[LESSONS] Using Cloudinary storage');
    try {
      const { lessonStorage } = await import('../config/cloudinary.js');
      return multer({
        storage: lessonStorage,
        limits: { 
          fileSize: 100 * 1024 * 1024, // 100MB per file
          files: 5 // Maximum 5 files per upload
        },
        fileFilter: (req, file, cb) => {
          // Check file size before processing
          if (file.size && file.size > 100 * 1024 * 1024) {
            return cb(new Error('File size exceeds 100MB limit'), false);
          }
          cb(null, true); // Accept all file types for lesson materials
        }
      });
    } catch (error) {
      console.error('[LESSONS] Cloudinary setup failed, falling back to local storage:', error.message);
      // Force fallback to local storage
    }
  }
  
  // Local storage fallback
  console.log('[LESSONS] Using local storage');
  
  // Ensure uploads directory exists
  if (!fs.existsSync(lessonsUploadDir)) {
    fs.mkdirSync(lessonsUploadDir, { recursive: true });
    console.log('[LESSONS] Created uploads directory:', lessonsUploadDir);
  }
  
  const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, lessonsUploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });
  return multer({
    storage: localStorage,
    limits: { 
      fileSize: 100 * 1024 * 1024, // 100MB per file
      files: 5 // Maximum 5 files per upload
    },
    fileFilter: (req, file, cb) => {
      // Check file size before processing
      if (file.size && file.size > 100 * 1024 * 1024) {
        return cb(new Error('File size exceeds 100MB limit'), false);
      }
      cb(null, true);
    }
  });
}

// Initialize upload middleware
let upload;
try {
  upload = await initializeLessonStorage();
  console.log('[LESSONS] Upload middleware initialized successfully');
} catch (error) {
  console.error('[LESSONS] Failed to initialize upload middleware:', error);
  // Create a fallback multer instance
  upload = multer({
    storage: multer.memoryStorage(),
    limits: { 
      fileSize: 100 * 1024 * 1024, // 100MB per file
      files: 5 // Maximum 5 files per upload
    }
  });
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uploadConfigured: !!upload
  });
});

// Test endpoint to check if the route is working
router.post('/test', authenticateToken, async (req, res) => {
  try {
    console.log('[LESSONS] Test endpoint hit');
    res.json({ 
      status: 'ok', 
      message: 'Lesson route is working',
      timestamp: new Date().toISOString(),
      body: req.body
    });
  } catch (error) {
    console.error('[LESSONS] Test endpoint error:', error);
    res.status(500).json({ error: 'Test endpoint failed' });
  }
});

// --- POST /lessons - upload lesson with multiple files ---
// Accepts up to 5 files per lesson
router.post('/', authenticateToken, upload.array('files', 5), async (req, res) => {
  console.log('[LESSONS] POST /lessons route hit');
  try {
    console.log('[LESSONS] Upload request received:', {
      classID: req.body.classID,
      title: req.body.title,
      hasFiles: !!req.files,
      fileCount: req.files ? req.files.length : 0,
      link: req.body.link,
      userId: req.user._id,
      userRole: req.user.role
    });

    const { classID, title, link } = req.body;
    if (!classID || !title) {
      console.log('[LESSONS] Missing required fields:', { classID, title });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for duplicate lesson titles in the same class
    const existingLesson = await Lesson.findOne({ 
      classID: classID, 
      title: { $regex: new RegExp(`^${title.trim()}$`, 'i') } 
    });
    
    if (existingLesson) {
      console.log('[LESSONS] Duplicate lesson found:', { classID, title });
      return res.status(400).json({ 
        error: `A lesson with the title "${title}" already exists in this class. Please use a different title.` 
      });
    }

    // Map uploaded files when present
    const files = Array.isArray(req.files) && req.files.length > 0
      ? req.files.map(file => {
          console.log('[LESSONS] Processing file:', {
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            hasSecureUrl: !!file.secure_url,
            hasPath: !!file.path,
            filename: file.filename
          });
          return {
            fileUrl: file.secure_url || file.path || `/uploads/lessons/${file.filename}`,
            fileName: file.originalname
          };
        })
      : [];

    // Disallow empty lessons with neither files nor link
    if ((!link || String(link).trim() === '') && files.length === 0) {
      console.log('[LESSONS] Empty lesson rejected:', { hasLink: !!link, fileCount: files.length });
      return res.status(400).json({ error: 'Provide at least one file or a link.' });
    }

    console.log('[LESSONS] Creating lesson with data:', {
      classID,
      title: title.trim(),
      fileCount: files.length,
      hasLink: !!link
    });

    const lesson = new Lesson({ classID, title: title.trim(), files, link });
    await lesson.save();
    
    console.log('[LESSONS] Lesson saved successfully:', { lessonId: lesson._id });

    // Create audit log for material upload
    const db = database.getDb();
    await db.collection('AuditLogs').insertOne({
      userId: new ObjectId(req.user._id),
      userName: `${req.user.firstname} ${req.user.lastname}`,
      userRole: req.user.role,
      action: `${req.user.role.toUpperCase()}_UPLOAD_MATERIAL`,
      details: `Uploaded ${files.length} file(s) for lesson "${title}" in class ${classID}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      timestamp: new Date()
    });

    // Emit real-time update to all users in the class
    const io = getIO();
    if (io) {
      io.to(`class_${classID}`).emit('newLesson', {
        lesson,
        classID,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({ success: true, lesson });
  } catch (err) {
    console.error('[LESSONS] Upload error:', {
      message: err.message,
      code: err.code,
      name: err.name,
      stack: err.stack
    });
    
    // Handle specific error types
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 100MB per file.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum 5 files per upload.' });
    }
    if (err.message && err.message.includes('File size exceeds')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid lesson data provided.' });
    }
    if (err.message && err.message.includes('Cloudinary')) {
      return res.status(500).json({ error: 'File upload service temporarily unavailable. Please try again.' });
    }
    if (err.message && err.message.includes('timeout')) {
      return res.status(408).json({ error: 'Upload timed out. Please try again with a smaller file.' });
    }
    if (err.message && err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: 'Upload service unavailable. Please try again later.' });
    }
    
    res.status(500).json({ error: 'Failed to upload lesson. Please try again.' });
  }
});

// --- GET /lessons?classID=... - fetch lessons for a class ---
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.query;
    if (!classID) return res.status(400).json({ error: 'classID required' });
    // Find lessons for the given class, most recent first
    // Each lesson contains an array of files (with fileUrl and fileName)
    const lessons = await Lesson.find({ classID }).sort({ uploadedAt: -1 });
    res.json(lessons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// Add Multer error handler for file size and other upload errors
router.use((err, req, res, next) => {
  console.error('[LESSONS] Multer error:', {
    code: err.code,
    message: err.message,
    field: err.field,
    name: err.name
  });
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Max size is 100MB per file.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files. Maximum 5 files per upload.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field. Please use the correct file input.' });
  }
  if (err.message && err.message.includes('File size exceeds')) {
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes('Cloudinary')) {
    return res.status(500).json({ error: 'File upload service temporarily unavailable. Please try again.' });
  }
  
  next(err);
});

// --- Direct file serving helper route (optional): /lessons/files/:filename[?download=1]
router.get('/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(lessonsUploadDir, filename);
  const forceDownload = String(req.query.download || '').toLowerCase() === '1';
  if (forceDownload) {
    res.download(filePath);
  } else {
    res.sendFile(filePath);
  }
});

// --- LESSON PROGRESS ROUTES ---
// POST /lesson-progress: set/update progress
router.post('/lesson-progress', authenticateToken, async (req, res) => {
  try {
    const { lessonId, fileUrl, lastPage, totalPages } = req.body;
    if (!lessonId || !fileUrl || lastPage == null || totalPages == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const filter = { userId: req.user._id, lessonId, fileUrl };
    const update = { lastPage, totalPages, updatedAt: new Date() };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    const progress = await LessonProgress.findOneAndUpdate(filter, update, options);
    res.json({ success: true, progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// GET /lesson-progress?lessonId=...&fileUrl=...: get progress for current user
router.get('/lesson-progress', authenticateToken, async (req, res) => {
  try {
    const { lessonId, fileUrl } = req.query;
    if (!lessonId || !fileUrl) return res.status(400).json({ error: 'lessonId and fileUrl required' });
    const progress = await LessonProgress.findOne({ userId: req.user._id, lessonId, fileUrl });
    res.json(progress || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// --- DELETE /lessons/:lessonId - delete a lesson and its files (faculty only) ---
router.delete('/:lessonId', authenticateToken, async (req, res) => {
  try {
    console.log('[LESSONS] DELETE lesson', req.params.lessonId, 'by user', req.user?._id, 'role', req.user?.role);
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Only faculty can delete lessons.' });
    }
    const { lessonId } = req.params;
    if (!mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({ error: 'Invalid lesson id.' });
    }
    const lesson = await Lesson.findByIdAndDelete(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }
    // Optionally: delete files from disk here
    return res.json({ success: true });
  } catch (err) {
    console.error('[LESSONS] Failed to delete lesson', req.params.lessonId, err);
    return res.status(500).json({ error: 'Failed to delete lesson.' });
  }
});

// --- DELETE /lessons/:lessonId/file?fileUrl=... - delete a file from a lesson (faculty only) ---
router.delete('/:lessonId/file', authenticateToken, async (req, res) => {
  try {
    console.log('[LESSONS] DELETE file from lesson', req.params.lessonId, 'fileUrl', req.query.fileUrl, 'by role', req.user?.role);
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Only faculty can delete lesson files.' });
    }
    const { lessonId } = req.params;
    const { fileUrl } = req.query;
    if (!mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({ error: 'Invalid lesson id.' });
    }
    if (!fileUrl) return res.status(400).json({ error: 'fileUrl required' });
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    lesson.files = (lesson.files || []).filter(f => f.fileUrl !== fileUrl);
    await lesson.save();
    // Optionally: delete file from disk here
    return res.json({ success: true, lesson });
  } catch (err) {
    console.error('[LESSONS] Failed to delete file from lesson', req.params.lessonId, err);
    return res.status(500).json({ error: 'Failed to delete file' });
  }
});

// --- PUT /lessons/:lessonId - edit lesson title (faculty only) ---
router.put('/:lessonId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
    const { lessonId } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const lesson = await Lesson.findByIdAndUpdate(lessonId, { title }, { new: true });
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ success: true, lesson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// PATCH /lessons/:lessonId/files - add new files to an existing lesson (faculty only)
router.patch('/:lessonId/files', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    // Map uploaded files to file info objects
    const newFiles = req.files.map(file => ({
      fileUrl: file.secure_url || file.path || `/uploads/lessons/${file.filename}`,
      fileName: file.originalname
    }));
    lesson.files.push(...newFiles);
    await lesson.save();
    res.json({ success: true, lesson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add files to lesson' });
  }
});

// Global error handler for lesson routes
router.use((err, req, res, next) => {
  console.error('[LESSONS] Unhandled error in lesson routes:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Internal server error occurred during lesson processing',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 