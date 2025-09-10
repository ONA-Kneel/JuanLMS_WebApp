import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import SemestralGrade from '../models/SemestralGrade.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import SemestralDraft from '../models/SemestralDraft.js';

const router = express.Router();

// Test endpoint to verify the route is working
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Semestral grades route is working',
    timestamp: new Date().toISOString()
  });
});

// Save individual student grades
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const {
      studentId,
      schoolID,
      studentName,
      subjectCode,
      subjectName,
      classID,
      section,
      academicYear,
      termName,
      facultyID,
      grades
    } = req.body;

    // Validate required fields
    if (!schoolID || !studentName || !subjectCode || !classID || !section || !academicYear || !termName || !facultyID) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate grades (0-100 range)
    const gradeFields = ['quarter1', 'quarter2', 'quarter3', 'quarter4'];
    for (const field of gradeFields) {
      if (grades[field] !== null && grades[field] !== undefined && grades[field] !== '') {
        const grade = parseFloat(grades[field]);
        if (isNaN(grade) || grade < 0 || grade > 100) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field} grade: must be between 0-100`
          });
        }
      }
    }

    // Check if faculty has permission to grade this student
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    // Find existing grade record or create new one
    let gradeRecord = await SemestralGrade.findOne({
      schoolID,
      subjectCode,
      academicYear,
      termName
    });

    if (gradeRecord) {
      // Update existing record
      gradeRecord.grades = {
        ...gradeRecord.grades,
        ...grades
      };
      
      // Calculate semester final grade
      if (termName === 'Term 1' && grades.quarter1 && grades.quarter2) {
        gradeRecord.grades.semesterFinal = (parseFloat(grades.quarter1) + parseFloat(grades.quarter2)) / 2;
      } else if (termName === 'Term 2' && grades.quarter3 && grades.quarter4) {
        gradeRecord.grades.semesterFinal = (parseFloat(grades.quarter3) + parseFloat(grades.quarter4)) / 2;
      }
      
      // Calculate remarks based on semester final - ensure it's always a valid enum value
      if (gradeRecord.grades.semesterFinal !== null && gradeRecord.grades.semesterFinal !== undefined && gradeRecord.grades.semesterFinal !== '') {
        const semesterFinal = parseFloat(gradeRecord.grades.semesterFinal);
        if (!isNaN(semesterFinal)) {
          if (semesterFinal >= 75) {
            gradeRecord.grades.remarks = 'PASSED';
          } else {
            gradeRecord.grades.remarks = 'FAILED';
          }
        } else {
          gradeRecord.grades.remarks = 'INCOMPLETE';
        }
      } else {
        gradeRecord.grades.remarks = 'INCOMPLETE';
      }
      
      // Ensure remarks is never empty or invalid
      if (!gradeRecord.grades.remarks || gradeRecord.grades.remarks === '' || !['PASSED', 'FAILED', 'REPEAT', 'INCOMPLETE'].includes(gradeRecord.grades.remarks)) {
        gradeRecord.grades.remarks = 'INCOMPLETE';
      }
      
      gradeRecord.isLocked = true;
      gradeRecord.lastUpdated = new Date();
      
      await gradeRecord.save();
    } else {
      // Create new record
      const newGrades = { ...grades };
      
      // Calculate semester final grade
      if (termName === 'Term 1' && grades.quarter1 && grades.quarter2) {
        newGrades.semesterFinal = (parseFloat(grades.quarter1) + parseFloat(grades.quarter2)) / 2;
      } else if (termName === 'Term 2' && grades.quarter3 && grades.quarter4) {
        newGrades.semesterFinal = (parseFloat(grades.quarter3) + parseFloat(grades.quarter4)) / 2;
      }
      
      // Calculate remarks - ensure it's always a valid enum value
      if (newGrades.semesterFinal !== null && newGrades.semesterFinal !== undefined && newGrades.semesterFinal !== '') {
        const semesterFinal = parseFloat(newGrades.semesterFinal);
        if (!isNaN(semesterFinal)) {
          if (semesterFinal >= 75) {
            newGrades.remarks = 'PASSED';
          } else {
            newGrades.remarks = 'FAILED';
          }
        } else {
          newGrades.remarks = 'INCOMPLETE';
        }
      } else {
        newGrades.remarks = 'INCOMPLETE';
      }
      
      // Ensure remarks is never empty or invalid
      if (!newGrades.remarks || newGrades.remarks === '' || !['PASSED', 'FAILED', 'REPEAT', 'INCOMPLETE'].includes(newGrades.remarks)) {
        newGrades.remarks = 'INCOMPLETE';
      }

      gradeRecord = new SemestralGrade({
        studentId,
        schoolID,
        studentName,
        subjectCode,
        subjectName,
        classID,
        section,
        academicYear,
        termName,
        facultyID,
        grades: newGrades,
        isLocked: true
      });

      await gradeRecord.save();
    }

    res.json({
      success: true,
      message: 'Student grades saved successfully',
      gradeId: gradeRecord._id,
      grades: gradeRecord.grades
    });

  } catch (error) {
    console.error('Error saving student grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save grades',
      error: error.message
    });
  }
});

// Save specific quarter grades for multiple students
router.post('/save-quarter', authenticateToken, async (req, res) => {
  try {
    const {
      classID,
      className,
      academicYear,
      termName,
      facultyID,
      section,
      quarter,
      students
    } = req.body;

    // Validate required fields
    if (!classID || !academicYear || !termName || !facultyID || !section || !quarter || !students || !Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: classID, academicYear, termName, facultyID, section, quarter, students array'
      });
    }

    // Check if faculty has permission
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    const results = [];
    const errors = [];

    // Process each student's grades for the specific quarter
    for (const studentData of students) {
      try {
        const {
          studentID,
          schoolID,
          studentName,
          subjectCode,
          subjectName,
          grades
        } = studentData;

        if (!schoolID || !studentName || !subjectCode) {
          errors.push(`Missing required fields for student ${studentName}`);
          continue;
        }

        // Validate the specific quarter grade
        if (grades[quarter] !== null && grades[quarter] !== undefined && grades[quarter] !== '') {
          const grade = parseFloat(grades[quarter]);
          if (isNaN(grade) || grade < 0 || grade > 100) {
            errors.push(`Invalid ${quarter} grade for ${studentName}: must be between 0-100`);
            continue;
          }
        }

        // Find existing grade record or create new one
        let gradeRecord = await SemestralGrade.findOne({
          schoolID,
          subjectCode,
          academicYear,
          termName
        });

        if (gradeRecord) {
          // Update existing record - only update the specific quarter
          gradeRecord.grades[quarter] = grades[quarter] || null;
          
          // Recalculate semester final grade if both quarters for the term are available
          if (termName === 'Term 1' && grades.quarter1 && grades.quarter2) {
            gradeRecord.grades.semesterFinal = (parseFloat(grades.quarter1) + parseFloat(grades.quarter2)) / 2;
          } else if (termName === 'Term 2' && grades.quarter3 && grades.quarter4) {
            gradeRecord.grades.semesterFinal = (parseFloat(grades.quarter3) + parseFloat(grades.quarter4)) / 2;
          }
          
          // Recalculate remarks based on semester final - ensure it's always a valid enum value
          if (gradeRecord.grades.semesterFinal !== null && gradeRecord.grades.semesterFinal !== undefined && gradeRecord.grades.semesterFinal !== '') {
            const semesterFinal = parseFloat(gradeRecord.grades.semesterFinal);
            if (!isNaN(semesterFinal)) {
              if (semesterFinal >= 75) {
                gradeRecord.grades.remarks = 'PASSED';
              } else {
                gradeRecord.grades.remarks = 'FAILED';
              }
            } else {
              gradeRecord.grades.remarks = 'INCOMPLETE';
            }
          } else {
            gradeRecord.grades.remarks = 'INCOMPLETE';
          }
          
          // Ensure remarks is never empty or invalid
          if (!gradeRecord.grades.remarks || gradeRecord.grades.remarks === '' || !['PASSED', 'FAILED', 'REPEAT', 'INCOMPLETE'].includes(gradeRecord.grades.remarks)) {
            gradeRecord.grades.remarks = 'INCOMPLETE';
          }
          
          // Mark the specific quarter as locked
          gradeRecord[`${quarter}Locked`] = true;
          gradeRecord.lastUpdated = new Date();
          
          await gradeRecord.save();
        } else {
          // Create new record
          const newGrades = { ...grades };
          
          // Calculate semester final grade if both quarters for the term are available
          if (termName === 'Term 1' && grades.quarter1 && grades.quarter2) {
            newGrades.semesterFinal = (parseFloat(grades.quarter1) + parseFloat(grades.quarter2)) / 2;
          } else if (termName === 'Term 2' && grades.quarter3 && grades.quarter4) {
            newGrades.semesterFinal = (parseFloat(grades.quarter3) + parseFloat(grades.quarter4)) / 2;
          }
          
          // Calculate remarks - ensure it's always a valid enum value
          if (newGrades.semesterFinal !== null && newGrades.semesterFinal !== undefined && newGrades.semesterFinal !== '') {
            const semesterFinal = parseFloat(newGrades.semesterFinal);
            if (!isNaN(semesterFinal)) {
              if (semesterFinal >= 75) {
                newGrades.remarks = 'PASSED';
              } else {
                newGrades.remarks = 'FAILED';
              }
            } else {
              newGrades.remarks = 'INCOMPLETE';
            }
          } else {
            newGrades.remarks = 'INCOMPLETE';
          }
          
          // Ensure remarks is never empty or invalid
          if (!newGrades.remarks || newGrades.remarks === '' || !['PASSED', 'FAILED', 'REPEAT', 'INCOMPLETE'].includes(newGrades.remarks)) {
            newGrades.remarks = 'INCOMPLETE';
          }

          gradeRecord = new SemestralGrade({
            studentId: studentID,
            schoolID,
            studentName,
            subjectCode,
            subjectName,
            classID,
            section,
            academicYear,
            termName,
            facultyID,
            grades: newGrades,
            [`${quarter}Locked`]: true, // Mark specific quarter as locked
            isLocked: false // Overall record is not locked yet
          });

          await gradeRecord.save();
        }

        results.push({
          studentName,
          success: true,
          gradeId: gradeRecord._id,
          quarterPosted: quarter
        });

      } catch (error) {
        errors.push(`Error processing ${studentData.studentName}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} students successfully for ${quarter}`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error saving quarter grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save quarter grades',
      error: error.message
    });
  }
});

// Save bulk grades for multiple students
router.post('/save-bulk', authenticateToken, async (req, res) => {
  try {
    const {
      classID,
      className,
      academicYear,
      termName,
      facultyID,
      section,
      students
    } = req.body;

    // Validate required fields
    if (!classID || !academicYear || !termName || !facultyID || !section || !students || !Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields or invalid students array'
      });
    }

    // Check if faculty has permission
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    const results = [];
    const errors = [];

    // Process each student's grades
    for (const studentData of students) {
      try {
        const {
          studentID,
          schoolID,
          studentName,
          subjectCode,
          subjectName,
          grades
        } = studentData;

        if (!schoolID || !studentName || !subjectCode) {
          errors.push(`Missing required fields for student ${studentName}`);
          continue;
        }

        // Validate grades
        const gradeFields = ['quarter1', 'quarter2', 'quarter3', 'quarter4'];
        let hasValidGrades = false;
        
        for (const field of gradeFields) {
          if (grades[field] !== null && grades[field] !== undefined && grades[field] !== '') {
            const grade = parseFloat(grades[field]);
            if (isNaN(grade) || grade < 0 || grade > 100) {
              errors.push(`Invalid ${field} grade for ${studentName}: must be between 0-100`);
              continue;
            }
            hasValidGrades = true;
          }
        }

        if (!hasValidGrades) {
          errors.push(`No valid grades found for ${studentName}`);
          continue;
        }

        // Find existing grade record or create new one
        let gradeRecord = await SemestralGrade.findOne({
          schoolID,
          subjectCode,
          academicYear,
          termName
        });

        if (gradeRecord) {
          // Update existing record
          gradeRecord.grades = {
            ...gradeRecord.grades,
            ...grades
          };
          
          // Calculate semester final grade
          if (termName === 'Term 1' && grades.quarter1 && grades.quarter2) {
            gradeRecord.grades.semesterFinal = (parseFloat(grades.quarter1) + parseFloat(grades.quarter2)) / 2;
          } else if (termName === 'Term 2' && grades.quarter3 && grades.quarter4) {
            gradeRecord.grades.semesterFinal = (parseFloat(grades.quarter3) + parseFloat(grades.quarter4)) / 2;
          }
          
          // Calculate remarks - ensure it's always a valid enum value
          if (gradeRecord.grades.semesterFinal !== null && gradeRecord.grades.semesterFinal !== undefined && gradeRecord.grades.semesterFinal !== '') {
            const semesterFinal = parseFloat(gradeRecord.grades.semesterFinal);
            if (!isNaN(semesterFinal)) {
          if (semesterFinal >= 75) {
            gradeRecord.grades.remarks = 'PASSED';
          } else {
            gradeRecord.grades.remarks = 'FAILED';
          }
            } else {
              gradeRecord.grades.remarks = 'INCOMPLETE';
            }
          } else {
            gradeRecord.grades.remarks = 'INCOMPLETE';
          }
          
          // Ensure remarks is never empty or invalid
          if (!gradeRecord.grades.remarks || gradeRecord.grades.remarks === '' || !['PASSED', 'FAILED', 'REPEAT', 'INCOMPLETE'].includes(gradeRecord.grades.remarks)) {
            gradeRecord.grades.remarks = 'INCOMPLETE';
          }
          
          gradeRecord.isLocked = true;
          gradeRecord.lastUpdated = new Date();
          
          await gradeRecord.save();
        } else {
          // Create new record
          const newGrades = { ...grades };
          
          // Calculate semester final grade
          if (termName === 'Term 1' && grades.quarter1 && grades.quarter2) {
            newGrades.semesterFinal = (parseFloat(grades.quarter1) + parseFloat(grades.quarter2)) / 2;
          } else if (termName === 'Term 2' && grades.quarter3 && grades.quarter4) {
            newGrades.semesterFinal = (parseFloat(grades.quarter3) + parseFloat(grades.quarter4)) / 2;
          }
          
          // Calculate remarks - ensure it's always a valid enum value
          if (newGrades.semesterFinal !== null && newGrades.semesterFinal !== undefined && newGrades.semesterFinal !== '') {
            const semesterFinal = parseFloat(newGrades.semesterFinal);
            if (!isNaN(semesterFinal)) {
              if (semesterFinal >= 75) {
                newGrades.remarks = 'PASSED';
              } else {
                newGrades.remarks = 'FAILED';
              }
            } else {
              newGrades.remarks = 'INCOMPLETE';
            }
          } else {
            newGrades.remarks = 'INCOMPLETE';
          }
          
          // Ensure remarks is never empty or invalid
          if (!newGrades.remarks || newGrades.remarks === '' || !['PASSED', 'FAILED', 'REPEAT', 'INCOMPLETE'].includes(newGrades.remarks)) {
            newGrades.remarks = 'INCOMPLETE';
          }

          gradeRecord = new SemestralGrade({
            studentId: studentID,
            schoolID,
            studentName,
            subjectCode,
            subjectName,
            classID,
            section,
            academicYear,
            termName,
            facultyID,
            grades: newGrades,
            isLocked: true
          });

          await gradeRecord.save();
        }

        results.push({
          studentName,
          success: true,
          gradeId: gradeRecord._id
        });

      } catch (error) {
        errors.push(`Error processing ${studentData.studentName}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} students successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error saving bulk grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save bulk grades',
      error: error.message
    });
  }
});

// Save or update draft for a single student (NOT posted)
router.post('/save-draft', authenticateToken, async (req, res) => {
  try {
    const { schoolID, subjectCode, classID, section, academicYear, termName, facultyID, grades, breakdownByQuarter, studentId, studentName } = req.body;
    
    console.log('🔍 save-draft endpoint called with:', {
      schoolID, subjectCode, classID, section, academicYear, termName, facultyID,
      hasGrades: !!grades, hasBreakdown: !!breakdownByQuarter, studentId, studentName
    });
    
    if (!schoolID || !subjectCode || !classID || !section || !academicYear || !termName || !facultyID) {
      console.log('❌ Missing required fields:', {
        schoolID: !!schoolID, subjectCode: !!subjectCode, classID: !!classID, 
        section: !!section, academicYear: !!academicYear, termName: !!termName, facultyID: !!facultyID
      });
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const filter = { schoolID, subjectCode, academicYear, termName };
    const update = {
      schoolID, subjectCode, classID, section, academicYear, termName, facultyID,
      studentId, studentName,
      grades: grades || {},
      breakdownByQuarter: breakdownByQuarter || {},
      isLocked: false,
      lastUpdated: new Date()
    };
    const options = { upsert: true, new: true };
    const doc = await SemestralDraft.findOneAndUpdate(filter, update, options);
    return res.json({ success: true, message: 'Draft saved', draft: doc });
  } catch (e) {
    console.error('save-draft error', e);
    return res.status(500).json({ success: false, message: 'Failed to save draft' });
  }
});

// Save bulk drafts for multiple students
router.post('/save-draft-bulk', authenticateToken, async (req, res) => {
  try {
    const { drafts, classID, academicYear, termName } = req.body;
    
    if (!drafts || !Array.isArray(drafts) || !classID || !academicYear || !termName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: drafts array, classID, academicYear, termName' 
      });
    }

    // Check if faculty has permission
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    const results = [];
    const errors = [];

    // Process each draft
    for (const draftData of drafts) {
      try {
        const {
          schoolID,
          studentId,
          studentName,
          subjectCode,
          subjectName,
          classID: draftClassID,
          section,
          academicYear: draftAcademicYear,
          termName: draftTermName,
          facultyID,
          grades,
          breakdownByQuarter
        } = draftData;

        if (!schoolID || !studentName || !subjectCode) {
          errors.push(`Missing required fields for student ${studentName}`);
          continue;
        }

        const filter = { 
          schoolID, 
          subjectCode, 
          academicYear: draftAcademicYear, 
          termName: draftTermName 
        };
        
        const update = {
          schoolID,
          studentId,
          studentName,
          subjectCode,
          subjectName,
          classID: draftClassID,
          section,
          academicYear: draftAcademicYear,
          termName: draftTermName,
          facultyID,
          grades: grades || {},
          breakdownByQuarter: breakdownByQuarter || {},
          isLocked: false,
          lastUpdated: new Date()
        };
        
        const options = { upsert: true, new: true };
        const doc = await SemestralDraft.findOneAndUpdate(filter, update, options);
        
        results.push({
          studentName,
          success: true,
          draftId: doc._id
        });

      } catch (error) {
        errors.push(`Error processing ${draftData.studentName}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} draft records successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error saving bulk drafts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save bulk drafts',
      error: error.message
    });
  }
});

// Fetch drafts for a class
router.get('/drafts/class/:classID', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    const { academicYear, termName } = req.query;
    const drafts = await SemestralDraft.find({ classID, ...(academicYear && { academicYear }), ...(termName && { termName }) });
    return res.json({ success: true, drafts });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load drafts' });
  }
});

// Get grades for a specific student by schoolID
router.get('/student/:schoolID', authenticateToken, async (req, res) => {
  try {
    const { schoolID } = req.params;
    
    console.log('🔍 Student grades API called:', {
      schoolID,
      userRole: req.user.role,
      userSchoolID: req.user.schoolID,
      userID: req.user.userID
    });
    
    // Students can only view their own grades (check both 'student' and 'students' roles)
    if (req.user.role === 'student' || req.user.role === 'students') {
      const studentSchoolID = req.user.schoolID;
      const studentUserID = req.user.userID;
      if (studentSchoolID !== schoolID && studentUserID !== schoolID) {
        console.log('❌ Access denied for student:', { studentSchoolID, studentUserID, requestedSchoolID: schoolID });
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own grades.'
        });
      }
    }

    // Query by schoolID only (studentId is ObjectId, not string)
    // For students, only return posted grades (isLocked: true)
    const query = {
      schoolID: schoolID
    };
    
    // If the user is a student, only show posted grades (check both 'student' and 'students' roles)
    if (req.user.role === 'student' || req.user.role === 'students') {
      query.isLocked = true;
    }
    
    console.log('🔍 Database query:', query);
    
    // Let's also check what's actually in the database
    try {
      const allGrades = await SemestralGrade.find({}).limit(5);
      console.log('🔍 Sample grades in database:', allGrades.map(g => ({
        schoolID: g.schoolID,
        studentId: g.studentId,
        subjectCode: g.subjectCode,
        isLocked: g.isLocked
      })));
    } catch (sampleError) {
      console.error('❌ Error fetching sample grades:', sampleError);
    }
    
    let grades;
    try {
      grades = await SemestralGrade.find(query)
        .sort({ academicYear: -1, termName: 1, subjectName: 1 });
      console.log('🔍 Found grades:', grades.length);
    } catch (dbError) {
      console.error('❌ Database query error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database query failed',
        error: dbError.message
      });
    }

    if (grades.length === 0) {
      return res.json({
        success: true,
        message: 'No grades found for this student',
        grades: []
      });
    }

    res.json({
      success: true,
      grades: grades
    });

  } catch (error) {
    console.error('❌ Error fetching student grades:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grades',
      error: error.message
    });
  }
});

// Get grades for a specific class
router.get('/class/:classID', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    const { termName, academicYear, quarter } = req.query;
    
    console.log('🔍 Class grades API called:', {
      classID,
      termName,
      academicYear,
      quarter,
      userRole: req.user.role
    });
    
    // Only faculty can view class grades
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    // Build query with filters
    const query = { classID };
    if (termName) query.termName = termName;
    if (academicYear) query.academicYear = academicYear;
    
    console.log('🔍 Database query:', query);
    
    const grades = await SemestralGrade.find(query)
      .sort({ studentName: 1, academicYear: -1, termName: 1 });

    if (grades.length === 0) {
      return res.json({
        success: true,
        message: 'No grades found for this class',
        grades: []
      });
    }

    res.json({
      success: true,
      grades: grades
    });

  } catch (error) {
    console.error('Error fetching class grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class grades',
      error: error.message
    });
  }
});

// Get all grades across all classes (for principals)
router.get('/class/all', authenticateToken, async (req, res) => {
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

    const grades = await SemestralGrade.find({
      termName: termName,
      academicYear: academicYear
    }).sort({ studentName: 1, subjectName: 1 });

    res.json({
      success: true,
      message: `Found ${grades.length} grade records`,
      grades: grades
    });

  } catch (error) {
    console.error('Error fetching all grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all grades',
      error: error.message
    });
  }
});

// Get list of all classes with grades (for principals)
router.get('/class/list', authenticateToken, async (req, res) => {
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

    // Get unique classes from grades with proper field mapping
    const classes = await SemestralGrade.aggregate([
      {
        $match: {
          termName: termName,
          academicYear: academicYear
        }
      },
      {
        $group: {
          _id: {
            classID: '$classID',
            className: '$subjectName',
            classCode: '$subjectCode'
          },
          // Use the correct field names from the database
          sectionName: { $first: '$sectionName' },
          section: { $first: '$section' }, // Keep for backward compatibility
          trackName: { $first: '$trackName' },
          strandName: { $first: '$strandName' },
          gradeLevel: { $first: '$gradeLevel' },
          studentCount: { $sum: 1 }
        }
      },
      {
        $project: {
          classID: '$_id.classID',
          className: '$_id.className',
          classCode: '$_id.classCode',
          // Include both field names for compatibility
          sectionName: '$sectionName',
          section: '$section',
          trackName: '$trackName',
          strandName: '$strandName',
          gradeLevel: '$gradeLevel',
          studentCount: '$studentCount'
        }
      },
      {
        $sort: { className: 1, sectionName: 1 }
      }
    ]);

    res.json({
      success: true,
      message: `Found ${classes.length} classes`,
      classes: classes
    });

  } catch (error) {
    console.error('Error fetching class list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class list',
      error: error.message
    });
  }
});

// Get grades by faculty
router.get('/faculty/:facultyID', authenticateToken, async (req, res) => {
  try {
    const { facultyID } = req.params;
    
    // Faculty can only view their own grades
    if (req.user.role === 'faculty' && req.user.userID !== facultyID) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own grades.'
      });
    }

    const grades = await SemestralGrade.find({ facultyID })
      .sort({ academicYear: -1, termName: 1, className: 1, studentName: 1 });

    if (grades.length === 0) {
      return res.json({
        success: true,
        message: 'No grades found for this faculty',
        grades: []
      });
    }

    res.json({
      success: true,
      grades: grades
    });

  } catch (error) {
    console.error('Error fetching faculty grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch faculty grades',
      error: error.message
    });
  }
});

// Principal view - Get grades by grade level, strand, section, and subject
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
      academicYear: academicYear
    };

    // Try to find grades by subject name or code
    const grades = await SemestralGrade.find({
      ...query,
      $or: [
        { subjectName: { $regex: subject, $options: 'i' } },
        { subjectCode: { $regex: subject, $options: 'i' } }
      ]
    }).sort({ studentName: 1 });

    if (grades.length === 0) {
      return res.json({
        success: true,
        message: 'No grades found for the specified criteria',
        grades: [],
        students: []
      });
    }

    // Filter grades by section if available in the grade data
    const filteredGrades = grades.filter(grade => 
      !grade.section || grade.section === section
    );

    // Extract unique students
    const students = [...new Set(filteredGrades.map(grade => ({
      _id: grade.studentId,
      name: grade.studentName,
      schoolID: grade.schoolID
    })))];

    res.json({
      success: true,
      message: `Found ${filteredGrades.length} grade records`,
      grades: filteredGrades,
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
    console.error('Error fetching principal view grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grades for principal view',
      error: error.message
    });
  }
});

// Update grades (for unlocked grades only)
router.put('/update/:gradeId', authenticateToken, async (req, res) => {
  try {
    const { gradeId } = req.params;
    const { grades } = req.body;

    // Only faculty can update grades
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    const gradeRecord = await SemestralGrade.findById(gradeId);
    
    if (!gradeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Grade record not found'
      });
    }

    // Check if grades are locked
    if (gradeRecord.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Grades are locked and cannot be updated'
      });
    }

    // Validate grades
    const gradeFields = ['quarter1', 'quarter2', 'quarter3', 'quarter4'];
    for (const field of gradeFields) {
      if (grades[field] !== null && grades[field] !== undefined && grades[field] !== '') {
        const grade = parseFloat(grades[field]);
        if (isNaN(grade) || grade < 0 || grade > 100) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field} grade: must be between 0-100`
          });
        }
      }
    }

    // Update grades
    gradeRecord.grades = {
      ...gradeRecord.grades,
      ...grades
    };

    // Recalculate semester final and remarks
    if (gradeRecord.termName === 'Term 1' && grades.quarter1 && grades.quarter2) {
      gradeRecord.grades.semesterFinal = (parseFloat(grades.quarter1) + parseFloat(grades.quarter2)) / 2;
    } else if (gradeRecord.termName === 'Term 2' && grades.quarter3 && grades.quarter4) {
      gradeRecord.grades.semesterFinal = (parseFloat(grades.quarter3) + parseFloat(grades.quarter4)) / 2;
    }

    // Calculate remarks - ensure it's always a valid enum value
    if (gradeRecord.grades.semesterFinal !== null && gradeRecord.grades.semesterFinal !== undefined && gradeRecord.grades.semesterFinal !== '') {
      const semesterFinal = parseFloat(gradeRecord.grades.semesterFinal);
      if (!isNaN(semesterFinal)) {
          if (semesterFinal >= 75) {
            gradeRecord.grades.remarks = 'PASSED';
          } else {
            gradeRecord.grades.remarks = 'FAILED';
          }
      } else {
        gradeRecord.grades.remarks = 'INCOMPLETE';
      }
    } else {
      gradeRecord.grades.remarks = 'INCOMPLETE';
    }
    
    // Ensure remarks is never empty or invalid
    if (!gradeRecord.grades.remarks || gradeRecord.grades.remarks === '' || !['PASSED', 'FAILED', 'REPEAT', 'INCOMPLETE'].includes(gradeRecord.grades.remarks)) {
      gradeRecord.grades.remarks = 'INCOMPLETE';
    }

    gradeRecord.lastUpdated = new Date();
    await gradeRecord.save();

    res.json({
      success: true,
      message: 'Grades updated successfully',
      grades: gradeRecord.grades
    });

  } catch (error) {
    console.error('Error updating grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update grades',
      error: error.message
    });
  }
});

// Lock/unlock grades
router.patch('/lock/:gradeId', authenticateToken, async (req, res) => {
  try {
    const { gradeId } = req.params;
    const { isLocked } = req.body;

    // Only faculty can lock/unlock grades
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    const gradeRecord = await SemestralGrade.findById(gradeId);
    
    if (!gradeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Grade record not found'
      });
    }

    gradeRecord.isLocked = isLocked;
    gradeRecord.lastUpdated = new Date();
    await gradeRecord.save();

    res.json({
      success: true,
      message: `Grades ${isLocked ? 'locked' : 'unlocked'} successfully`,
      isLocked: gradeRecord.isLocked
    });

  } catch (error) {
    console.error('Error updating grade lock status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update grade lock status',
      error: error.message
    });
  }
});

export default router;
