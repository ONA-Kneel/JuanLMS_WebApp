import express from 'express';
import StudentAssignment from '../models/StudentAssignment.js';
import User from '../models/User.js'; // To populate student details
import Term from '../models/Term.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all student assignments (can be filtered by termId)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { termId, sectionName, status, schoolYear, studentId, quarterName } = req.query;
    let query = {};
    if (termId) query.termId = termId;
    if (sectionName) query.sectionName = sectionName;
    if (status) query.status = status;
    if (schoolYear) query.schoolYear = schoolYear;
    if (studentId) query.studentId = studentId;
    if (quarterName) query.quarterName = quarterName;

    const assignments = await StudentAssignment.find(query).populate('studentId');

    // Transform data to include student names directly and support manual entries
    const transformedAssignments = assignments.map(assignment => {
      if (assignment.studentId && assignment.studentId.firstname && assignment.studentId.lastname) {
        return {
          _id: assignment._id,
          studentId: assignment.studentId._id,
          studentName: `${assignment.studentId.firstname} ${assignment.studentId.lastname}`,
          gradeLevel: assignment.gradeLevel,
          trackName: assignment.trackName,
          strandName: assignment.strandName,
          sectionName: assignment.sectionName,
          termId: assignment.termId,
          status: assignment.status,
          schoolID: assignment.studentSchoolID || '',
          email: assignment.studentId.getDecryptedEmail ? assignment.studentId.getDecryptedEmail() : assignment.studentId.email,
          middlename: assignment.studentId.getDecryptedMiddlename ? assignment.studentId.getDecryptedMiddlename() : assignment.studentId.middlename,
          firstname: assignment.studentId.getDecryptedFirstname ? assignment.studentId.getDecryptedFirstname() : assignment.studentId.firstname,
          lastname: assignment.studentId.getDecryptedLastname ? assignment.studentId.getDecryptedLastname() : assignment.studentId.lastname,
          enrollmentNo: assignment.enrollmentNo || '',
          enrollmentDate: assignment.enrollmentDate || null,
          quarterName: assignment.quarterName,
          isApproved: assignment.status === 'active'
        };
      }
      // Manual entry (no linked user)
      return {
        _id: assignment._id,
        studentId: assignment.studentId || null,
        studentName: assignment.studentName || '',
        gradeLevel: assignment.gradeLevel,
        trackName: assignment.trackName,
        strandName: assignment.strandName,
        sectionName: assignment.sectionName,
        termId: assignment.termId,
        status: assignment.status,
        schoolID: assignment.studentSchoolID || '',
        enrollmentNo: assignment.enrollmentNo || '',
        enrollmentDate: assignment.enrollmentDate || null,
        firstname: assignment.firstName || '',
        lastname: assignment.lastName || '',
        quarterName: assignment.quarterName,
        isApproved: assignment.status === 'active'
      };
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
    const { studentId, studentName, studentSchoolID, trackName, strandName, sectionName, gradeLevel, termId, quarterName, firstName, lastName, enrollmentNo, enrollmentDate } = req.body;
    console.log('Request body debug:', { studentId, studentName, studentSchoolID, firstName, lastName, trackName, strandName, sectionName, gradeLevel, termId, quarterName, enrollmentNo, enrollmentDate });

    // Get term details to get schoolYear and termName
    const term = await Term.findById(termId);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    console.log('Duplicate check will search for:', {
      studentSchoolID,
      schoolYear: term.schoolYear,
      termName: term.termName,
      quarterName: quarterName || null
    });

    if (!gradeLevel) {
      return res.status(400).json({ message: 'gradeLevel is required' });
    }

    let actualStudentId = studentId;
    // Construct studentName from firstName and lastName if not provided directly
    const fullStudentName = studentName || (firstName && lastName ? `${firstName} ${lastName}` : null);
    console.log('Name construction debug:', { studentName, firstName, lastName, fullStudentName });
    
    // For manual assignments, ensure we have a name
    if (!actualStudentId && !fullStudentName && studentSchoolID) {
      console.log('Warning: Manual assignment without proper name, using school ID as fallback');
    }
    
    if (!actualStudentId && fullStudentName) {
      console.log('Looking for student by name:', fullStudentName);
      let student = await User.findOne({
        $or: [
          { $expr: { $eq: [{ $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, fullStudentName.toLowerCase()] } },
          { firstname: { $regex: new RegExp(fullStudentName.split(' ')[0], 'i') }, lastname: { $regex: new RegExp(fullStudentName.split(' ').slice(-1)[0], 'i') } },
          { $expr: { $regexMatch: { input: { $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, regex: fullStudentName.toLowerCase() } } },
          { firstname: { $regex: new RegExp(fullStudentName, 'i') } },
          { lastname: { $regex: new RegExp(fullStudentName, 'i') } }
        ],
        role: 'students'
      });

      if (!student) {
        console.log('Student not found with regex, trying more flexible search...');
        const nameParts = fullStudentName.trim().split(/\s+/);
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

      if (student) {
        console.log('Found student:', student.firstname, student.lastname);
        actualStudentId = student._id;
      }
    }

    // For manual entries, allow creation without an existing student

    // Check for existing assignment before creating new one
    console.log('Checking for duplicates with:', {
      actualStudentId,
      studentName: fullStudentName,
      studentSchoolID,
      schoolYear: term.schoolYear,
      termName: term.termName,
      quarterName: quarterName || null
    });
    
    console.log('About to query database for duplicates...');
    
    const existingAssignment = await StudentAssignment.findOne({
      $or: [
        // Check by studentId if it exists - only prevent same student in same term and quarter
        ...(actualStudentId ? [{
          studentId: actualStudentId,
          schoolYear: term.schoolYear,
          termName: term.termName,
          quarterName: quarterName || null
        }] : []),
        // Check by studentSchoolID if no studentId - only prevent same student in same term and quarter
        // This ensures we're checking for the exact same student, not just similar names
        ...(!actualStudentId && studentSchoolID ? [{
          studentSchoolID,
          schoolYear: term.schoolYear,
          termName: term.termName,
          quarterName: quarterName || null
        }] : [])
      ]
    });
    
    console.log('Database query completed. Found assignment:', existingAssignment ? 'YES' : 'NO');

    if (existingAssignment) {
      console.log('Found existing assignment:', existingAssignment);
      console.log('Duplicate check details:', {
        searchCriteria: {
          studentSchoolID,
          schoolYear: term.schoolYear,
          termName: term.termName,
          quarterName: quarterName || null
        },
        foundAssignment: {
          _id: existingAssignment._id,
          studentSchoolID: existingAssignment.studentSchoolID,
          studentName: existingAssignment.studentName,
          firstName: existingAssignment.firstName,
          lastName: existingAssignment.lastName,
          schoolYear: existingAssignment.schoolYear,
          termName: existingAssignment.termName,
          quarterName: existingAssignment.quarterName,
          sectionName: existingAssignment.sectionName
        }
      });
      const quarterText = quarterName ? ` (${quarterName})` : '';
      return res.status(400).json({ 
        message: 'This student is already enrolled in this term and quarter',
        details: `Student ${existingAssignment.studentName || 'Unknown'} is already enrolled in ${term.schoolYear} ${term.termName}${quarterText}`
      });
    }

    console.log('Creating new assignment with data:', {
      studentId: actualStudentId || undefined,
      studentName: !actualStudentId ? (fullStudentName || `Student ${studentSchoolID}`) : undefined,
      studentSchoolID: !actualStudentId ? studentSchoolID : undefined,
      firstName: !actualStudentId ? firstName : undefined,
      lastName: !actualStudentId ? lastName : undefined,
      trackName,
      strandName,
      sectionName,
      gradeLevel,
      termId,
      schoolYear: term.schoolYear,
      termName: term.termName,
      quarterName
    });

    const assignment = new StudentAssignment({
      studentId: actualStudentId || undefined,
      studentName: !actualStudentId ? (fullStudentName || `Student ${studentSchoolID}`) : undefined,
      studentSchoolID: !actualStudentId ? studentSchoolID : undefined,
      firstName: !actualStudentId ? firstName : undefined,
      lastName: !actualStudentId ? lastName : undefined,
      enrollmentNo: !actualStudentId ? enrollmentNo : undefined,
      enrollmentDate: !actualStudentId ? enrollmentDate : undefined,
      trackName,
      strandName,
      sectionName,
      gradeLevel,
      termId,
      schoolYear: term.schoolYear,
      termName: term.termName,
      quarterName
    });

    console.log('About to save assignment to database...');
    
    let newAssignment;
    try {
      newAssignment = await assignment.save();
      console.log('Assignment saved successfully:', newAssignment._id);
    } catch (saveError) {
      console.log('SAVE ERROR:', saveError);
      
      // Handle the specific unique index error
      if (saveError.code === 11000) {
        console.log('Unique constraint violation - checking for existing assignment...');
        
        // Try to find the existing assignment that's causing the conflict
        const existingAssignment = await StudentAssignment.findOne({
          trackName,
          strandName,
          sectionName,
          schoolYear: term.schoolYear,
          termName: term.termName
        });
        
        if (existingAssignment) {
          return res.status(400).json({ 
            message: 'A student is already assigned to this section in this term',
            details: `Section "${sectionName}" in ${term.schoolYear} ${term.termName} already has a student assigned`
          });
        }
      }
      
      throw saveError;
    }
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
    const { studentId, studentName, studentSchoolID, trackName, strandName, sectionName, gradeLevel, termId, quarterName, firstName, lastName } = assignmentData;

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
      // Construct studentName from firstName and lastName if not provided directly
      const fullStudentName = studentName || (firstName && lastName ? `${firstName} ${lastName}` : null);
      
      if (!actualStudentId && fullStudentName) {
        console.log('Looking for student by name:', fullStudentName);
        let student = await User.findOne({
          $or: [
            { $expr: { $eq: [{ $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, fullStudentName.toLowerCase()] } },
            { firstname: { $regex: new RegExp(fullStudentName.split(' ')[0], 'i') }, lastname: { $regex: new RegExp(fullStudentName.split(' ').slice(-1)[0], 'i') } },
            { $expr: { $regexMatch: { input: { $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, regex: fullStudentName.toLowerCase() } } },
            { firstname: { $regex: new RegExp(fullStudentName, 'i') } },
            { lastname: { $regex: new RegExp(fullStudentName, 'i') } }
          ],
          role: 'students'
        });

        if (!student) {
          console.log('Student not found with regex, trying more flexible search...');
          const nameParts = fullStudentName.trim().split(/\s+/);
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

        if (student) {
          console.log('Found student:', student.firstname, student.lastname);
          actualStudentId = student._id;
        }
      }

      // allow manual entries when no matching student is found

      // Check for existing assignment before creating new one (same logic as single creation)
      const existingAssignment = await StudentAssignment.findOne({
        $or: [
          // Check by studentId if it exists - only prevent same student in same term and quarter
          ...(actualStudentId ? [{
            studentId: actualStudentId,
            schoolYear: term.schoolYear,
            termName: term.termName,
            quarterName: quarterName || null
          }] : []),
          // Check by studentSchoolID if no studentId - only prevent same student in same term and quarter
          // This ensures we're checking for the exact same student, not just similar names
          ...(!actualStudentId && studentSchoolID ? [{
            studentSchoolID,
            schoolYear: term.schoolYear,
            termName: term.termName,
            quarterName: quarterName || null
          }] : [])
        ]
      });

      if (existingAssignment) {
        console.log('Found existing assignment in bulk creation:', existingAssignment);
        const quarterText = quarterName ? ` (${quarterName})` : '';
        errors.push({ 
          assignment: assignmentData, 
          message: `Student ${existingAssignment.studentName || 'Unknown'} is already enrolled in ${term.schoolYear} ${term.termName}${quarterText}` 
        });
        continue;
      }

      const newAssignment = new StudentAssignment({
        studentId: actualStudentId || undefined,
        studentName: !actualStudentId ? (fullStudentName || `Student ${studentSchoolID}`) : undefined,
        studentSchoolID: !actualStudentId ? studentSchoolID : undefined,
        firstName: !actualStudentId ? firstName : undefined,
        lastName: !actualStudentId ? lastName : undefined,
        trackName,
        strandName,
        sectionName,
        gradeLevel,
        termId,
        schoolYear: term.schoolYear,
        termName: term.termName,
        quarterName,
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
    const { trackName, strandName, sectionName, gradeLevel, termId, quarterName } = req.body;

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
    if (quarterName !== undefined) {
      assignment.quarterName = quarterName;
    }

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
    const { termName, schoolYear, quarterName } = req.query;
    
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
    if (quarterName) query.quarterName = quarterName;

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

// Update student assignments by quarter and school year
router.patch('/quarter/:quarterName/schoolyear/:schoolYear', async (req, res) => {
  try {
    const { quarterName, schoolYear } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const result = await StudentAssignment.updateMany(
      { 
        quarterName: quarterName,
        schoolYear: schoolYear
      },
      { $set: { status: status } }
    );

    console.log(`Updated ${result.modifiedCount} student assignments to status: ${status} for quarter: ${quarterName}, school year: ${schoolYear}`);
    res.json({ 
      message: `Updated ${result.modifiedCount} student assignments to status: ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 