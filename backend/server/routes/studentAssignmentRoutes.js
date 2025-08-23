import express from 'express';
import StudentAssignment from '../models/StudentAssignment.js';
import User from '../models/User.js'; // To populate student details
import Term from '../models/Term.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all student assignments (can be filtered by termId)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { termId, sectionName, status, schoolYear, studentId } = req.query;
    let query = {};
    if (termId) query.termId = termId;
    if (sectionName) query.sectionName = sectionName;
    if (status) query.status = status;
    if (schoolYear) query.schoolYear = schoolYear;
    if (studentId) query.studentId = studentId;

    const assignments = await StudentAssignment.find(query).populate('studentId');

    // Transform data to include student names directly
    const transformedAssignments = [];
    assignments.forEach(assignment => {
      if (
        assignment.studentId &&
        assignment.studentId.firstname &&
        assignment.studentId.lastname
      ) {
        transformedAssignments.push({
          _id: assignment._id,
          studentId: assignment.studentId._id,
          studentName: `${assignment.studentId.firstname} ${assignment.studentId.lastname}`,
          gradeLevel: assignment.gradeLevel,
          trackName: assignment.trackName,
          strandName: assignment.strandName,
          sectionName: assignment.sectionName,
          termId: assignment.termId,
          status: assignment.status,
          schoolID: assignment.studentId.schoolID,
          email: assignment.studentId.email,
          middlename: assignment.studentId.middlename,
          firstname: assignment.studentId.firstname,
          lastname: assignment.studentId.lastname,
        });
      }
    });

    res.status(200).json(transformedAssignments);
  } catch (error) {
    console.error("Error fetching student assignments:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new student assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { studentId, studentName, trackName, strandName, sectionName, gradeLevel, termId } = req.body;

    // Get term details to get schoolYear and termName
    const term = await Term.findById(termId);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    if (!gradeLevel) {
      return res.status(400).json({ message: 'gradeLevel is required' });
    }

    let actualStudentId = studentId;
    if (!actualStudentId && studentName) {
      console.log('Looking for student by name:', studentName);
      let student = await User.findOne({
        $or: [
          { $expr: { $eq: [{ $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, studentName.toLowerCase()] } },
          { firstname: { $regex: new RegExp(studentName.split(' ')[0], 'i') }, lastname: { $regex: new RegExp(studentName.split(' ').slice(-1)[0], 'i') } },
          { $expr: { $regexMatch: { input: { $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, regex: studentName.toLowerCase() } } },
          { firstname: { $regex: new RegExp(studentName, 'i') } },
          { lastname: { $regex: new RegExp(studentName, 'i') } }
        ],
        role: 'students'
      });

      if (!student) {
        console.log('Student not found with regex, trying more flexible search...');
        const nameParts = studentName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          student = await User.findOne({
            $and: [
              { role: 'students' },
              {
                $or: [
                  { firstname: { $regex: new RegExp(nameParts[0], 'i') } },
                  { firstname: { $regex: new RegExp(nameParts[nameParts.length - 1], 'i') } },
                  { lastname: { $regex: new RegExp(nameParts[0], 'i') } },
                  { lastname: { $regex: new RegExp(nameParts[nameParts.length - 1], 'i') } }
                ]
              }
            ]
          });
        }
      }

      if (!student) {
        console.log('All student search attempts failed');
        return res.status(400).json({ message: `Student '${studentName}' not found` });
      }
      console.log('Found student:', student.firstname, student.lastname);
      actualStudentId = student._id;
    }

    if (!actualStudentId) {
      return res.status(400).json({ message: 'studentId or studentName is required' });
    }

    const assignment = new StudentAssignment({
      studentId: actualStudentId,
      trackName,
      strandName,
      sectionName,
      gradeLevel,
      termId,
      schoolYear: term.schoolYear,
      termName: term.termName
    });

    const newAssignment = await assignment.save();
    res.status(201).json(newAssignment);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'This student assignment already exists' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Bulk create student assignments
router.post('/bulk', authenticateToken, async (req, res) => {
  const assignments = req.body;
  const createdAssignments = [];
  const errors = [];

  for (const assignmentData of assignments) {
    const { studentId, studentName, trackName, strandName, sectionName, gradeLevel, termId } = assignmentData;

    try {
      const term = await Term.findById(termId);
      if (!term) {
        errors.push({ assignment: assignmentData, message: 'Term not found' });
        continue;
      }

      if (!gradeLevel) {
        errors.push({ assignment: assignmentData, message: 'gradeLevel is required' });
        continue;
      }

      let actualStudentId = studentId;
      if (!actualStudentId && studentName) {
        console.log('Looking for student by name:', studentName);
        let student = await User.findOne({
          $or: [
            { $expr: { $eq: [{ $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, studentName.toLowerCase()] } },
            { firstname: { $regex: new RegExp(studentName.split(' ')[0], 'i') }, lastname: { $regex: new RegExp(studentName.split(' ').slice(-1)[0], 'i') } },
            { $expr: { $regexMatch: { input: { $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, regex: studentName.toLowerCase() } } },
            { firstname: { $regex: new RegExp(studentName, 'i') } },
            { lastname: { $regex: new RegExp(studentName, 'i') } }
          ],
          role: 'students'
        });

        if (!student) {
          console.log('Student not found with regex, trying more flexible search...');
          const nameParts = studentName.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            student = await User.findOne({
              $and: [
                { role: 'students' },
                {
                  $or: [
                    { firstname: { $regex: new RegExp(nameParts[0], 'i') } },
                    { firstname: { $regex: new RegExp(nameParts[nameParts.length - 1], 'i') } },
                    { lastname: { $regex: new RegExp(nameParts[0], 'i') } },
                    { lastname: { $regex: new RegExp(nameParts[nameParts.length - 1], 'i') } }
                  ]
                }
              ]
            });
          }
        }

        if (!student) {
          console.log('All student search attempts failed');
          errors.push({ assignment: assignmentData, message: `Student '${studentName}' not found` });
          continue;
        }
        console.log('Found student:', student.firstname, student.lastname);
        actualStudentId = student._id;
      }

      if (!actualStudentId) {
        errors.push({ assignment: assignmentData, message: 'studentId or studentName is required' });
        continue;
      }

      const newAssignment = new StudentAssignment({
        studentId: actualStudentId,
        trackName,
        strandName,
        sectionName,
        gradeLevel,
        termId,
        schoolYear: term.schoolYear,
        termName: term.termName,
      });

      const savedAssignment = await newAssignment.save();
      createdAssignments.push(savedAssignment);
    } catch (err) {
      if (err.code === 11000) {
        errors.push({ assignment: assignmentData, message: 'This student assignment already exists' });
      } else {
        errors.push({ assignment: assignmentData, message: err.message });
      }
    }
  }

  if (errors.length > 0) {
    return res.status(207).json({ 
      message: 'Some assignments could not be created', 
      created: createdAssignments, 
      errors: errors 
    });
  } else {
    res.status(201).json({ 
      message: 'All student assignments created successfully', 
      created: createdAssignments 
    });
  }
});

// Delete a student assignment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const assignment = await StudentAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    await assignment.deleteOne();
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Unarchive a student assignment (must come before the general PATCH route)
router.patch('/:id/unarchive', authenticateToken, async (req, res) => {
  try {
    const assignment = await StudentAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'archived') {
      return res.status(400).json({ message: 'Assignment is not archived' });
    }

    assignment.status = 'active';
    const updatedAssignment = await assignment.save();
    
    res.json(updatedAssignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a student assignment (e.g., if track/strand/section changes)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { trackName, strandName, sectionName, gradeLevel, termId } = req.body;

    const assignment = await StudentAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Get term details to get schoolYear and termName if termId is provided or original termId
    const currentTermId = termId || assignment.termId;
    const term = await Term.findById(currentTermId);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    assignment.trackName = trackName || assignment.trackName;
    assignment.strandName = strandName || assignment.strandName;
    assignment.sectionName = sectionName || assignment.sectionName;
    if (gradeLevel) assignment.gradeLevel = gradeLevel;
    assignment.termId = currentTermId; // Update termId if provided
    assignment.schoolYear = term.schoolYear;
    assignment.termName = term.termName;

    const updatedAssignment = await assignment.save();
    res.json(updatedAssignment);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'This student assignment already exists' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Get student's enrolled subjects for the current term
router.get('/enrolled-subjects/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termName, schoolYear } = req.query;
    
    // Verify the requesting user has access to this student's data
    if (req.user.role === 'students' && req.user.userID !== studentId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You can only view your own data.' 
      });
    }

    // Build query for student assignments
    let query = { studentId, status: 'active' };
    if (termName) query.termName = termName;
    if (schoolYear) query.schoolYear = schoolYear;

    const assignments = await StudentAssignment.find(query);
    
    if (assignments.length === 0) {
      return res.json({
        success: true,
        subjects: [],
        message: 'No enrolled subjects found for this student in the specified term.'
      });
    }

    // Transform assignments to subjects format
    const subjects = assignments.map(assignment => ({
      _id: assignment._id,
      subjectCode: `${assignment.trackName}-${assignment.strandName}-${assignment.gradeLevel}`,
      subjectDescription: `${assignment.trackName} Track - ${assignment.strandName} Strand - Grade ${assignment.gradeLevel}`, 
      trackName: assignment.trackName,
      strandName: assignment.strandName,
      gradeLevel: assignment.gradeLevel,
      sectionName: assignment.sectionName,
      termName: assignment.termName,
      schoolYear: assignment.schoolYear
    }));

    res.json({
      success: true,
      subjects,
      message: `Found ${subjects.length} enrolled subjects for the student.`
    });

  } catch (error) {
    console.error('Error fetching student enrolled subjects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching enrolled subjects', 
      error: error.message 
    });
  }
});

export default router; 