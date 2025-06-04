import express from 'express';
import Assignment from '../models/Assignment.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all assignments for a class
router.get('/', authenticateToken, async (req, res) => {
  const { classID } = req.query;
  const assignments = await Assignment.find({ classID }).sort({ createdAt: -1 });
  res.json(assignments);
});

// Create assignment or quiz
router.post('/', authenticateToken, async (req, res) => {
  const { classID, title, instructions, type, description, dueDate, points, fileUploadRequired, allowedFileTypes, fileInstructions, questions } = req.body;
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
    createdBy: req.user._id
  });
  await assignment.save();
  res.status(201).json(assignment);
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

export default router; 