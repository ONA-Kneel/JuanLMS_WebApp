import express from 'express';
import Assignment from '../models/Assignment.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import Submission from '../models/Submission.js';
import multer from 'multer';
import path from 'path';
import User from '../models/User.js';

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads', 'submissions'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

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

// Get assignment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignment.' });
  }
});

// Student submits an assignment (with file upload)
router.post('/:id/submit', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const student = req.user._id;
    const assignment = req.params.id;
    let fileUrl = req.body.fileUrl;
    let fileName = req.body.fileName;
    if (req.file) {
      fileUrl = `/uploads/submissions/${req.file.filename}`;
      fileName = req.file.originalname;
    }
    // Check if already submitted
    let submission = await Submission.findOne({ assignment, student });
    if (submission) {
      submission.fileUrl = fileUrl;
      submission.fileName = fileName;
      submission.submittedAt = new Date();
      submission.status = 'turned-in';
      await submission.save();
    } else {
      submission = new Submission({ assignment, student, fileUrl, fileName });
      await submission.save();
    }
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit assignment.' });
  }
});

// Faculty gets all submissions for an assignment
router.get('/:id/submissions', authenticateToken, async (req, res) => {
  try {
    const assignment = req.params.id;
    const submissions = await Submission.find({ assignment }).populate('student', 'firstname lastname email');
    res.json(submissions);
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});

// Faculty grades a submission
router.post('/:id/grade', authenticateToken, async (req, res) => {
  try {
    const { submissionId, grade, feedback } = req.body;
    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = 'graded';
    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: 'Failed to grade submission.' });
  }
});

export default router; 