import express from 'express';
import StudentAssignment from '../models/StudentAssignment.js';
import User from '../models/User.js'; // To populate student details
import Term from '../models/Term.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all student assignments (can be filtered by termId)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { termId } = req.query;
    let query = { status: 'active' };
    if (termId) {
      query.termId = termId;
    }
    const assignments = await StudentAssignment.find(query).populate('studentId');

    // Transform data to include student names directly
    const transformedAssignments = [];
    assignments.forEach(assignment => {
      if (assignment.studentId) { // Ensure studentId is populated
        transformedAssignments.push({
          _id: assignment._id, // ID of the assignment document
          studentId: assignment.studentId._id,
          studentName: `${assignment.studentId.firstname} ${assignment.studentId.lastname}`,
          gradeLevel: assignment.gradeLevel,
          trackName: assignment.trackName,
          strandName: assignment.strandName,
          sectionName: assignment.sectionName,
          termId: assignment.termId,
          status: assignment.status // Include the status field
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
    const { studentId, trackName, strandName, sectionName, gradeLevel, termId } = req.body;

    // Get term details to get schoolYear and termName
    const term = await Term.findById(termId);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    if (!gradeLevel) {
      return res.status(400).json({ message: 'gradeLevel is required' });
    }
    const assignment = new StudentAssignment({
      studentId,
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
    const { studentId, trackName, strandName, sectionName, gradeLevel, termId } = assignmentData;

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
      const newAssignment = new StudentAssignment({
        studentId,
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

export default router; 