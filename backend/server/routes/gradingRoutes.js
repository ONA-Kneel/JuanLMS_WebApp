import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/authMiddleware.js';
import GradingData from '../models/GradingData.js';
import Assignment from '../models/Assignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import StudentAssignment from '../models/StudentAssignment.js';
import Submission from '../models/Submission.js';
import { processGradingExcel, generateGradingTemplate } from '../utils/excelProcessor.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/grading';
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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
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

// Get faculty assignments for grading
router.get('/assignments/:facultyId', authenticateToken, async (req, res) => {
  try {
    const { facultyId } = req.params;

    const assignments = await FacultyAssignment.find({ facultyId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      assignments: assignments
    });
  } catch (error) {
    console.error('Error fetching faculty assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignments'
    });
  }
});

// Get students for a specific section
router.get('/section/:sectionId/students', authenticateToken, async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { sectionName, trackName, strandName, gradeLevel, schoolYear, termName } = req.query;

    const students = await StudentAssignment.find({
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName
    }).populate('studentId', 'firstname lastname email');

    res.json({
      success: true,
      students: students.map(sa => sa.studentId)
    });
  } catch (error) {
    console.error('Error fetching section students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students'
    });
  }
});

// Download Excel template
router.get('/template/:facultyAssignmentId', authenticateToken, async (req, res) => {
  try {
    const { facultyAssignmentId } = req.params;
    const { sectionName, trackName, strandName, gradeLevel, schoolYear, termName } = req.query;

    // Get students in the section
    const studentAssignments = await StudentAssignment.find({
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName
    }).populate('studentId', 'firstname lastname');

    const students = studentAssignments.map(sa => sa.studentId);

    // Generate Excel template
    const buffer = generateGradingTemplate(students);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="grading_template_${sectionName}.xlsx"`);

    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating template'
    });
  }
});

// Upload and process Excel file
router.post('/upload/:facultyAssignmentId', authenticateToken, upload.single('excelFile'), async (req, res) => {
  try {
    const { facultyAssignmentId } = req.params;
    const facultyId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const {
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName
    } = req.body;

    // Validate required fields
    if (!sectionName || !trackName || !strandName || !gradeLevel || !schoolYear || !termName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Read file buffer
    const fileBuffer = fs.readFileSync(req.file.path);

    // Process Excel file
    const processingOptions = {
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName
    };

    const result = await processGradingExcel(fileBuffer, processingOptions);

    if (!result.success) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      return res.status(400).json({
        success: false,
        message: 'Excel file contains errors',
        errors: result.errors,
        warnings: result.warnings
      });
    }

    // Save grading data to database
    const gradingData = new GradingData({
      facultyId,
      assignmentId: facultyAssignmentId, // Use FacultyAssignment ID as assignmentId
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName,
      grades: result.grades,
      excelFileName: req.file.filename,
      status: 'processed'
    });

    await gradingData.save();

    // Update submissions with grades
    for (const grade of result.grades) {
      await Submission.findOneAndUpdate(
        {
          assignmentId: facultyAssignmentId, // Use FacultyAssignment ID
          studentId: grade.studentId
        },
        {
          $set: {
            grade: grade.grade,
            feedback: grade.feedback,
            gradedAt: new Date(),
            gradedBy: facultyId
          }
        },
        { upsert: false }
      );
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Grades uploaded successfully',
      data: {
        totalProcessed: result.processedRows,
        totalRows: result.totalRows,
        warnings: result.warnings
      }
    });

  } catch (error) {
    console.error('Error uploading grades:', error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading grades'
    });
  }
});

// Get grading data for an assignment
router.get('/data/:facultyAssignmentId', authenticateToken, async (req, res) => {
  try {
    const { facultyAssignmentId } = req.params;
    const facultyId = req.user.id;

    const gradingData = await GradingData.find({
      assignmentId: facultyAssignmentId, // Use FacultyAssignment ID
      facultyId
    }).sort({ uploadedAt: -1 });

    res.json({
      success: true,
      data: gradingData
    });
  } catch (error) {
      console.error('Error fetching grading data:', error);
      res.status(500).json({
      success: false,
      message: 'Error fetching grading data'
    });
  }
});

// Delete grading data
router.delete('/data/:gradingDataId', authenticateToken, async (req, res) => {
  try {
    const { gradingDataId } = req.params;
    const facultyId = req.user.id;

    const gradingData = await GradingData.findOneAndDelete({
      _id: gradingDataId,
      facultyId
    });

    if (!gradingData) {
      return res.status(404).json({
        success: false,
        message: 'Grading data not found'
      });
    }

    // Remove grades from submissions
    for (const grade of gradingData.grades) {
      await Submission.findOneAndUpdate(
        {
          assignmentId: gradingData.assignmentId,
          studentId: grade.studentId
        },
        {
          $unset: {
            grade: 1,
            feedback: 1,
            gradedAt: 1,
            gradedBy: 1
          }
        }
      );
    }

    res.json({
      success: true,
      message: 'Grading data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting grading data:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting grading data'
    });
  }
});

export default router; 