import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

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

export default router;
