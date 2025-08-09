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
import User from '../models/User.js'; // Added import for User

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

// Get current faculty assignments (for the authenticated user)
router.get('/my-assignments', authenticateToken, async (req, res) => {
  try {
    const facultyId = req.user.id;
    console.log('Fetching assignments for faculty:', facultyId);

    // First, let's check if the faculty exists
    const faculty = await User.findById(facultyId);
    if (!faculty) {
      console.log('Faculty not found:', facultyId);
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    console.log('Faculty found:', faculty.firstname, faculty.lastname);

    const assignments = await FacultyAssignment.find({ 
      facultyId: facultyId,
      status: 'active'
    }).sort({ createdAt: -1 });

    console.log('Found assignments:', assignments.length, assignments);

    res.json({
      success: true,
      assignments: assignments
    });
  } catch (error) {
    console.error('Error fetching faculty assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignments',
      error: error.message
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

// Debug endpoint to see all students in a section
router.get('/debug/students/:sectionName', authenticateToken, async (req, res) => {
  try {
    const { sectionName } = req.params;
    const { trackName, strandName, gradeLevel, schoolYear, termName } = req.query;

    console.log('Debug request for section:', { sectionName, trackName, strandName, gradeLevel, schoolYear, termName });

    // Get all students in the section
    const studentAssignments = await StudentAssignment.find({
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName
    }).populate('studentId', 'firstname lastname email');

    // Get all students in the database
    const allStudents = await User.find({ role: 'student' }).select('firstname lastname email');

    res.json({
      success: true,
      sectionStudents: studentAssignments.map(sa => ({
        id: sa.studentId._id,
        name: `${sa.studentId.firstname} ${sa.studentId.lastname}`,
        email: sa.studentId.email
      })),
      allStudents: allStudents.map(s => ({
        id: s._id,
        name: `${s.firstname} ${s.lastname}`,
        email: s.email
      })),
      sectionInfo: {
        sectionName,
        trackName,
        strandName,
        gradeLevel,
        schoolYear,
        termName
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching debug information',
      error: error.message
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

    console.log('Upload request received:', { facultyAssignmentId, facultyId, body: req.body });

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

    console.log('Processing options:', { sectionName, trackName, strandName, gradeLevel, schoolYear, termName });

    // Validate required fields
    if (!sectionName || !trackName || !strandName || !gradeLevel || !schoolYear || !termName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        received: { sectionName, trackName, strandName, gradeLevel, schoolYear, termName }
      });
    }

    // Read file buffer
    const fileBuffer = fs.readFileSync(req.file.path);
    console.log('File read successfully, size:', fileBuffer.length);

    // Process Excel file
    const processingOptions = {
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName
    };

    console.log('Processing Excel file with options:', processingOptions);
    const result = await processGradingExcel(fileBuffer, processingOptions);
    console.log('Processing result:', result);

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

    // Check if any grades were processed
    if (result.grades.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      return res.status(400).json({
        success: false,
        message: 'No valid grades found in the Excel file. Please ensure the file contains student names and grades.',
        errors: ['No grades were processed from the uploaded file'],
        warnings: result.warnings
      });
    }

    // Save grading data to database
    const gradingData = new GradingData({
      facultyId,
      assignmentId: facultyAssignmentId,
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

    console.log('Saving grading data:', gradingData);
    await gradingData.save();
    console.log('Grading data saved successfully');

    // Update submissions with grades
    for (const grade of result.grades) {
      await Submission.findOneAndUpdate(
        {
          assignment: facultyAssignmentId, // Changed from assignmentId to assignment
          student: grade.studentId // Changed from studentId to student
        },
        {
          $set: {
            grade: grade.grade,
            feedback: grade.feedback,
            status: 'graded', // Set status to graded
            submittedAt: new Date()
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
      message: error.message || 'Error uploading grades',
      error: error.toString()
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
          assignment: gradingData.assignmentId, // Changed from assignmentId to assignment
          student: grade.studentId // Changed from studentId to student
        },
        {
          $unset: {
            grade: 1,
            feedback: 1
          },
          $set: {
            status: 'turned-in' // Revert status to turned-in
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