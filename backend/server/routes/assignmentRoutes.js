import express from 'express';
import Assignment from '../models/Assignment.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all assignments for a class
router.get('/', authenticateToken, async (req, res) => {
  const { classID } = req.query;
  console.log('GET /assignments classID:', classID); // Debug log
  const assignments = await Assignment.find({ classID }).sort({ createdAt: -1 });
  console.log('Assignments found:', assignments.length); // Debug log
  res.json(assignments);
});

// Create assignment or quiz
router.post('/', authenticateToken, async (req, res) => {
  const { classIDs, classID, title, instructions, type, description, dueDate, points, fileUploadRequired, allowedFileTypes, fileInstructions, questions } = req.body;
  const createdBy = req.user._id;
  try {
    let assignments = [];
    if (Array.isArray(classIDs) && classIDs.length > 0) {
      for (const cid of classIDs) {
        const assignment = new Assignment({
          classID: cid,
          title,
          instructions,
          type: type || 'assignment',
          description,
          dueDate,
          points,
          fileUploadRequired,
          allowedFileTypes,
          fileInstructions,
          questions,
          createdBy
        });
        await assignment.save();
        assignments.push(assignment);
      }
      return res.status(201).json(assignments);
    } else if (classID) {
      const assignment = new Assignment({
        classID,
        title,
        instructions,
        type: type || 'assignment',
        description,
        dueDate,
        points,
        fileUploadRequired,
        allowedFileTypes,
        fileInstructions,
        questions,
        createdBy
      });
      await assignment.save();
      return res.status(201).json([assignment]);
    } else {
      return res.status(400).json({ error: 'No classID(s) provided.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create assignment.' });
  }
});

// Edit assignment
router.put('/:id', authenticateToken, async (req, res) => {
  const { title, instructions } = req.body;
  const assignment = await Assignment.findByIdAndUpdate(
    req.params.id, { title, instructions }, { new: true }
  );
  res.json(assignment);
});

// Delete assignment
router.delete('/:id', authenticateToken, async (req, res) => {
  await Assignment.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Mark assignment as viewed by a student
router.post('/:id/view', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    if (!assignment.views) assignment.views = [];
    if (!assignment.views.some(id => id.equals(userId))) {
      assignment.views.push(userId);
      await assignment.save();
    }
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as viewed' });
  }
});

export default router; 