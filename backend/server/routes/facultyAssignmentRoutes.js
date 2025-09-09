import express from 'express';
import FacultyAssignment from '../models/FacultyAssignment.js';
import User from '../models/User.js'; // To populate faculty details
import { authenticateToken } from '../middleware/authMiddleware.js';
import Term from '../models/Term.js';

const router = express.Router();

// Get all faculty assignments (can be filtered by termId)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { termId } = req.query;
    let query = {};
    if (termId) {
      query.termId = termId;
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
    const assignments = await FacultyAssignment.find({ termId: req.params.termId, status: 'active' })
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
    const { facultyId, facultyName, trackName, strandName, sectionName, subjectName, gradeLevel, termId } = req.body;

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

    const assignment = new FacultyAssignment({
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

    const newAssignment = await assignment.save();
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
      const { facultyId, facultyName, trackName, strandName, sectionName, subjectName, gradeLevel, termId } = assignmentData;

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

        const newAssignment = new FacultyAssignment({
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
    const assignment = await FacultyAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    await assignment.deleteOne();
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
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
    const { trackName, strandName, sectionName, subjectName, gradeLevel, termId } = req.body;
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
    assignment.trackName = trackName || assignment.trackName;
    assignment.strandName = strandName || assignment.strandName;
    assignment.sectionName = sectionName || assignment.sectionName;
    assignment.subjectName = subjectName || assignment.subjectName;
    assignment.gradeLevel = gradeLevel || assignment.gradeLevel;
    assignment.termId = currentTermId;
    assignment.schoolYear = term.schoolYear;
    assignment.termName = term.termName;
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

export default router; 