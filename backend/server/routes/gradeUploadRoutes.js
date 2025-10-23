import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';
import PostedGrades from '../models/PostedGrades.js';
import GradingData from '../models/GradingData.js';
import QuarterlyGrades from '../models/QuarterlyGrades.js';
import DetailedGrades from '../models/DetailedGrades.js';

const router = express.Router();

// In-memory storage for grades (replace with proper database in production)
const gradesStorage = new Map();
const quarterlyGradesStorage = new Map();
const postedGradesStorage = new Map();

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
      quarterlyExamHPS,
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
      quarterlyExamHPS,
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

    // Save detailed grades to database
    try {
      // First, try to find existing detailed grades record
      let detailedGradesRecord = await DetailedGrades.findOne({
        classId,
        section,
        quarter,
        facultyId: req.user._id
      });

      if (detailedGradesRecord) {
        // Update existing record
        detailedGradesRecord.quarterlyExamHPS = quarterlyExamHPS;
        detailedGradesRecord.grades = grades.map(grade => ({
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
        }));
        detailedGradesRecord.savedAt = new Date();
        await detailedGradesRecord.save();
      } else {
        // Create new record
        detailedGradesRecord = new DetailedGrades({
          classId,
          className,
          section,
          academicYear,
          termName,
          quarter,
          quarterlyExamHPS,
          facultyId: req.user._id,
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
          }))
        });
        await detailedGradesRecord.save();
      }

      // Also save to GradingData for compatibility
      const gradingData = new GradingData({
        facultyId: req.user._id,
        assignmentId: new mongoose.Types.ObjectId(), // Create a unique assignment ID for this grade record
        sectionName: section,
        trackName: grades.length > 0 ? grades[0].trackInfo?.track || 'Academic' : 'Academic',
        strandName: 'General', // Default strand
        gradeLevel: 'Grade 12', // Default grade level
        schoolYear: academicYear,
        termName: termName,
        quarterlyExamHPS: quarterlyExamHPS,
        grades: grades.map(grade => ({
          studentId: grade.studentId,
          studentName: grade.studentName,
          grade: grade.finalGrade,
          feedback: `Quarterly grade for ${quarter}`,
          submittedAt: new Date()
        })),
        excelFileName: `${className}_${section}_${quarter}_${new Date().toISOString()}.json`,
        uploadedAt: new Date(),
        status: 'processed'
      });

      const savedRecord = await gradingData.save();
      
      console.log('✅ Grades saved to database:', {
        classId,
        section,
        totalStudents: grades.length,
        databaseId: savedRecord._id
      });
    } catch (dbError) {
      console.error('❌ Error saving grades to database:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save grades to database',
        error: dbError.message
      });
    }

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

    // Load grades from database
    try {
      const savedGrades = await DetailedGrades.findOne({
        classId,
        section,
        quarter,
        facultyId: req.user._id
      });
      
      if (savedGrades) {
        console.log('✅ Found saved grades in database for:', { 
          classId, 
          section, 
          totalStudents: savedGrades.grades.length,
          databaseId: savedGrades._id
        });
        
        // Transform the database record to match the expected format
        const transformedGrades = {
          _id: savedGrades._id,
          classId: classId,
          className: savedGrades.className,
          section: savedGrades.section,
          academicYear: savedGrades.academicYear,
          termName: savedGrades.termName,
          quarter: quarter,
          quarterlyExamHPS: savedGrades.quarterlyExamHPS || 100,
          facultyId: savedGrades.facultyId,
          grades: savedGrades.grades.map(grade => ({
            studentId: grade.studentId,
            studentName: grade.studentName,
            schoolID: grade.schoolID,
            writtenWorks: {
              raw: grade.writtenWorks.raw,
              hps: grade.writtenWorks.hps,
              ps: grade.writtenWorks.ps,
              ws: grade.writtenWorks.ws
            },
            performanceTasks: {
              raw: grade.performanceTasks.raw,
              hps: grade.performanceTasks.hps,
              ps: grade.performanceTasks.ps,
              ws: grade.performanceTasks.ws
            },
            quarterlyExam: grade.quarterlyExam,
            initialGrade: grade.initialGrade,
            finalGrade: grade.finalGrade,
            trackInfo: grade.trackInfo
          })),
          savedAt: savedGrades.uploadedAt.toISOString(),
          createdAt: savedGrades.createdAt,
          updatedAt: savedGrades.updatedAt
        };
        
        res.json({
          success: true,
          message: 'Grades loaded successfully',
          data: transformedGrades
        });
      } else {
        console.log('❌ No saved grades found in database for:', { classId, section });
        res.json({
          success: true,
          message: 'No saved grades found',
          data: null
        });
      }
    } catch (dbError) {
      console.error('❌ Error loading grades from database:', dbError);
      res.status(500).json({
        success: false,
        message: 'Failed to load grades from database',
        error: dbError.message
      });
    }

  } catch (error) {
    console.error('Error loading grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load grades',
      error: error.message
    });
  }
});

// Save quarterly grade endpoint
router.post('/save-quarterly', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      section,
      quarter,
      studentId,
      quarterlyGrade,
      academicYear,
      termName
    } = req.body;

    // Log the incoming data for debugging
    console.log('📥 Save quarterly grade request data:', {
      classId,
      section,
      quarter,
      studentId,
      quarterlyGrade,
      academicYear,
      termName,
      facultyId: req.user._id
    });

    // Validate required fields
    if (!classId || !section || !quarter || !studentId || quarterlyGrade === undefined) {
      console.log('❌ Missing required fields:', {
        classId: !!classId,
        section: !!section,
        quarter: !!quarter,
        studentId: !!studentId,
        quarterlyGrade: quarterlyGrade !== undefined
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: classId, section, quarter, studentId, quarterlyGrade'
      });
    }

    // Validate quarterly grade range
    const numericGrade = parseFloat(quarterlyGrade);
    if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
      console.log('❌ Invalid quarterly grade:', {
        quarterlyGrade,
        numericGrade,
        isValid: !isNaN(numericGrade) && numericGrade >= 0 && numericGrade <= 100
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid quarterly grade. Must be between 0 and 100.',
        received: quarterlyGrade
      });
    }

    // Save to database
    try {
      // Find existing quarterly grades record for this class, section, and quarter
      let quarterlyGradesRecord = await QuarterlyGrades.findOne({
        classId: classId,
        section: section,
        quarter: quarter,
        facultyId: req.user._id
      });

      if (quarterlyGradesRecord) {
        // Update existing record
        const existingStudentIndex = quarterlyGradesRecord.grades.findIndex(
          grade => grade.studentId.toString() === studentId
        );

        if (existingStudentIndex >= 0) {
          // Update existing student's grade
          quarterlyGradesRecord.grades[existingStudentIndex].quarterlyGrade = parseFloat(quarterlyGrade);
          quarterlyGradesRecord.grades[existingStudentIndex].savedAt = new Date();
        } else {
          // Add new student's grade
          quarterlyGradesRecord.grades.push({
            studentId,
            quarterlyGrade: parseFloat(quarterlyGrade),
            academicYear,
            termName,
            savedAt: new Date()
          });
        }
      } else {
        // Create new record
        quarterlyGradesRecord = new QuarterlyGrades({
          classId,
          className: req.body.className || 'Unknown Class',
          section,
          academicYear,
          termName,
          quarter,
          facultyId: req.user._id,
          grades: [{
            studentId,
            quarterlyGrade: parseFloat(quarterlyGrade),
            academicYear,
            termName,
            savedAt: new Date()
          }]
        });
      }

      const savedRecord = await quarterlyGradesRecord.save();
      
      console.log('✅ Quarterly grade saved to database:', {
        classId,
        section,
        quarter,
        studentId,
        quarterlyGrade,
        databaseId: savedRecord._id
      });
    } catch (dbError) {
      console.error('❌ Error saving quarterly grade to database:', dbError);
      console.error('❌ Database error details:', {
        name: dbError.name,
        message: dbError.message,
        code: dbError.code,
        keyPattern: dbError.keyPattern,
        keyValue: dbError.keyValue
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to save quarterly grade to database',
        error: dbError.message,
        details: {
          name: dbError.name,
          code: dbError.code,
          keyPattern: dbError.keyPattern,
          keyValue: dbError.keyValue
        }
      });
    }

    res.json({
      success: true,
      message: 'Quarterly grade saved successfully',
      data: {
        studentId,
        quarterlyGrade: parseFloat(quarterlyGrade),
        quarter
      }
    });

  } catch (error) {
    console.error('Error in save quarterly grade endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Load quarterly grades endpoint
router.get('/load-quarterly', authenticateToken, async (req, res) => {
  try {
    const { classId, section } = req.query;

    // Validate required fields
    if (!classId || !section) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: classId, section'
      });
    }

    // Load quarterly grades from database
    try {
      const quarterlyGradesRecords = await QuarterlyGrades.find({
        classId: classId,
        section: section,
        facultyId: req.user._id
      }).sort({ quarter: 1 });

      const quarterlyGradesData = [];
      
      quarterlyGradesRecords.forEach(record => {
        record.grades.forEach(grade => {
          quarterlyGradesData.push({
            studentId: grade.studentId,
            quarter: record.quarter,
            quarterlyGrade: grade.quarterlyGrade,
            academicYear: grade.academicYear,
            termName: grade.termName,
            savedAt: grade.savedAt
          });
        });
      });
      
      if (quarterlyGradesData.length > 0) {
        console.log('✅ Found quarterly grades in database for:', { 
          classId, 
          section, 
          totalGrades: quarterlyGradesData.length 
        });
        res.json({
          success: true,
          message: 'Quarterly grades loaded successfully',
          data: quarterlyGradesData
        });
      } else {
        console.log('❌ No quarterly grades found in database for:', { classId, section });
        res.json({
          success: true,
          message: 'No quarterly grades found',
          data: []
        });
      }
    } catch (dbError) {
      console.error('❌ Error loading quarterly grades from database:', dbError);
      res.status(500).json({
        success: false,
        message: 'Failed to load quarterly grades from database',
        error: dbError.message
      });
    }

  } catch (error) {
    console.error('Error in load quarterly grades endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Post grades to students endpoint
router.post('/post', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      className,
      section,
      academicYear,
      termName,
      quarter,
      grades,
      postedAt
    } = req.body;

    // Validate required fields
    if (!classId || !className || !section || !grades || !Array.isArray(grades)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: classId, className, section, grades'
      });
    }

    // Create a unique identifier for this posted grade record
    const postedGradeRecordId = new mongoose.Types.ObjectId();

    // Prepare posted grade record
    const postedGradeRecord = {
      _id: postedGradeRecordId,
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
      postedAt: postedAt || new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store posted grades in memory (replace with proper database in production)
    const storageKey = `${classId}_${section}_${quarter}_${req.user._id}_posted`;
    postedGradesStorage.set(storageKey, postedGradeRecord);
    
    console.log('✅ Posted grades to students:', {
      classId,
      section,
      quarter,
      totalStudents: grades.length,
      storageKey
    });

    res.json({
      success: true,
      message: 'Grades posted to students successfully',
      data: {
        recordId: postedGradeRecordId,
        classId,
        className,
        section,
        quarter,
        totalStudents: grades.length,
        postedAt: postedGradeRecord.postedAt
      }
    });

  } catch (error) {
    console.error('Error posting grades to students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post grades to students',
      error: error.message
    });
  }
});

// Post quarterly grades to students endpoint
router.post('/post-quarterly', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      className,
      section,
      academicYear,
      termName,
      quarter,
      grades,
      postedAt
    } = req.body;

    // Validate required fields
    if (!classId || !className || !section || !quarter || !grades || !Array.isArray(grades)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: classId, className, section, quarter, grades'
      });
    }

    // Create a unique identifier for this posted quarterly grade record
    const postedQuarterlyGradeRecordId = new mongoose.Types.ObjectId();

    // Prepare posted quarterly grade record
    const postedQuarterlyGradeRecord = {
      _id: postedQuarterlyGradeRecordId,
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
        quarterlyGrade: grade.quarterlyGrade,
        termFinalGrade: grade.termFinalGrade,
        remarks: grade.remarks,
        trackInfo: grade.trackInfo
      })),
      postedAt: postedAt || new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    try {
      const postedGrades = new PostedGrades({
        classId,
        className,
        section,
        academicYear,
        termName,
        quarter,
        facultyId: req.user._id,
        grades: grades.map(grade => ({
          studentId: grade.studentId,
          studentName: grade.studentName,
          schoolID: grade.schoolID,
          quarterlyGrade: grade.quarterlyGrade,
          termFinalGrade: grade.termFinalGrade,
          remarks: grade.remarks
        })),
        trackInfo: grades.length > 0 ? grades[0].trackInfo : null,
        postedAt: new Date()
      });

      const savedGrades = await postedGrades.save();
      
      console.log('✅ Posted quarterly grades saved to database:', {
        classId,
        section,
        quarter,
        totalStudents: grades.length,
        databaseId: savedGrades._id
      });
    } catch (dbError) {
      console.error('❌ Error saving to database:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save grades to database',
        error: dbError.message
      });
    }

    res.json({
      success: true,
      message: 'Quarterly grades posted to students successfully',
      data: {
        recordId: postedQuarterlyGradeRecordId,
        classId,
        className,
        section,
        quarter,
        totalStudents: grades.length,
        postedAt: postedQuarterlyGradeRecord.postedAt
      }
    });

  } catch (error) {
    console.error('Error posting quarterly grades to students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post quarterly grades to students',
      error: error.message
    });
  }
});

// Get posted grades for a specific student
router.get('/student-posted-grades', authenticateToken, async (req, res) => {
  try {
    const { studentId, classId, section } = req.query;

    // Validate required fields
    if (!studentId || !classId || !section) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, classId, section'
      });
    }

    console.log('🔍 Fetching posted grades for student:', { 
      studentId, 
      classId, 
      section,
      studentIdType: typeof studentId,
      studentIdValue: studentId
    });

    // Search through database for posted quarterly grades for this student
    const studentGrades = [];
    
    try {
      // Find all posted grades for this class and section
      const postedGradesRecords = await PostedGrades.find({
        classId: classId,
        section: section
      }).sort({ quarter: 1, postedAt: -1 });

      console.log(`🔍 Found ${postedGradesRecords.length} posted grade records for class ${classId}, section ${section}`);

      for (const postedGradesRecord of postedGradesRecords) {
        console.log(`🔍 Checking quarter ${postedGradesRecord.quarter}:`, {
          totalStudents: postedGradesRecord.grades.length,
          studentIds: postedGradesRecord.grades.map(g => g.studentId.toString())
        });

        // Find the specific student's grades
        const studentGrade = postedGradesRecord.grades.find(grade => {
          const gradeStudentId = grade.studentId.toString();
          const queryStudentId = studentId.toString();
          console.log(`🔍 Comparing student IDs: ${gradeStudentId} === ${queryStudentId}`);
          return gradeStudentId === queryStudentId;
        });

        if (studentGrade) {
          studentGrades.push({
            quarter: postedGradesRecord.quarter,
            quarterlyGrade: studentGrade.quarterlyGrade,
            termFinalGrade: studentGrade.termFinalGrade,
            remarks: studentGrade.remarks,
            postedAt: postedGradesRecord.postedAt
          });
          console.log(`✅ Found grades for student ${studentId} in ${postedGradesRecord.quarter}:`, studentGrade);
        } else {
          console.log(`⚠️ Student ${studentId} not found in ${postedGradesRecord.quarter} grades`);
        }
      }
    } catch (dbError) {
      console.error('❌ Error fetching from database:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch grades from database',
        error: dbError.message
      });
    }
    
    if (studentGrades.length > 0) {
      console.log('✅ Found posted grades for student:', studentGrades);
      
      // Transform the grades into the format expected by frontend
      const transformedGrades = {
        studentId: studentId,
        grades: {}
      };
      
      studentGrades.forEach(grade => {
        transformedGrades.grades[grade.quarter] = {
          quarterlyGrade: grade.quarterlyGrade,
          termFinalGrade: grade.termFinalGrade,
          remarks: grade.remarks
        };
      });
      
      res.json({
        success: true,
        message: 'Posted grades found',
        data: {
          studentId,
          classId,
          section,
          grades: [transformedGrades] // Wrap in array as expected by frontend
        }
      });
    } else {
      console.log('❌ No posted grades found for student:', { studentId, classId, section });
      res.json({
        success: true,
        message: 'No posted grades found',
        data: {
          studentId,
          classId,
          section,
          grades: []
        }
      });
    }

  } catch (error) {
    console.error('Error fetching student posted grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student posted grades',
      error: error.message
    });
  }
});

export default router;
