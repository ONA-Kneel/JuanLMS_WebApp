import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';

const router = express.Router();

// In-memory storage for grades (replace with proper database in production)
const gradesStorage = new Map();

// Storage configuration
const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);


async function initializeGradeUploadStorage() {
  if (USE_CLOUDINARY) {
    console.log('[GRADE_UPLOAD] Using Cloudinary storage');
    try {
      const { gradeFileStorage } = await import('../config/cloudinary.js');
      return multer({
        storage: gradeFileStorage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        fileFilter: (req, file, cb) => {
          const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
          ];

          if (allowedTypes.includes(file.mimetype) ||
              file.originalname.endsWith('.xlsx') ||
              file.originalname.endsWith('.xls') ||
              file.originalname.endsWith('.csv')) {
            cb(null, true);
          } else {
            cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
          }
        }
      });
    } catch (error) {
      console.error('[GRADE_UPLOAD] Cloudinary setup failed, falling back to local storage:', error.message);
    }
  }
  
  // Local storage fallback
  console.log('[GRADE_UPLOAD] Using local storage');
  const localStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = './uploads/grades';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\s+/g, '_');
      cb(null, `${timestamp}-${originalName}`);
    }
  });
  
  return multer({
    storage: localStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];

      if (allowedTypes.includes(file.mimetype) ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls') ||
          file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
      }
    }
  });
}

// Initialize upload middleware
const upload = await initializeGradeUploadStorage();

// General grade upload endpoint
router.post('/upload', authenticateToken, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // For now, just acknowledge the upload and return success
    // The actual grade processing can be implemented later
    res.json({
      success: true,
      message: 'Grades uploaded successfully',
      filename: req.file.filename,
      data: req.body
    });

  } catch (error) {
    console.error('Error uploading grades:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading grades'
    });
  }
});

// Save grades endpoint
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      className,
      section,
      academicYear,
      termName,
      quarter,
      grades,
      savedAt
    } = req.body;

    // Validate required fields
    if (!classId || !className || !section || !grades || !Array.isArray(grades)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: classId, className, section, grades'
      });
    }

    // Create a unique identifier for this grade record
    const gradeRecordId = new mongoose.Types.ObjectId();

    // Prepare grade record for database
    const gradeRecord = {
      _id: gradeRecordId,
      classId,
      className,
      section,
      academicYear,
      termName,
      quarter,
      facultyId: req.user._id, // From authenticated user
      grades: grades.map(grade => ({
        studentId: grade.studentId,
        studentName: grade.studentName,
        schoolID: grade.schoolID,
        writtenWorks: {
          raw: grade.writtenWorksRAW,
          hps: grade.writtenWorksHPS,
          ps: grade.writtenWorksPS,
          ws: grade.writtenWorksWS
        },
        performanceTasks: {
          raw: grade.performanceTasksRAW,
          hps: grade.performanceTasksHPS,
          ps: grade.performanceTasksPS,
          ws: grade.performanceTasksWS
        },
        quarterlyExam: grade.quarterlyExam,
        initialGrade: grade.initialGrade,
        finalGrade: grade.finalGrade,
        trackInfo: grade.trackInfo
      })),
      savedAt: savedAt || new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store grades in memory (replace with proper database in production)
    const storageKey = `${classId}_${section}_${quarter}_${req.user._id}`;
    gradesStorage.set(storageKey, gradeRecord);
    
    console.log('✅ Saving grades to storage:', {
      classId,
      section,
      totalStudents: grades.length,
      storageKey
    });

    // TODO: Save to MongoDB using a proper GradeRecord model
    // Example:
    // const GradeRecord = require('../models/GradeRecord');
    // const savedRecord = await GradeRecord.create(gradeRecord);

    res.json({
      success: true,
      message: 'Grades saved successfully',
      data: {
        recordId: gradeRecordId,
        classId,
        className,
        section,
        totalStudents: grades.length,
        savedAt: gradeRecord.savedAt
      }
    });

  } catch (error) {
    console.error('Error saving grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save grades',
      error: error.message
    });
  }
});

// Load grades endpoint
router.get('/load', authenticateToken, async (req, res) => {
  try {
    const { classId, section, quarter = 'Q1' } = req.query;

    // Validate required fields
    if (!classId || !section) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: classId, section'
      });
    }

    // Load grades from memory storage
    const storageKey = `${classId}_${section}_${quarter}_${req.user._id}`;
    const savedGrades = gradesStorage.get(storageKey);
    
    if (savedGrades) {
      console.log('✅ Found saved grades for:', { classId, section, totalStudents: savedGrades.grades.length });
      res.json({
        success: true,
        message: 'Grades loaded successfully',
        data: savedGrades
      });
    } else {
      console.log('❌ No saved grades found for:', { classId, section });
      res.json({
        success: true,
        message: 'No saved grades found',
        data: null
      });
    }

    // TODO: Implement actual database query
    // Example:
    // const GradeRecord = require('../models/GradeRecord');
    // const savedGrades = await GradeRecord.findOne({
    //   classId,
    //   section,
    //   quarter,
    //   facultyId: req.user._id
    // });

  } catch (error) {
    console.error('Error loading grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load grades',
      error: error.message
    });
  }
});

export default router;
