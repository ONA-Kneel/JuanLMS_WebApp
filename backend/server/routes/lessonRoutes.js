// lessonRoutes.js
// Handles lesson upload (with multiple files) and retrieval for classes in JuanLMS.
// Uses Multer for file upload and Mongoose for lesson storage.

import express from 'express';
import multer from 'multer';
import Lesson from '../models/Lesson.js';
import path from 'path';
import database from '../connect.cjs';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authMiddleware.js';
import LessonProgress from '../models/LessonProgress.js';

const router = express.Router();

// --- Multer setup for file uploads ---
// Multer is used to handle multipart/form-data (file uploads) in Express
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // All lesson files are stored in uploads/lessons/
    cb(null, 'uploads/lessons/');
  },
  filename: function (req, file, cb) {
    // Use a unique filename to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
  // Accept all file types for lesson materials
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

// --- POST /lessons - upload lesson with multiple files ---
// Accepts up to 5 files per lesson
router.post('/', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const { classID, title, link } = req.body;
    // Validate required fields and at least one file
    if (!classID || !title || (!req.files || req.files.length === 0) && !link) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Map uploaded files to file info objects for storage in MongoDB
    const files = req.files.map(file => ({
      fileUrl: `/uploads/lessons/${file.filename}`,
      fileName: file.originalname
    }));
    // Create and save the lesson document
    const lesson = new Lesson({ classID, title, files, link });
    await lesson.save();

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

    res.status(201).json({ success: true, lesson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload lesson' });
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

// Add Multer error handler for file size
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Max size is 100MB per file.' });
  }
  next(err);
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
    if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
    const { lessonId } = req.params;
    const lesson = await Lesson.findByIdAndDelete(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    // Optionally: delete files from disk here
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// --- DELETE /lessons/:lessonId/file?fileUrl=... - delete a file from a lesson (faculty only) ---
router.delete('/:lessonId/file', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
    const { lessonId } = req.params;
    const { fileUrl } = req.query;
    if (!fileUrl) return res.status(400).json({ error: 'fileUrl required' });
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    lesson.files = lesson.files.filter(f => f.fileUrl !== fileUrl);
    await lesson.save();
    // Optionally: delete file from disk here
    res.json({ success: true, lesson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete file' });
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
      fileUrl: `/uploads/lessons/${file.filename}`,
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

export default router; 