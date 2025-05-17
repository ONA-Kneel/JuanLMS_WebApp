// lessonRoutes.js
// Handles lesson upload (with multiple files) and retrieval for classes in JuanLMS.
// Uses Multer for file upload and Mongoose for lesson storage.

import express from 'express';
import multer from 'multer';
import Lesson from '../models/Lesson.js';
import path from 'path';

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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (req, file, cb) => {
    // Only allow certain file types for lesson materials
    const allowed = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Reject files that are not allowed
      cb(new Error('Only PDF, PPT, PPTX, DOC, DOCX files are allowed!'));
    }
  }
});

// --- POST /lessons - upload lesson with multiple files ---
// Accepts up to 5 files per lesson
router.post('/', upload.array('files', 5), async (req, res) => {
  try {
    const { classID, title } = req.body;
    // Validate required fields and at least one file
    if (!classID || !title || !req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Map uploaded files to file info objects for storage in MongoDB
    const files = req.files.map(file => ({
      fileUrl: `/uploads/lessons/${file.filename}`,
      fileName: file.originalname
    }));
    // Create and save the lesson document
    const lesson = new Lesson({ classID, title, files });
    await lesson.save();
    res.status(201).json({ success: true, lesson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload lesson' });
  }
});

// --- GET /lessons?classID=... - fetch lessons for a class ---
router.get('/', async (req, res) => {
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

export default router; 