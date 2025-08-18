import express from 'express';
import TraditionalGrade from '../models/TraditionalGrade.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import StudentAssignment from '../models/StudentAssignment.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import Term from '../models/Term.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Get faculty classes and sections for grading
router.get('/faculty/classes-sections', authenticateToken, async (req, res) => {
  try {
    const facultyId = req.user.userID; // Use userID from the user object
    
    // Get all faculty assignments for the logged-in faculty
    const facultyAssignments = await FacultyAssignment.find({ 
      facultyId,
      status: 'active'
    }).populate('termId');

    // Group by class (subject) and section
    const classSectionMap = new Map();
    
    facultyAssignments.forEach(assignment => {
      const key = `${assignment.subjectName}-${assignment.sectionName}`;
      if (!classSectionMap.has(key)) {
        classSectionMap.set(key, {
          classId: assignment._id,
          className: assignment.subjectName,
          sectionName: assignment.sectionName,
          trackName: assignment.trackName,
          strandName: assignment.strandName,
          gradeLevel: assignment.gradeLevel,
          schoolYear: assignment.schoolYear,
          termName: assignment.termName,
          termId: assignment.termId
        });
      }
    });

    const classesAndSections = Array.from(classSectionMap.values());
    
    res.json({
      success: true,
      classes: classesAndSections
    });
  } catch (error) {
    console.error('Error fetching faculty classes and sections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching classes and sections'
    });
  }
});

// Get students in a specific class for grading
router.get('/faculty/students/:classId', authenticateToken, async (req, res) => {
  try {
    const facultyId = req.user.userID;
    const { classId } = req.params;

    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    // Verify the faculty has access to this class
    const facultyAssignment = await FacultyAssignment.findOne({
      facultyId,
      classId,
      status: 'active'
    });

    if (!facultyAssignment) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this class.'
      });
    }

    // Get students assigned to this class
    const studentAssignments = await StudentAssignment.find({
      classId,
      status: 'active'
    }).populate('studentId', 'firstname lastname schoolID');

    // Get subjects for this class
    const subjects = await Subject.find({
      trackName: facultyAssignment.trackName,
      strandName: facultyAssignment.strandName,
      gradeLevel: facultyAssignment.gradeLevel,
      status: 'active'
    });

    // Transform students data to include subjects
    const students = studentAssignments.map(studentAssignment => {
      const student = studentAssignment.studentId;
      return {
        _id: student._id,
        name: `${student.firstname} ${student.lastname}`,
        schoolID: student.schoolID,
        sectionName: studentAssignment.sectionName,
        trackName: studentAssignment.trackName,
        strandName: studentAssignment.strandName,
        gradeLevel: studentAssignment.gradeLevel,
        subjects: subjects.map(subject => ({
          _id: subject._id,
          subjectCode: subject.subjectCode || subject.subjectName,
          subjectDescription: subject.subjectDescription || subject.subjectName
        }))
      };
    });

    res.json({
      success: true,
      students,
      subjects: subjects.map(subject => ({
        _id: subject._id,
        subjectCode: subject.subjectCode || subject.subjectName,
        subjectDescription: subject.subjectDescription || subject.subjectName
      }))
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students'
    });
  }
});

// Get subjects for a faculty assignment
router.get('/faculty/:facultyAssignmentId/subjects', authenticateToken, async (req, res) => {
  try {
    const { facultyAssignmentId } = req.params;
    const facultyId = req.user.userID;

    // Verify faculty has access to this assignment
    const facultyAssignment = await FacultyAssignment.findOne({
      _id: facultyAssignmentId,
      facultyId,
      status: 'active'
    });

    if (!facultyAssignment) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this assignment'
      });
    }

    // Get subjects for this track, strand, grade level, term
    const subjects = await Subject.find({
      trackName: facultyAssignment.trackName,
      strandName: facultyAssignment.strandName,
      gradeLevel: facultyAssignment.gradeLevel,
      schoolYear: facultyAssignment.schoolYear,
      termName: facultyAssignment.termName,
      status: 'active'
    });

    res.json({
      success: true,
      data: subjects
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subjects'
    });
  }
});

// Get grades for a specific section and subject
router.get('/section/:sectionName/subject/:subjectId/grades', authenticateToken, async (req, res) => {
  try {
    const { sectionName, subjectId } = req.params;
    const { trackName, strandName, gradeLevel, schoolYear, termName } = req.query;
    const facultyId = req.user.id;

    // Verify faculty has access to this section
    const facultyAssignment = await FacultyAssignment.findOne({
      facultyId,
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName,
      status: 'active'
    });

    if (!facultyAssignment) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this section'
      });
    }

    // Get all grades for this section and subject
    const grades = await TraditionalGrade.find({
      sectionName,
      subjectId,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName
    }).populate('studentId', 'firstname lastname schoolID');

    // Get all students in the section to ensure we show all students
    const studentAssignments = await StudentAssignment.find({
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName,
      status: 'active'
    }).populate('studentId', 'firstname lastname schoolID');

    // Create a map of existing grades
    const gradeMap = new Map();
    grades.forEach(grade => {
      gradeMap.set(grade.studentId._id.toString(), grade);
    });

    // Combine students with their grades (or create empty grade entries)
    const result = studentAssignments.map(sa => {
      const existingGrade = gradeMap.get(sa.studentId._id.toString());
      if (existingGrade) {
        return {
          _id: existingGrade._id,
          studentId: existingGrade.studentId._id,
          studentName: `${existingGrade.studentId.firstname} ${existingGrade.studentId.lastname}`,
          schoolID: existingGrade.studentId.schoolID,
          grades: existingGrade.grades,
          remark: existingGrade.remark,
          status: existingGrade.status
        };
      } else {
        return {
          _id: null,
          studentId: sa.studentId._id,
          studentName: `${sa.studentId.firstname} ${sa.studentId.lastname}`,
          schoolID: sa.studentId.schoolID,
          grades: {
            prelims: null,
            midterms: null,
            finals: null,
            finalGrade: null
          },
          remark: '',
          status: 'draft'
        };
      }
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching grades'
    });
  }
});

// Save/update grades for a section and subject
router.post('/section/:sectionName/subject/:subjectId/grades', authenticateToken, async (req, res) => {
  try {
    const { sectionName, subjectId } = req.params;
    const { trackName, strandName, gradeLevel, schoolYear, termName, grades } = req.body;
    const facultyId = req.user.id;

    // Verify faculty has access to this section
    const facultyAssignment = await FacultyAssignment.findOne({
      facultyId,
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName,
      status: 'active'
    });

    if (!facultyAssignment) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this section'
      });
    }

    const results = [];
    const errors = [];

    // Process each grade entry
    for (const gradeEntry of grades) {
      try {
        const { studentId, grades: studentGrades, remark } = gradeEntry;

        // Validate grades
        if (studentGrades.prelims !== null && (studentGrades.prelims < 0 || studentGrades.prelims > 100)) {
          errors.push(`Invalid prelims grade for student ${studentId}: must be between 0-100`);
          continue;
        }
        if (studentGrades.midterms !== null && (studentGrades.midterms < 0 || studentGrades.midterms > 100)) {
          errors.push(`Invalid midterms grade for student ${studentId}: must be between 0-100`);
          continue;
        }
        if (studentGrades.finals !== null && (studentGrades.finals < 0 || studentGrades.finals > 100)) {
          errors.push(`Invalid finals grade for student ${studentId}: must be between 0-100`);
          continue;
        }
        if (studentGrades.finalGrade !== null && (studentGrades.finalGrade < 0 || studentGrades.finalGrade > 100)) {
          errors.push(`Invalid final grade for student ${studentId}: must be between 0-100`);
          continue;
        }

        // Find existing grade or create new one
        let gradeDoc = await TraditionalGrade.findOne({
          studentId,
          subjectId,
          sectionName,
          trackName,
          strandName,
          gradeLevel,
          schoolYear,
          termName
        });

        if (gradeDoc) {
          // Update existing grade
          gradeDoc.grades = studentGrades;
          gradeDoc.remark = remark;
          gradeDoc.lastUpdatedBy = facultyId;
          await gradeDoc.save();
        } else {
          // Create new grade
          gradeDoc = new TraditionalGrade({
            studentId,
            subjectId,
            facultyId,
            sectionName,
            trackName,
            strandName,
            gradeLevel,
            schoolYear,
            termName,
            grades: studentGrades,
            remark,
            lastUpdatedBy: facultyId
          });
          await gradeDoc.save();
        }

        results.push({
          studentId,
          success: true,
          gradeId: gradeDoc._id
        });

      } catch (error) {
        errors.push(`Error processing grade for student ${gradeEntry.studentId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} grades successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error saving grades:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving grades'
    });
  }
});

// Get student's own grades
router.get('/student/my-grades', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.userID;
    const { termId } = req.query;

    if (req.user.role !== 'students') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Students only.'
      });
    }

    let query = { studentId };
    
    if (termId) {
      // If termId is provided, get the term details
      const term = await Term.findById(termId);
      if (term) {
        query.schoolYear = term.schoolYear;
        query.termName = term.termName;
      }
    }

    const grades = await TraditionalGrade.find(query)
      .populate('subjectId', 'subjectCode subjectDescription subjectName')
      .populate('facultyId', 'firstname lastname');

    // Transform the data to match frontend expectations
    const transformedGrades = grades.map(grade => ({
      _id: grade._id,
      subjectCode: grade.subjectId?.subjectCode || grade.subjectId?.subjectName || 'N/A',
      subjectDescription: grade.subjectId?.subjectDescription || grade.subjectId?.subjectName || 'N/A',
      prelims: grade.prelims,
      midterms: grade.midterms,
      final: grade.final,
      finalGrade: grade.finalGrade || grade.calculatedFinalGrade,
      remark: grade.remark,
      facultyName: grade.facultyId ? `${grade.facultyId.firstname} ${grade.facultyId.lastname}` : 'N/A',
      sectionName: grade.sectionName,
      trackName: grade.trackName,
      strandName: grade.strandName,
      gradeLevel: grade.gradeLevel,
      schoolYear: grade.schoolYear,
      termName: grade.termName
    }));

    res.json({
      success: true,
      grades: transformedGrades
    });

  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching grades'
    });
  }
});

// Principal view - Get traditional grades by grade level, strand, section, and subject
router.get('/principal-view', authenticateToken, async (req, res) => {
  try {
    const { gradeLevel, strand, section, subject, termName, academicYear } = req.query;
    
    // Only principals can access this endpoint
    if (req.user.role !== 'principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Principals only.'
      });
    }

    // Validate required parameters
    if (!gradeLevel || !strand || !section || !subject || !termName || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: gradeLevel, strand, section, subject, termName, academicYear'
      });
    }

    // Build query to find grades matching the criteria
    const query = {
      termName: termName,
      schoolYear: academicYear,
      gradeLevel: gradeLevel,
      strandName: strand,
      sectionName: section
    };

    // Try to find grades by subject
    const grades = await TraditionalGrade.find(query)
      .populate('subjectId', 'subjectCode subjectDescription subjectName')
      .populate('studentId', 'firstname lastname schoolID')
      .sort({ 'studentId.firstname': 1, 'studentId.lastname': 1 });

    if (grades.length === 0) {
      return res.json({
        success: true,
        message: 'No traditional grades found for the specified criteria',
        grades: [],
        students: []
      });
    }

    // Transform grades to match expected format
    const transformedGrades = grades.map(grade => ({
      _id: grade._id,
      studentName: grade.studentId ? `${grade.studentId.firstname} ${grade.studentId.lastname}` : 'N/A',
      schoolID: grade.studentId?.schoolID || 'N/A',
      subjectCode: grade.subjectId?.subjectCode || 'N/A',
      subjectName: grade.subjectId?.subjectName || 'N/A',
      prelims: grade.prelims,
      midterms: grade.midterms,
      final: grade.final,
      finalGrade: grade.finalGrade,
      remark: grade.remark,
      sectionName: grade.sectionName,
      trackName: grade.trackName,
      strandName: grade.strandName,
      gradeLevel: grade.gradeLevel,
      schoolYear: grade.schoolYear,
      termName: grade.termName
    }));

    // Extract unique students
    const students = [...new Set(transformedGrades.map(grade => ({
      _id: grade._id,
      name: grade.studentName,
      schoolID: grade.schoolID
    })))];

    res.json({
      success: true,
      message: `Found ${transformedGrades.length} traditional grade records`,
      grades: transformedGrades,
      students: students,
      filters: {
        gradeLevel,
        strand,
        section,
        subject,
        termName,
        academicYear
      }
    });

  } catch (error) {
    console.error('Error fetching principal view traditional grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch traditional grades for principal view',
      error: error.message
    });
  }
});

// Get all traditional grades (for principals)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const { termName, academicYear } = req.query;
    
    // Only principals can access this endpoint
    if (req.user.role !== 'principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Principals only.'
      });
    }

    if (!termName || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'termName and academicYear query parameters are required'
      });
    }

    const grades = await TraditionalGrade.find({
      termName: termName,
      schoolYear: academicYear
    })
    .populate('subjectId', 'subjectCode subjectDescription subjectName')
    .populate('studentId', 'firstname lastname schoolID')
    .sort({ 'studentId.firstname': 1, 'studentId.lastname': 1 });

    // Transform grades to match expected format
    const transformedGrades = grades.map(grade => ({
      _id: grade._id,
      studentName: grade.studentId ? `${grade.studentId.firstname} ${grade.studentId.lastname}` : 'N/A',
      studentId: grade.studentId?._id || 'N/A',
      schoolID: grade.studentId?.schoolID || 'N/A',
      subjectCode: grade.subjectId?.subjectCode || 'N/A',
      subjectName: grade.subjectId?.subjectName || 'N/A',
      prelims: grade.prelims,
      midterms: grade.midterms,
      final: grade.final,
      finalGrade: grade.finalGrade,
      remark: grade.remark,
      sectionName: grade.sectionName,
      trackName: grade.trackName,
      strandName: grade.strandName,
      gradeLevel: grade.gradeLevel,
      schoolYear: grade.schoolYear,
      termName: grade.termName
    }));

    res.json({
      success: true,
      message: `Found ${transformedGrades.length} traditional grade records`,
      grades: transformedGrades
    });

  } catch (error) {
    console.error('Error fetching all traditional grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all traditional grades',
      error: error.message
    });
  }
});

// Download CSV template for grades
router.get('/template/:sectionName/:subjectId', authenticateToken, async (req, res) => {
  try {
    const { sectionName, subjectId } = req.params;
    const { trackName, strandName, gradeLevel, schoolYear, termName } = req.query;
    const facultyId = req.user.id;

    // Verify faculty has access to this section
    const facultyAssignment = await FacultyAssignment.findOne({
      facultyId,
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName,
      status: 'active'
    });

    if (!facultyAssignment) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this section'
      });
    }

    // Get students in the section
    const studentAssignments = await StudentAssignment.find({
      sectionName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName,
      status: 'active'
    }).populate('studentId', 'firstname lastname schoolID');

    // Get subject details
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Create CSV content
    const csvHeader = 'Student Name,School ID,Subject Code,Subject Description,Prelims,Midterms,Finals,Final Grade,Remark\n';
    const csvRows = studentAssignments.map(sa => {
      const studentName = `${sa.studentId.firstname} ${sa.studentId.lastname}`;
      return `${studentName},${sa.studentId.schoolID},${subject.subjectName},${subject.subjectName},,,,,\n`;
    }).join('');

    const csvContent = csvHeader + csvRows;

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="grades_template_${sectionName}_${subject.subjectName}.csv"`);
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating template'
    });
  }
});

// Download CSV template for traditional grades
router.get('/faculty/template/:classId', authenticateToken, async (req, res) => {
  try {
    const facultyId = req.user.userID;
    const { classId } = req.params;

    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    // Verify the faculty has access to this class
    const facultyAssignment = await FacultyAssignment.findOne({
      facultyId,
      classId,
      status: 'active'
    });

    if (!facultyAssignment) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this class.'
      });
    }

    // Get students assigned to this class
    const studentAssignments = await StudentAssignment.find({
      classId,
      status: 'active'
    }).populate('studentId', 'firstname lastname schoolID');

    // Get subjects for this class
    const subjects = await Subject.find({
      trackName: facultyAssignment.trackName,
      strandName: facultyAssignment.strandName,
      gradeLevel: facultyAssignment.gradeLevel,
      status: 'active'
    });

    // Generate CSV content
    let csvContent = 'Student ID,Student Name,Subject Code,Subject Description,Prelims,Midterms,Final,Final Grade,Remark\n';
    
    studentAssignments.forEach(studentAssignment => {
      const student = studentAssignment.studentId;
      subjects.forEach(subject => {
        csvContent += `${student.schoolID},"${student.firstname} ${student.lastname}",${subject.subjectCode || subject.subjectName},"${subject.subjectDescription || subject.subjectName}",,,,\n`;
      });
    });

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="traditional-grades-template.csv"');
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating template'
    });
  }
});

// Upload grades CSV
router.post('/faculty/upload', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.body;
    const facultyId = req.user.userID;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Verify faculty has access to this class
    const facultyAssignment = await FacultyAssignment.findById(classId);
    if (!facultyAssignment || facultyAssignment.facultyId.toString() !== facultyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this class'
      });
    }

    // Process the uploaded CSV file
    const { processTraditionalGradeCSV } = await import('../utils/traditionalGradeProcessor.js');
    const processedGrades = await processTraditionalGradeCSV(req.file.path);

    // Save grades to database
    const results = [];
    const errors = [];

    for (const gradeData of processedGrades) {
      try {
        // Find student by school ID
        const student = await User.findOne({ 
          schoolID: gradeData.studentId,
          role: 'students'
        });

        if (!student) {
          errors.push(`Student with ID ${gradeData.studentId} not found`);
          continue;
        }

        // Find subject by subject code
        const subject = await Subject.findOne({
          subjectCode: gradeData.subjectCode,
          trackName: facultyAssignment.trackName,
          strandName: facultyAssignment.strandName,
          gradeLevel: facultyAssignment.gradeLevel,
          schoolYear: facultyAssignment.schoolYear,
          termName: facultyAssignment.termName
        });

        if (!subject) {
          errors.push(`Subject ${gradeData.subjectCode} not found`);
          continue;
        }

        // Create or update grade
        const gradeDoc = await TraditionalGrade.findOneAndUpdate(
          {
            studentId: student._id,
            subjectId: subject._id,
            sectionName: facultyAssignment.sectionName,
            schoolYear: facultyAssignment.schoolYear,
            termName: facultyAssignment.termName
          },
          {
            facultyId: facultyId,
            trackName: facultyAssignment.trackName,
            strandName: facultyAssignment.strandName,
            gradeLevel: facultyAssignment.gradeLevel,
            prelims: gradeData.prelims,
            midterms: gradeData.midterms,
            final: gradeData.final,
            finalGrade: gradeData.finalGrade,
            remark: gradeData.remark,
            lastUpdatedBy: facultyId
          },
          { upsert: true, new: true }
        );

        results.push(gradeDoc);
      } catch (error) {
        errors.push(`Error processing grade for ${gradeData.studentId}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: `Successfully processed ${results.length} grades`,
      results: results.length,
      errors: errors
    });

  } catch (error) {
    console.error('Error uploading grades:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading grades'
    });
  }
});

// Upload traditional grades from CSV
router.post('/faculty/upload', upload.single('file'), authenticateToken, async (req, res) => {
  try {
    const facultyId = req.user.userID;
    const { classId } = req.body;

    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Verify the faculty has access to this class
    const facultyAssignment = await FacultyAssignment.findOne({
      facultyId,
      classId,
      status: 'active'
    });

    if (!facultyAssignment) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this class.'
      });
    }

    // Process the uploaded file
    const filePath = req.file.path;
    const results = [];
    const errors = [];

    // Read and parse CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      
      if (columns.length < 8) {
        errors.push(`Line ${i + 1}: Invalid number of columns`);
        continue;
      }

      const [studentId, studentName, subjectCode, subjectDescription, prelims, midterms, final, finalGrade, remark] = columns;

      try {
        // Find student by school ID
        const student = await User.findOne({ 
          schoolID: studentId, 
          role: 'students' 
        });

        if (!student) {
          errors.push(`Line ${i + 1}: Student with ID ${studentId} not found`);
          continue;
        }

        // Find subject by code or name
        const subject = await Subject.findOne({
          $or: [
            { subjectCode: subjectCode },
            { subjectName: subjectCode }
          ],
          trackName: facultyAssignment.trackName,
          strandName: facultyAssignment.strandName,
          gradeLevel: facultyAssignment.gradeLevel,
          status: 'active'
        });

        if (!subject) {
          errors.push(`Line ${i + 1}: Subject ${subjectCode} not found`);
          continue;
        }

        // Calculate final grade if not provided
        let calculatedFinalGrade = finalGrade;
        if (!finalGrade && prelims && midterms && final) {
          const prelimsNum = parseFloat(prelims) || 0;
          const midtermsNum = parseFloat(midterms) || 0;
          const finalNum = parseFloat(final) || 0;
          calculatedFinalGrade = (prelimsNum * 0.3 + midtermsNum * 0.3 + finalNum * 0.4).toFixed(2);
        }

        // Calculate remark if not provided
        let calculatedRemark = remark;
        if (!remark && calculatedFinalGrade) {
          calculatedRemark = parseFloat(calculatedFinalGrade) >= 75 ? 'PASSED' : 'FAILED';
        }

        // Create or update traditional grade
        const gradeData = {
          studentId: student._id,
          subjectId: subject._id,
          facultyId: facultyId,
          sectionName: facultyAssignment.sectionName,
          trackName: facultyAssignment.trackName,
          strandName: facultyAssignment.strandName,
          gradeLevel: facultyAssignment.gradeLevel,
          schoolYear: facultyAssignment.schoolYear,
          termName: facultyAssignment.termName,
          prelims: prelims ? parseFloat(prelims) : null,
          midterms: midterms ? parseFloat(midterms) : null,
          final: final ? parseFloat(final) : null,
          finalGrade: calculatedFinalGrade ? parseFloat(calculatedFinalGrade) : null,
          remark: calculatedRemark,
          calculatedFinalGrade: calculatedFinalGrade ? parseFloat(calculatedFinalGrade) : null
        };

        // Upsert the grade
        await TraditionalGrade.findOneAndUpdate(
          {
            studentId: student._id,
            subjectId: subject._id,
            facultyId: facultyId,
            schoolYear: facultyAssignment.schoolYear,
            termName: facultyAssignment.termName
          },
          gradeData,
          { upsert: true, new: true }
        );

        results.push(`Line ${i + 1}: Grades updated for ${studentName} - ${subjectCode}`);

      } catch (error) {
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some grades could not be processed',
        errors,
        results
      });
    }

    res.json({
      success: true,
      message: `Successfully processed ${results.length} grade entries`,
      results
    });

  } catch (error) {
    console.error('Error uploading grades:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading grades'
    });
  }
});

export default router; 