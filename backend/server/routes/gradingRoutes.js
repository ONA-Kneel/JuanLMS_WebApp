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
import Class from '../models/Class.js';
import { processGradingExcel, generateGradingTemplate, generateQuarterSummaryClassList } from '../utils/excelProcessor.js';
import User from '../models/User.js'; // Added import for User
import Quiz from '../models/Quiz.js'; // Added import for Quiz
import QuizResponse from '../models/QuizResponse.js'; // Added import for QuizResponse

const router = express.Router();

// Storage configuration
const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);


async function initializeGradingStorage() {
  if (USE_CLOUDINARY) {
    console.log('[GRADING] Using Cloudinary storage');
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
      console.error('[GRADING] Cloudinary setup failed, falling back to local storage:', error.message);
    }
  }
  
  // Local storage fallback
  console.log('[GRADING] Using local storage');
  const localStorage = multer.diskStorage({
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
const upload = await initializeGradingStorage();

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

    // First, let's check if the faculty exists
    const faculty = await User.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const assignments = await FacultyAssignment.find({ 
      facultyId: facultyId,
      status: 'active'
    }).sort({ createdAt: -1 });

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

// Get students in a section
router.get('/students/:sectionName', authenticateToken, async (req, res) => {
  try {
    const { sectionName } = req.params;
    const { trackName, strandName, gradeLevel, schoolYear, termName } = req.query;

    // Get all students in the section
    const studentAssignments = await StudentAssignment.find({
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName
    }).populate('studentId', 'firstname lastname email');

    res.json({
      success: true,
      students: studentAssignments.map(sa => ({
        id: sa.studentId._id,
        name: `${sa.studentId.firstname} ${sa.studentId.lastname}`,
        email: sa.studentId.email
      }))
    });
  } catch (error) {
    console.error('Error fetching section students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
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
        message: 'Missing required fields',
        received: { sectionName, trackName, strandName, gradeLevel, schoolYear, termName }
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

      // Check if the errors are related to column validation
      const hasColumnErrors = result.errors.some(error => 
        error.includes('Column') || 
        error.includes('Row 8') || 
        error.includes('Row 9') || 
        error.includes('Row 10')
      );

      const errorMessage = hasColumnErrors 
        ? 'Excel file has incorrect column structure. Please check the required columns and headers.'
        : 'Excel file contains errors';

      return res.status(400).json({
        success: false,
        message: errorMessage,
        errors: result.errors,
        warnings: result.warnings,
        errorType: hasColumnErrors ? 'column_structure' : 'data_validation'
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

    await gradingData.save();

    // Update submissions with grades
    for (const grade of result.grades) {
      await Submission.findOneAndUpdate(
        {
          assignment: facultyAssignmentId,
          student: grade.studentId
        },
        {
          $set: {
            grade: grade.grade,
            feedback: grade.feedback,
            status: 'graded',
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

// Get faculty classes with sections and assignments (NEW HIERARCHY)
router.get('/faculty-classes/:facultyId', authenticateToken, async (req, res) => {
  try {
    let { facultyId } = req.params;
    
    // Handle 'me' case - use the authenticated user's ID
    if (facultyId === 'me') {
      facultyId = req.user._id;
    }
    
    // Get all classes where this faculty is a member
    const facultyClasses = await Class.find({ 
      members: facultyId,
      facultyID: facultyId 
    });

    const classHierarchy = [];

    for (const classItem of facultyClasses) {
      // Get sections for this class from FacultyAssignment
      const sections = await FacultyAssignment.find({
        facultyId: facultyId,
        classID: classItem.classID,
        status: 'active'
      }).distinct('sectionName');

      const sectionData = [];

      for (const sectionName of sections) {
        // Get assignments for this class and section
        const assignments = await Assignment.find({
          classID: classItem.classID,
          'assignedTo.classID': classItem.classID
        });

        sectionData.push({
          sectionName: sectionName,
          assignments: assignments.map(assignment => ({
            _id: assignment._id,
            title: assignment.title,
            type: assignment.type,
            dueDate: assignment.dueDate,
            points: assignment.points
          }))
        });
      }

      classHierarchy.push({
        _id: classItem._id,
        classID: classItem.classID,
        className: classItem.className,
        classCode: classItem.classCode,
        classDesc: classItem.classDesc,
        sections: sectionData
      });
    }

    res.json({
      success: true,
      classes: classHierarchy
    });

  } catch (error) {
    console.error('Error fetching faculty classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching classes',
      error: error.message
    });
  }
});

// Get faculty classes with sections and assignments (ALTERNATIVE - using FacultyAssignment data)
router.get('/faculty-classes-alt/:facultyId', authenticateToken, async (req, res) => {
  try {
    let { facultyId } = req.params;
    
    // Handle 'me' case - use the authenticated user's ID
    if (facultyId === 'me') {
      facultyId = req.user._id;
    }
    
    // Get all faculty assignments grouped by class/subject
    const facultyAssignments = await FacultyAssignment.find({
      facultyId: facultyId,
      status: 'active'
    });

    // Group by subject (which represents the class)
    const classGroups = {};
    
    facultyAssignments.forEach(assignment => {
      const subjectKey = assignment.subjectName;
      
      if (!classGroups[subjectKey]) {
        classGroups[subjectKey] = {
          subjectName: assignment.subjectName,
          trackName: assignment.trackName,
          strandName: assignment.strandName,
          gradeLevel: assignment.gradeLevel,
          schoolYear: assignment.schoolYear,
          termName: assignment.termName,
          sections: {}
        };
      }
      
      // Group sections under this subject
      if (!classGroups[subjectKey].sections[assignment.sectionName]) {
        classGroups[subjectKey].sections[assignment.sectionName] = {
          sectionName: assignment.sectionName,
          facultyAssignmentId: assignment._id,
          assignments: []
        };
      }
    });

    // Now populate assignments for each section
    for (const subject of Object.values(classGroups)) {
      for (const sectionName of Object.keys(subject.sections)) {
        const section = subject.sections[sectionName];
        
        // Find assignments for this subject and section
        // We'll look for assignments that match the subject name and section
        const assignments = await Assignment.find({
          $or: [
            { subjectName: subject.subjectName },
            { 'assignedTo.sectionName': section.sectionName }
          ]
        }).limit(10); // Limit to prevent too many results
        
        section.assignments = assignments.map(assignment => ({
          _id: assignment._id,
          title: assignment.title,
          type: assignment.type,
          dueDate: assignment.dueDate,
          points: assignment.points,
          subjectName: assignment.subjectName || subject.subjectName
        }));
      }
    }

    // Convert to array format
    const classHierarchy = Object.values(classGroups).map(subject => ({
      ...subject,
      sections: Object.values(subject.sections)
    }));

    res.json({
      success: true,
      classes: classHierarchy
    });

  } catch (error) {
    console.error('Error fetching faculty classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching classes',
      error: error.message
    });
  }
});

// Get grade breakdown for a specific student and quarter
router.get('/student/:studentId/breakdown', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { quarter, classId, termName, academicYear } = req.query;
    
    console.log('Grade breakdown request:', { studentId, quarter, classId, termName, academicYear });

    // Validate required parameters
    if (!quarter || !classId || !termName || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: quarter, classId, termName, academicYear'
      });
    }

    // Fetch activities for specific quarter
    const assignments = await Assignment.find({
      classID: classId,
      quarter,
      termName,
      academicYear
    });

    const quizzes = await Quiz.find({
      classID: classId,
      quarter,
      termName,
      academicYear
    });

    // Get student submissions
    const assignmentSubmissions = await Submission.find({
      student: studentId,
      assignment: { $in: assignments.map(a => a._id) }
    });

    const quizResponses = await QuizResponse.find({
      studentId: studentId,
      quizId: { $in: quizzes.map(q => q._id) }
    });

    // Calculate written works breakdown
    const writtenWorks = {
      raw: 0,
      hps: 0,
      ps: 0,
      ws: 0,
      activities: []
    };

    const performanceTasks = {
      raw: 0,
      hps: 0,
      ps: 0,
      ws: 0,
      activities: []
    };

    // Process assignments
    assignments.forEach(assignment => {
      const submission = assignmentSubmissions.find(s => s.assignment.toString() === assignment._id.toString());
      const earnedPoints = submission?.grade || 0;
      const maxPoints = assignment.points || 0;
      
      const activityData = {
        id: assignment._id,
        title: assignment.title,
        type: 'assignment',
        earned: earnedPoints,
        max: maxPoints
      };

      if (assignment.activityType === 'written') {
        writtenWorks.raw += earnedPoints;
        writtenWorks.hps += maxPoints;
        writtenWorks.activities.push(activityData);
      } else if (assignment.activityType === 'performance') {
        performanceTasks.raw += earnedPoints;
        performanceTasks.hps += maxPoints;
        performanceTasks.activities.push(activityData);
      }
    });

    // Process quizzes
    quizzes.forEach(quiz => {
      const response = quizResponses.find(r => r.quizId.toString() === quiz._id.toString());
      const earnedPoints = response?.score || 0;
      const maxPoints = quiz.points || 0;
      
      const activityData = {
        id: quiz._id,
        title: quiz.title,
        type: 'quiz',
        earned: earnedPoints,
        max: maxPoints
      };

      if (quiz.activityType === 'written') {
        writtenWorks.raw += earnedPoints;
        writtenWorks.hps += maxPoints;
        writtenWorks.activities.push(activityData);
      } else if (quiz.activityType === 'performance') {
        performanceTasks.raw += earnedPoints;
        performanceTasks.hps += maxPoints;
        performanceTasks.activities.push(activityData);
      }
    });

    // Calculate percentage scores and weighted scores
    writtenWorks.ps = writtenWorks.hps > 0 ? (writtenWorks.raw / writtenWorks.hps) * 100 : 0;
    writtenWorks.ws = writtenWorks.ps * 0.3; // 30% weight for written works

    performanceTasks.ps = performanceTasks.hps > 0 ? (performanceTasks.raw / performanceTasks.hps) * 100 : 0;
    performanceTasks.ws = performanceTasks.ps * 0.5; // 50% weight for performance tasks

    const breakdown = {
      writtenWorks,
      performanceTasks,
      quarter,
      termName,
      academicYear,
      totalInitialGrade: writtenWorks.ws + performanceTasks.ws
    };

    res.json({ success: true, breakdown });
  } catch (error) {
    console.error('Error calculating grade breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate grade breakdown',
      error: error.message
    });
  }
});

// Get comprehensive grade data for a class section (for export)
router.get('/class/:classId/section/:sectionName/comprehensive', authenticateToken, async (req, res) => {
  try {
    const { classId, sectionName } = req.params;
    const facultyId = req.user.userID;
    
    console.log('Comprehensive grade request:', { classId, sectionName, facultyId });

    // Verify faculty has access to this class
    const classData = await Class.findOne({ 
      classID: classId, 
      facultyID: facultyId 
    });
    
    console.log('Class lookup result:', classData ? 'Found' : 'Not found', { classId, facultyId });

    if (!classData) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Get all assignments for this class
    const assignments = await FacultyAssignment.find({
      classID: classId,
      sectionName: sectionName
    }).populate('subjectId', 'subjectCode subjectDescription');

    // Get all quizzes for this class
    const quizzes = await Quiz.find({
      'assignedTo.classID': classId
    });

    // Get all students in this section
    const students = await User.find({
      role: 'students',
      _id: { $in: classData.studentIDs || [] }
    }, 'firstname lastname userID schoolID');

    // Get all submissions and quiz responses
    const assignmentSubmissions = await Submission.find({
      assignment: { $in: assignments.map(a => a._id) }
    }).populate('student', 'firstname lastname userID');

    const quizResponses = await QuizResponse.find({
      quizId: { $in: quizzes.map(q => q._id) }
    }).populate('studentId', 'firstname lastname userID');

    // Build comprehensive grade data
    const gradeData = students.map(student => {
      const studentData = {
        studentId: student._id,
        studentName: `${student.firstname} ${student.lastname}`,
        userID: student.userID,
        schoolID: student.schoolID,
        assignments: [],
        quizzes: [],
        totalScore: 0,
        totalPossible: 0
      };

      // Add assignment grades
      assignments.forEach(assignment => {
        const submission = assignmentSubmissions.find(s => 
          s.assignment.toString() === assignment._id.toString() && 
          s.student._id.toString() === student._id.toString()
        );

        studentData.assignments.push({
          assignmentId: assignment._id,
          assignmentTitle: assignment.title,
          subjectCode: assignment.subjectId?.subjectCode || 'N/A',
          subjectDescription: assignment.subjectId?.subjectDescription || 'N/A',
          maxPoints: assignment.points || 0,
          earnedPoints: submission?.grade || 0,
          status: submission?.status || 'not-submitted',
          submittedAt: submission?.submittedAt || null,
          feedback: submission?.feedback || ''
        });

        if (submission?.grade !== undefined) {
          studentData.totalScore += submission.grade;
          studentData.totalPossible += assignment.points || 0;
        }
      });

      // Add quiz grades
      quizzes.forEach(quiz => {
        const response = quizResponses.find(r => 
          r.quizId.toString() === quiz._id.toString() && 
          r.studentId._id.toString() === student._id.toString()
        );

        studentData.quizzes.push({
          quizId: quiz._id,
          quizTitle: quiz.title,
          maxPoints: quiz.points || 0,
          earnedPoints: response?.score || 0,
          status: response ? (response.graded ? 'graded' : 'submitted') : 'not-submitted',
          submittedAt: response?.submittedAt || null,
          feedback: response?.feedback || ''
        });

        if (response?.score !== undefined) {
          studentData.totalScore += response.score;
          studentData.totalPossible += quiz.points || 0;
        }
      });

      // Calculate percentage
      studentData.percentage = studentData.totalPossible > 0 
        ? Math.round((studentData.totalScore / studentData.totalPossible) * 100) 
        : 0;

      return studentData;
    });

    res.json({
      success: true,
      data: {
        classInfo: {
          classID: classData.classID,
          className: classData.className,
          sectionName: sectionName,
          facultyID: classData.facultyID,
          academicYear: classData.academicYear,
          termName: classData.termName
        },
        assignments: assignments.map(a => ({
          id: a._id,
          title: a.title,
          subjectCode: a.subjectId?.subjectCode || 'N/A',
          points: a.points || 0
        })),
        quizzes: quizzes.map(q => ({
          id: q._id,
          title: q.title,
          points: q.points || 0
        })),
        students: gradeData
      }
    });

  } catch (error) {
    console.error('Error getting comprehensive grade data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve comprehensive grade data' 
    });
  }
});

// Export quarter-scoped class list (WW/PT Raw/HPS/PS/WS) for a class section
router.get('/export/quarter-classlist', authenticateToken, async (req, res) => {
  try {
    const { classId, sectionName, academicYear, termName, quarter, wwWeight, ptWeight } = req.query;

    if (!classId || !academicYear || !termName || !quarter) {
      return res.status(400).json({ success: false, message: 'Missing required query params: classId, academicYear, termName, quarter' });
    }

    let students = [];
    if (sectionName) {
      // Prefer section-based lookup when provided
      const studentAssignments = await StudentAssignment.find({
        sectionName,
        schoolYear: academicYear,
        termName
      }).populate('studentId', 'firstname lastname userID');
      students = studentAssignments.map(sa => sa.studentId).filter(Boolean);
    }
    if (!students.length) {
      // Fallback: get students from Class roster
      const classDoc = await Class.findOne({ classID: classId });
      if (classDoc && Array.isArray(classDoc.studentIDs) && classDoc.studentIDs.length) {
        students = await User.find({ _id: { $in: classDoc.studentIDs } }, 'firstname lastname userID');
      }
    }

    // Fetch quarter activities
    const assignments = await Assignment.find({ classID: classId, academicYear, termName, quarter });
    // Quizzes can be attached via assignedTo.classID, not always top-level classID
    const quizzes = await Quiz.find({ 'assignedTo.classID': classId, academicYear, termName, quarter });

    console.log('[EXPORT][params]', { classId, sectionName, academicYear, termName, quarter });
    console.log('[EXPORT][counts before]', { students: students.length, assignments: assignments.length, quizzes: quizzes.length });

    // Fetch submissions/responses
    const assignmentIds = assignments.map(a => a._id);
    const quizIds = quizzes.map(q => q._id);

    const submissions = await Submission.find({ assignment: { $in: assignmentIds } });
    const responses = await QuizResponse.find({ quizId: { $in: quizIds } });
    console.log('[EXPORT][subs/resps]', { submissions: submissions.length, responses: responses.length });

    // Build per-student WW/PT raw/hps
    const studentsData = students.map(stu => {
      let wwRaw = 0, wwHps = 0, ptRaw = 0, ptHps = 0;

      // Assignments
      assignments.forEach(a => {
        const sub = submissions.find(s => {
          const sAssign = s.assignment?.toString?.();
          const sStudentObj = s.student?.toString?.();
          const sStudentAlt = s.studentID ? String(s.studentID) : undefined;
          const targetObj = stu?._id?.toString?.();
          const targetAlt = stu?.userID ? String(stu.userID) : undefined;
          return sAssign === a._id.toString() && (
            (sStudentObj && targetObj && sStudentObj === targetObj) ||
            (sStudentAlt && targetAlt && sStudentAlt === targetAlt)
          );
        });
        const earned = sub?.grade || 0;
        const max = a.points || 0;
        if (a.activityType === 'written') { wwRaw += earned; wwHps += max; }
        else if (a.activityType === 'performance') { ptRaw += earned; ptHps += max; }
      });

      // Quizzes
      quizzes.forEach(q => {
        const resp = responses.find(r => {
          const rQuiz = r.quizId?.toString?.();
          const rObj = r.studentId?._id?.toString?.() || r.studentId?.toString?.();
          const rAlt = r.studentID ? String(r.studentID) : undefined;
          const targetObj = stu?._id?.toString?.();
          const targetAlt = stu?.userID ? String(stu.userID) : undefined;
          return rQuiz === q._id.toString() && (
            (rObj && targetObj && rObj === targetObj) ||
            (rAlt && targetAlt && rAlt === targetAlt)
          );
        });
        const earned = resp?.score || 0;
        const max = q.points || 0;
        if (q.activityType === 'written') { wwRaw += earned; wwHps += max; }
        else if (q.activityType === 'performance') { ptRaw += earned; ptHps += max; }
      });

      return {
        studentName: `${stu.firstname} ${stu.lastname}`,
        wwRaw, wwHps, ptRaw, ptHps
      };
    });

    const buffer = generateQuarterSummaryClassList(studentsData, {
      academicYear,
      termName,
      quarter,
      wwWeight: wwWeight ? Number(wwWeight) : 0.4,
      ptWeight: ptWeight ? Number(ptWeight) : 0.6
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="quarter_classlist_${classId}_${sectionName}_${quarter}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting quarter class list:', error);
    res.status(500).json({ success: false, message: 'Failed to export', error: error.message });
  }
});

// Helper function to calculate total points from activities and quizzes
async function calculateTotalPoints(classId, quarter, termName, academicYear) {
  try {
    // Get all assignments for this class, quarter, term, and academic year
    const assignments = await Assignment.find({
      classID: classId,
      quarter,
      termName,
      academicYear
    });

    // Get all quizzes for this class, quarter, term, and academic year
    const quizzes = await Quiz.find({
      classID: classId,
      quarter,
      termName,
      academicYear
    });

    // Calculate total points breakdown
    const writtenWorks = {
      totalPoints: 0,
      activities: []
    };

    const performanceTasks = {
      totalPoints: 0,
      activities: []
    };

    // Process assignments
    assignments.forEach(assignment => {
      const maxPoints = assignment.points || 0;
      
      const activityData = {
        id: assignment._id,
        title: assignment.title,
        type: 'assignment',
        points: maxPoints,
        activityType: assignment.activityType
      };

      if (assignment.activityType === 'written') {
        writtenWorks.totalPoints += maxPoints;
        writtenWorks.activities.push(activityData);
      } else if (assignment.activityType === 'performance') {
        performanceTasks.totalPoints += maxPoints;
        performanceTasks.activities.push(activityData);
      }
    });

    // Process quizzes
    quizzes.forEach(quiz => {
      const maxPoints = quiz.points || 0;
      
      const activityData = {
        id: quiz._id,
        title: quiz.title,
        type: 'quiz',
        points: maxPoints,
        activityType: quiz.activityType
      };

      if (quiz.activityType === 'written') {
        writtenWorks.totalPoints += maxPoints;
        writtenWorks.activities.push(activityData);
      } else if (quiz.activityType === 'performance') {
        performanceTasks.totalPoints += maxPoints;
        performanceTasks.activities.push(activityData);
      }
    });

    return {
      writtenWorks,
      performanceTasks,
      grandTotal: writtenWorks.totalPoints + performanceTasks.totalPoints,
      summary: {
        totalActivities: assignments.length + quizzes.length,
        totalAssignments: assignments.length,
        totalQuizzes: quizzes.length,
        writtenWorksCount: writtenWorks.activities.length,
        performanceTasksCount: performanceTasks.activities.length
      }
    };
  } catch (error) {
    console.error('[GRADING] Error calculating total points:', error);
    throw error;
  }
}

// Get total points (HPS) from all activities and quizzes for a class
router.get('/total-points/:classId', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const { quarter, termName, academicYear } = req.query;

    if (!quarter || !termName || !academicYear) {
      return res.status(400).json({ 
        error: 'Quarter, term name, and academic year are required' 
      });
    }

    console.log(`[GRADING] Calculating total points for class ${classId}, quarter ${quarter}, term ${termName}, year ${academicYear}`);

    const totalPoints = await calculateTotalPoints(classId, quarter, termName, academicYear);

    console.log(`[GRADING] Total points calculated:`, {
      writtenWorks: totalPoints.writtenWorks.totalPoints,
      performanceTasks: totalPoints.performanceTasks.totalPoints,
      grandTotal: totalPoints.grandTotal
    });

    res.json(totalPoints);
  } catch (error) {
    console.error('[GRADING] Error calculating total points:', error);
    res.status(500).json({ error: 'Failed to calculate total points' });
  }
});

// Get student grading data with auto-calculated HPS
router.get('/student-grading/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, quarter, termName, academicYear } = req.query;

    if (!classId || !quarter || !termName || !academicYear) {
      return res.status(400).json({ 
        error: 'Class ID, quarter, term name, and academic year are required' 
      });
    }

    console.log(`[GRADING] Getting student grading data for student ${studentId}, class ${classId}, quarter ${quarter}, term ${termName}, year ${academicYear}`);

    // Get total points from all activities and quizzes
    const totalPoints = await calculateTotalPoints(classId, quarter, termName, academicYear);

    // Get student's current grades using the existing breakdown logic
    const assignments = await Assignment.find({
      classID: classId,
      quarter,
      termName,
      academicYear
    });

    const quizzes = await Quiz.find({
      classID: classId,
      quarter,
      termName,
      academicYear
    });

    // Get student submissions
    const assignmentSubmissions = await Submission.find({
      student: studentId,
      assignment: { $in: assignments.map(a => a._id) }
    });

    const quizResponses = await QuizResponse.find({
      studentId: studentId,
      quizId: { $in: quizzes.map(q => q._id) }
    });

    // Calculate written works breakdown
    const writtenWorks = {
      raw: 0,
      hps: 0,
      ps: 0,
      ws: 0,
      activities: []
    };

    const performanceTasks = {
      raw: 0,
      hps: 0,
      ps: 0,
      ws: 0,
      activities: []
    };

    // Process assignments
    assignments.forEach(assignment => {
      const submission = assignmentSubmissions.find(s => s.assignment.toString() === assignment._id.toString());
      const earnedPoints = submission?.grade || 0;
      const maxPoints = assignment.points || 0;
      
      const activityData = {
        id: assignment._id,
        title: assignment.title,
        type: 'assignment',
        earned: earnedPoints,
        max: maxPoints
      };

      if (assignment.activityType === 'written') {
        writtenWorks.raw += earnedPoints;
        writtenWorks.hps += maxPoints;
        writtenWorks.activities.push(activityData);
      } else if (assignment.activityType === 'performance') {
        performanceTasks.raw += earnedPoints;
        performanceTasks.hps += maxPoints;
        performanceTasks.activities.push(activityData);
      }
    });

    // Process quizzes
    quizzes.forEach(quiz => {
      const response = quizResponses.find(r => r.quizId.toString() === quiz._id.toString());
      const earnedPoints = response?.score || 0;
      const maxPoints = quiz.points || 0;
      
      const activityData = {
        id: quiz._id,
        title: quiz.title,
        type: 'quiz',
        earned: earnedPoints,
        max: maxPoints
      };

      if (quiz.activityType === 'written') {
        writtenWorks.raw += earnedPoints;
        writtenWorks.hps += maxPoints;
        writtenWorks.activities.push(activityData);
      } else if (quiz.activityType === 'performance') {
        performanceTasks.raw += earnedPoints;
        performanceTasks.hps += maxPoints;
        performanceTasks.activities.push(activityData);
      }
    });

    // Calculate percentage scores and weighted scores
    writtenWorks.ps = writtenWorks.hps > 0 ? (writtenWorks.raw / writtenWorks.hps) * 100 : 0;
    writtenWorks.ws = writtenWorks.ps * 0.3; // 30% weight for written works

    performanceTasks.ps = performanceTasks.hps > 0 ? (performanceTasks.raw / performanceTasks.hps) * 100 : 0;
    performanceTasks.ws = performanceTasks.ps * 0.5; // 50% weight for performance tasks

    const studentGrades = {
      writtenWorks,
      performanceTasks
    };

    // Combine total points with student's current performance
    const gradingData = {
      studentId,
      classId,
      quarter,
      termName,
      academicYear,
      totalPoints: {
        writtenWorks: totalPoints.writtenWorks.totalPoints,
        performanceTasks: totalPoints.performanceTasks.totalPoints,
        grandTotal: totalPoints.grandTotal
      },
      studentPerformance: {
        writtenWorks: studentGrades.writtenWorks,
        performanceTasks: studentGrades.performanceTasks
      },
      activities: {
        writtenWorks: totalPoints.writtenWorks.activities,
        performanceTasks: totalPoints.performanceTasks.activities
      },
      summary: totalPoints.summary
    };

    console.log(`[GRADING] Student grading data prepared:`, {
      totalPoints: gradingData.totalPoints,
      studentPerformance: {
        writtenWorks: gradingData.studentPerformance.writtenWorks.raw,
        performanceTasks: gradingData.studentPerformance.performanceTasks.raw
      }
    });

    res.json(gradingData);
  } catch (error) {
    console.error('[GRADING] Error getting student grading data:', error);
    res.status(500).json({ error: 'Failed to get student grading data' });
  }
});

export default router; 