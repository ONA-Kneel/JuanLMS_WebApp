import express from 'express';
import Assignment from '../models/Assignment.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import Submission from '../models/Submission.js';
import multer from 'multer';
import path from 'path';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';

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
  const userId = req.user.userID; // Use userID (school ID) for filtering
  const role = req.user.role;

  let assignments;
  if (classID) {
    // Always filter by classID if provided
    assignments = await Assignment.find({ classID }).sort({ createdAt: -1 });
  } else if (role === 'faculty') {
    // Optionally: show all assignments created by this faculty
    assignments = await Assignment.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  } else {
    // If no classID and not faculty, return empty
    assignments = [];
  }

  // Debug log for faculty
  if (role === 'faculty') {
    console.log('[DEBUG][FACULTY] /assignments', { classID, userId, assignmentsCount: assignments.length, assignmentTitles: assignments.map(a => a.title) });
  }

  // Fetch quizzes for this class
  let quizzes = [];
  if (classID) {
    quizzes = await Quiz.find({ $or: [ { classID }, { classIDs: classID } ] }).sort({ createdAt: -1 });
  }

  // Add type field for frontend
  const assignmentsWithType = assignments.map(a => ({ ...a.toObject(), type: 'assignment' }));
  const quizzesWithType = quizzes.map(q => ({ ...q.toObject(), type: 'quiz' }));

  // Debug log before filtering
  console.log('[DEBUG] Role:', role, 'Assignments before filter:', assignments ? assignments.length : 'undefined', 'classID:', classID, 'userId:', userId);

  let combined = [...assignmentsWithType, ...quizzesWithType];

  if (role === 'students') {
    const now = new Date();
    combined = combined.filter(a => {
      // Debug log for scheduling
      console.log('DEBUG_ASSIGNMENT_SCHEDULE', {
        title: a.title,
        postAt: a.postAt,
        now: now,
        assignedTo: a.assignedTo,
        classID: classID,
        userId: userId,
        assignedToEntry: a.assignedTo?.find?.(e => e.classID === classID),
        studentIDs: a.assignedTo?.find?.(e => e.classID === classID)?.studentIDs
      });
      if (a.postAt && new Date(a.postAt) > now) return false;
      if (!a.assignedTo || a.assignedTo.length === 0) return false; // hide if not set
      const entry = a.assignedTo.find(e => e.classID === classID);
      if (!entry) return false;
      // Debug log for userId and studentIDs
      console.log('DEBUG_ASSIGNMENT_STUDENT_CHECK', {
        userId,
        studentIDs: entry.studentIDs,
        includes: Array.isArray(entry.studentIDs) && entry.studentIDs.includes(userId)
      });
      return Array.isArray(entry.studentIDs) && entry.studentIDs.includes(userId);
    });
  } else {
    // Debug log if not students or assignments empty
    console.log('[DEBUG] Not a student or no assignments to filter. Role:', role, 'Assignments:', assignments ? assignments.length : 'undefined');
  }
  console.log('FINAL assignments for user', userId, 'role', role, ':', combined.map(a => ({
    title: a.title,
    classID: a.classID,
    assignedTo: a.assignedTo,
    postAt: a.postAt,
    type: a.type
  })));
  res.json(combined);
});

// Get a single assignment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }
    res.json(assignment);
  } catch (err) {
    console.error('Error fetching assignment:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid assignment ID format.' });
    }
    res.status(500).json({ error: 'Failed to fetch assignment. Please try again.' });
  }
});

// Update assignment (for posting status, etc.)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { postAt } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }
    
    // Only allow faculty who created the assignment to update it
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this assignment.' });
    }
    
    if (postAt !== undefined) {
      assignment.postAt = postAt;
    }
    
    await assignment.save();
    res.json(assignment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create assignment or quiz
router.post('/', authenticateToken, upload.single('attachmentFile'), async (req, res) => {
  try {
    let { classIDs, classID, title, instructions, type, description, dueDate, points, fileUploadRequired, allowedFileTypes, fileInstructions, questions, assignedTo, attachmentLink, postAt } = req.body;
    const createdBy = req.user._id;
    
    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Assignment title is required.' });
    }
    
    if (!classIDs && !classID) {
      return res.status(400).json({ error: 'At least one class must be selected.' });
    }
    
    if (points !== undefined && (points < 1 || points > 100)) {
      return res.status(400).json({ error: 'Points must be between 1 and 100.' });
    }
    
    // Parse arrays/objects if sent as FormData
    if (typeof classIDs === 'string') {
      try {
        classIDs = JSON.parse(classIDs);
      } catch (parseErr) {
        return res.status(400).json({ error: 'Invalid class IDs format.' });
      }
    }
    if (typeof assignedTo === 'string') {
      try {
        assignedTo = JSON.parse(assignedTo);
      } catch (parseErr) {
        return res.status(400).json({ error: 'Invalid assignedTo format.' });
      }
    }
    
    let attachmentFile = '';
    if (req.file) {
      attachmentFile = `/uploads/submissions/${req.file.filename}`;
    }
    
    let assignments = [];
    if (Array.isArray(classIDs) && classIDs.length > 0) {
      for (const cid of classIDs) {
        const assignment = new Assignment({
          classID: cid,
          title: title.trim(),
          instructions,
          type: type || 'assignment',
          description,
          dueDate,
          points,
          fileUploadRequired,
          allowedFileTypes,
          fileInstructions,
          questions,
          createdBy,
          assignedTo,
          attachmentLink,
          attachmentFile,
          postAt
        });
        await assignment.save();
        assignments.push(assignment);
      }
      return res.status(201).json(assignments);
    } else if (classID) {
      const assignment = new Assignment({
        classID,
        title: title.trim(),
        instructions,
        type: type || 'assignment',
        description,
        dueDate,
        points,
        fileUploadRequired,
        allowedFileTypes,
        fileInstructions,
        questions,
        createdBy,
        assignedTo,
        attachmentLink,
        attachmentFile,
        postAt
      });
      await assignment.save();
      return res.status(201).json([assignment]);
    } else {
      return res.status(400).json({ error: 'No classID(s) provided.' });
    }
  } catch (err) {
    console.error('Error creating assignment:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    res.status(500).json({ error: 'Failed to create assignment. Please try again.' });
  }
});

// Edit assignment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, instructions, description, dueDate, points, attachmentLink, postAt, classIDs } = req.body;
    
    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Assignment title is required.' });
    }
    
    if (points !== undefined && (points < 1 || points > 100)) {
      return res.status(400).json({ error: 'Points must be between 1 and 100.' });
    }
    
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }
    
    // Only allow faculty who created the assignment to update it
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to edit this assignment.' });
    }
    
    // Update fields
    if (title !== undefined) assignment.title = title.trim();
    if (instructions !== undefined) assignment.instructions = instructions;
    if (description !== undefined) assignment.description = description;
    if (dueDate !== undefined) assignment.dueDate = dueDate;
    if (points !== undefined) assignment.points = points;
    if (attachmentLink !== undefined) assignment.attachmentLink = attachmentLink;
    if (postAt !== undefined) assignment.postAt = postAt;
    if (classIDs !== undefined && Array.isArray(classIDs)) {
      assignment.classID = classIDs[0]; // For now, just use the first class ID
    }
    
    await assignment.save();
    res.json(assignment);
  } catch (err) {
    console.error('Error updating assignment:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid assignment ID format.' });
    }
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    res.status(500).json({ error: 'Failed to update assignment. Please try again.' });
  }
});

// Delete assignment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }
    
    // Only allow faculty who created the assignment to delete it
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to delete this assignment.' });
    }
    
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Assignment deleted successfully.' });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid assignment ID format.' });
    }
    res.status(500).json({ error: 'Failed to delete assignment. Please try again.' });
  }
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
router.post('/:id/submit', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const student = req.user._id;
    const assignment = req.params.id;
    let files = [];
    if (req.files && req.files.length > 0) {
      files = req.files.map(f => ({
        url: `/uploads/submissions/${f.filename}`,
        name: f.originalname
      }));
    }
    // Check if already submitted
    let submission = await Submission.findOne({ assignment, student });
    if (submission) {
      submission.files = files;
      submission.submittedAt = new Date();
      submission.status = 'turned-in';
      await submission.save();
    } else {
      submission = new Submission({ assignment, student, files });
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
    const submissions = await Submission.find({ assignment }).populate('student', 'userID firstname lastname email');
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
    // Enforce max score of 100
    let finalGrade = grade;
    if (typeof finalGrade === 'number' && finalGrade > 100) {
      finalGrade = 100;
    }
    submission.grade = finalGrade;
    submission.feedback = feedback;
    submission.status = 'graded';
    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: 'Failed to grade submission.' });
  }
});

// Student undoes their submission (delete submission)
router.delete('/:id/submission', authenticateToken, async (req, res) => {
  try {
    const student = req.user._id;
    const assignment = req.params.id;
    const submission = await Submission.findOneAndDelete({ assignment, student });
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to undo submission.' });
  }
});

// Student deletes a file from their submission (but not the whole submission)
router.patch('/:id/submission/file', authenticateToken, async (req, res) => {
  try {
    const student = req.user._id;
    const assignment = req.params.id;
    const { fileUrl } = req.body;
    if (!fileUrl) return res.status(400).json({ error: 'fileUrl is required.' });
    const submission = await Submission.findOne({ assignment, student });
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });
    // Remove the file from the files array
    submission.files = (submission.files || []).filter(f => f.url !== fileUrl);
    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file from submission.' });
  }
});

export default router; 