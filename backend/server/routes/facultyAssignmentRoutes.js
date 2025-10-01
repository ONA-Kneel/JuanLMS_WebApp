import express from 'express';
import FacultyAssignment from '../models/FacultyAssignment.js';
import User from '../models/User.js'; // To populate faculty details
import { authenticateToken } from '../middleware/authMiddleware.js';
import Term from '../models/Term.js';
//a
// Validation function to check for faculty assignment conflicts
const validateFacultyAssignment = async (facultyId, subjectName, sectionName, schoolYear, termName, excludeAssignmentId = null) => {
  try {
    console.log(`[BACKEND] Validating faculty assignment:`, {
      facultyId,
      subjectName,
      sectionName,
      schoolYear,
      termName,
      excludeAssignmentId
    });

    // First check for exact duplicate (same faculty, same subject-section)
    const exactDuplicate = await FacultyAssignment.findOne({
      facultyId: facultyId,
      subjectName: subjectName,
      sectionName: sectionName,
      schoolYear: schoolYear,
      termName: termName,
      status: 'active',
      ...(excludeAssignmentId && { _id: { $ne: excludeAssignmentId } }) // Exclude current assignment when updating
    });

    console.log(`[BACKEND] Exact duplicate check result:`, exactDuplicate);

    // Also show all existing assignments for debugging
    const allExistingAssignments = await FacultyAssignment.find({
      schoolYear: schoolYear,
      termName: termName,
      status: 'active'
    });
    console.log(`[BACKEND] All existing assignments in system:`, allExistingAssignments.map(assign => ({
      facultyId: assign.facultyId,
      subjectName: assign.subjectName,
      sectionName: assign.sectionName,
      combo: `${assign.facultyId}-${assign.subjectName}-${assign.sectionName}`
    })));

    // Check for ANY existing assignment with the same faculty, subject, and section (regardless of term)
    const anyExistingAssignment = await FacultyAssignment.findOne({
      facultyId: facultyId,
      subjectName: subjectName,
      sectionName: sectionName,
      status: 'active'
    });
    console.log(`[BACKEND] Any existing assignment with same faculty-subject-section:`, anyExistingAssignment);

    if (exactDuplicate) {
      console.log(`[BACKEND] Found exact duplicate:`, exactDuplicate);
      return {
        isValid: false,
        conflict: {
          type: 'duplicate',
          message: 'This faculty assignment already exists'
        }
      };
    }

    // Then check if the same subject-section combination is already assigned to a different faculty
    const existingAssignment = await FacultyAssignment.findOne({
      subjectName: subjectName,
      sectionName: sectionName,
      schoolYear: schoolYear,
      termName: termName,
      status: 'active',
      facultyId: { $ne: facultyId }, // Different faculty
      ...(excludeAssignmentId && { _id: { $ne: excludeAssignmentId } }) // Exclude current assignment when updating
    }).populate('facultyId', 'firstname lastname');

    console.log(`[BACKEND] Conflict check result:`, existingAssignment);

    if (existingAssignment) {
      console.log(`[BACKEND] Found conflict:`, existingAssignment);
      return {
        isValid: false,
        conflict: {
          type: 'conflict',
          facultyId: existingAssignment.facultyId._id,
          facultyName: `${existingAssignment.facultyId.firstname} ${existingAssignment.facultyId.lastname}`,
          subjectName: existingAssignment.subjectName,
          sectionName: existingAssignment.sectionName
        }
      };
    }

    return { isValid: true, conflict: null };
  } catch (error) {
    console.error('Error validating faculty assignment:', error);
    return { isValid: true, conflict: null }; // Allow assignment if validation fails
  }
};

const router = express.Router();

// Get all faculty assignments (can be filtered by termId)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { termId, quarterName } = req.query;
    let query = {};
    if (termId) {
      query.termId = termId;
    }
    if (quarterName) {
      query.quarterName = quarterName;
    }
    const assignments = await FacultyAssignment.find(query).populate('facultyId');

    // Transform data to include faculty names directly and flatten assignments
    const transformedAssignments = [];
    assignments.forEach(assignment => {
      if (assignment.facultyId) { // Ensure facultyId is populated
        transformedAssignments.push({
          _id: assignment._id, // ID of the assignment document
          facultyId: assignment.facultyId._id,
          facultyName: `${assignment.facultyId.firstname} ${assignment.facultyId.lastname}`,
          facultySchoolID: assignment.facultyId.getDecryptedSchoolID ? assignment.facultyId.getDecryptedSchoolID() : assignment.facultyId.schoolID,
          trackName: assignment.trackName,
          strandName: assignment.strandName,
          sectionName: assignment.sectionName,
          subjectName: assignment.subjectName,
          gradeLevel: assignment.gradeLevel,
          termId: assignment.termId,
          schoolYear: assignment.schoolYear,
          termName: assignment.termName,
          quarterName: assignment.quarterName,
          status: assignment.status // Include the status field
        });
      }
    });

    res.status(200).json(transformedAssignments);
  } catch (error) {
    console.error("Error fetching faculty assignments:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all faculty assignments for a term
router.get('/term/:termId', authenticateToken, async (req, res) => {
  try {
    const filter = { termId: req.params.termId, status: 'active' };
    const { quarterName } = req.query;
    if (quarterName) filter.quarterName = quarterName;
    const assignments = await FacultyAssignment.find(filter)
      .populate('facultyId', 'firstName lastName email')
      .select('-schoolYear -termName'); // Exclude hidden fields from response
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new faculty assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { facultyId, facultyName, trackName, strandName, sectionName, subjectName, gradeLevel, termId, quarterName } = req.body;

    // Get term details to get schoolYear and termName
    const term = await Term.findById(termId);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    let actualFacultyId = facultyId;
    if (!actualFacultyId && facultyName) {
      console.log('Looking for faculty by name:', facultyName);
      let faculty = await User.findOne({
        $or: [
          { $expr: { $eq: [{ $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, facultyName.toLowerCase()] } },
          { firstname: { $regex: new RegExp(facultyName.split(' ')[0], 'i') }, lastname: { $regex: new RegExp(facultyName.split(' ').slice(-1)[0], 'i') } },
          { $expr: { $regexMatch: { input: { $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, regex: facultyName.toLowerCase() } } },
          { firstname: { $regex: new RegExp(facultyName, 'i') } },
          { lastname: { $regex: new RegExp(facultyName, 'i') } }
        ],
        role: 'faculty'
      });

      if (!faculty) {
        console.log('Faculty not found with regex, trying more flexible search...');
        const nameParts = facultyName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          faculty = await User.findOne({
            $and: [
              { role: 'faculty' },
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

      if (!faculty) {
        console.log('All faculty search attempts failed');
        return res.status(400).json({ message: `Faculty '${facultyName}' not found` });
      }
      console.log('Found faculty:', faculty.firstname, faculty.lastname);
      actualFacultyId = faculty._id;
    }

    if (!actualFacultyId) {
      return res.status(400).json({ message: 'facultyId or facultyName is required' });
    }

    // Validate assignment conflicts
    const validation = await validateFacultyAssignment(
      actualFacultyId, 
      subjectName, 
      sectionName, 
      term.schoolYear, 
      term.termName
    );

    if (!validation.isValid) {
      if (validation.conflict.type === 'duplicate') {
        return res.status(400).json({ 
          message: validation.conflict.message,
          conflict: validation.conflict
        });
      } else if (validation.conflict.type === 'conflict') {
      return res.status(400).json({ 
        message: `Subject "${subjectName}" in Section "${sectionName}" is already assigned to ${validation.conflict.facultyName}`,
        conflict: validation.conflict
      });
      }
    }

    const assignment = new FacultyAssignment({
      facultyId: actualFacultyId,
      trackName,
      strandName,
      sectionName,
      subjectName,
      gradeLevel,
      termId,
      schoolYear: term.schoolYear,
      termName: term.termName,
      quarterName
    });

    console.log(`[BACKEND] Attempting to save assignment:`, {
      facultyId: actualFacultyId,
      trackName,
      strandName,
      sectionName,
      subjectName,
      gradeLevel,
      termId,
      schoolYear: term.schoolYear,
      termName: term.termName
    });

    let newAssignment;
    try {
      newAssignment = await assignment.save();
      console.log(`[BACKEND] Successfully saved assignment:`, newAssignment);
    } catch (saveError) {
      console.log(`[BACKEND] Save error details:`, {
        code: saveError.code,
        name: saveError.name,
        message: saveError.message,
        keyPattern: saveError.keyPattern,
        keyValue: saveError.keyValue
      });
      throw saveError;
    }
    // Exclude hidden fields from response
    const response = newAssignment.toObject();
    delete response.schoolYear;
    delete response.termName;
    res.status(201).json(response);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'This faculty assignment already exists' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Bulk create faculty assignments
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const assignments = req.body;
    const createdAssignments = [];
    const errors = [];

    for (const assignmentData of assignments) {
      const { facultyId, facultyName, trackName, strandName, sectionName, subjectName, gradeLevel, termId, quarterName } = assignmentData;

      try {
        const term = await Term.findById(termId);
        if (!term) {
          errors.push({ assignment: assignmentData, message: 'Term not found' });
          continue;
        }

        let actualFacultyId = facultyId;
        if (!actualFacultyId && facultyName) {
          console.log('Looking for faculty by name:', facultyName);
          let faculty = await User.findOne({
            $or: [
              { $expr: { $eq: [{ $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, facultyName.toLowerCase()] } },
              { firstname: { $regex: new RegExp(facultyName.split(' ')[0], 'i') }, lastname: { $regex: new RegExp(facultyName.split(' ').slice(-1)[0], 'i') } },
              { $expr: { $regexMatch: { input: { $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, regex: facultyName.toLowerCase() } } },
              { firstname: { $regex: new RegExp(facultyName, 'i') } },
              { lastname: { $regex: new RegExp(facultyName, 'i') } }
            ],
            role: 'faculty'
          });

          if (!faculty) {
            console.log('Faculty not found with regex, trying more flexible search...');
            const nameParts = facultyName.trim().split(/\s+/);
            if (nameParts.length >= 2) {
              faculty = await User.findOne({
                $and: [
                  { role: 'faculty' },
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

          if (!faculty) {
            console.log('All faculty search attempts failed');
            errors.push({ assignment: assignmentData, message: `Faculty '${facultyName}' not found` });
            continue;
          }
          console.log('Found faculty:', faculty.firstname, faculty.lastname);
          actualFacultyId = faculty._id;
        }

        if (!actualFacultyId) {
          errors.push({ assignment: assignmentData, message: 'facultyId or facultyName is required' });
          continue;
        }

        // Validate assignment conflicts for bulk creation
        const validation = await validateFacultyAssignment(
          actualFacultyId, 
          subjectName, 
          sectionName, 
          term.schoolYear, 
          term.termName
        );

        if (!validation.isValid) {
          let errorMessage;
          if (validation.conflict.type === 'duplicate') {
            errorMessage = validation.conflict.message;
          } else if (validation.conflict.type === 'conflict') {
            errorMessage = `Subject "${subjectName}" in Section "${sectionName}" is already assigned to ${validation.conflict.facultyName}`;
          }
          
          errors.push({ 
            assignment: assignmentData, 
            message: errorMessage,
            conflict: validation.conflict
          });
          continue;
        }

        const newAssignment = new FacultyAssignment({
          facultyId: actualFacultyId,
          trackName,
          strandName,
          sectionName,
          subjectName,
          gradeLevel,
          termId,
          schoolYear: term.schoolYear,
          termName: term.termName,
          quarterName
        });

        const savedAssignment = await newAssignment.save();
        createdAssignments.push(savedAssignment);
      } catch (err) {
        if (err.code === 11000) {
          errors.push({ assignment: assignmentData, message: 'This faculty assignment already exists' });
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
        message: 'All faculty assignments created successfully',
        created: createdAssignments
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a faculty assignment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Delete request received for assignment ID:', req.params.id);
    const assignment = await FacultyAssignment.findById(req.params.id);
    if (!assignment) {
      console.log('Assignment not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Assignment not found' });
    }

    console.log('Found assignment:', assignment);
    await assignment.deleteOne();
    console.log('Assignment deleted successfully');
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    res.status(500).json({ message: err.message });
  }
});

// Unarchive a faculty assignment (must come before the general PATCH route)
router.patch('/:id/unarchive', authenticateToken, async (req, res) => {
  try {
    const assignment = await FacultyAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'archived') {
      return res.status(400).json({ message: 'Assignment is not archived' });
    }

    assignment.status = 'active';
    const updatedAssignment = await assignment.save();
    
    // Transform response to match the format used in GET requests
    const response = updatedAssignment.toObject();
    delete response.schoolYear;
    delete response.termName;
    
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH route for updating faculty assignment
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { trackName, strandName, sectionName, subjectName, gradeLevel, termId, quarterName } = req.body;
    const assignment = await FacultyAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    // Get term details to get schoolYear and termName if termId is provided or original termId
    const currentTermId = termId || assignment.termId;
    const term = await Term.findById(currentTermId);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    // Always validate conflicts on edit - hard gate
    const newSubjectName = subjectName || assignment.subjectName;
    const newSectionName = sectionName || assignment.sectionName;
    
    const validation = await validateFacultyAssignment(
      assignment.facultyId,
      newSubjectName,
      newSectionName,
      term.schoolYear,
      term.termName,
      req.params.id // Exclude current assignment
    );

    if (!validation.isValid) {
      return res.status(400).json({ 
        message: `Subject "${newSubjectName}" in Section "${newSectionName}" is already assigned to ${validation.conflict.facultyName}. Please change the subject or section, or delete the conflicting assignment.`,
        conflict: validation.conflict
      });
    }

    assignment.trackName = trackName || assignment.trackName;
    assignment.strandName = strandName || assignment.strandName;
    assignment.sectionName = newSectionName;
    assignment.subjectName = newSubjectName;
    assignment.gradeLevel = gradeLevel || assignment.gradeLevel;
    assignment.termId = currentTermId;
    assignment.schoolYear = term.schoolYear;
    assignment.termName = term.termName;
    if (quarterName !== undefined) {
      assignment.quarterName = quarterName;
    }
    const updatedAssignment = await assignment.save();
    const response = updatedAssignment.toObject();
    delete response.schoolYear;
    delete response.termName;
    res.json(response);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'This faculty assignment already exists' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Update faculty assignments by quarter and school year
router.patch('/quarter/:quarterName/schoolyear/:schoolYear', async (req, res) => {
  try {
    const { quarterName, schoolYear } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const result = await FacultyAssignment.updateMany(
      { 
        quarterName: quarterName,
        schoolYear: schoolYear
      },
      { $set: { status: status } }
    );

    console.log(`Updated ${result.modifiedCount} faculty assignments to status: ${status} for quarter: ${quarterName}, school year: ${schoolYear}`);
    res.json({ 
      message: `Updated ${result.modifiedCount} faculty assignments to status: ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 