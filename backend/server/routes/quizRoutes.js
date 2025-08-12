//quiz routes

import express from 'express';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Class from '../models/Class.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import QuizResponse from '../models/QuizResponse.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import seedrandom from 'seedrandom';
import { createQuizNotification } from '../services/notificationService.js';

const router = express.Router();

// Multer setup for quiz images
const quizImageDir = path.resolve('backend/server/uploads/quiz-images');
if (!fs.existsSync(quizImageDir)) fs.mkdirSync(quizImageDir, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, quizImageDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Upload quiz image
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/quiz-images/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Create a new quiz
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    console.log('[QuizRoutes] Creating quiz with data:', req.body);
    console.log('[QuizRoutes] Timing data:', req.body.timing);
    
    const quiz = new Quiz(req.body);
    await quiz.save();
    
    console.log('[QuizRoutes] Quiz created successfully:', quiz._id);
    console.log('[QuizRoutes] Saved timing data:', quiz.timing);
    
    // Create notifications for students in the class(es)
    if (quiz.classID) {
      await createQuizNotification(quiz.classID, quiz);
    } else if (quiz.assignedTo && Array.isArray(quiz.assignedTo)) {
      for (const assignment of quiz.assignedTo) {
        if (assignment.classID) {
          await createQuizNotification(assignment.classID, quiz);
        }
      }
    }
    
    res.status(201).json(quiz);
  } catch (err) {
    console.error('[QuizRoutes] Error creating quiz:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get all quizzes (optionally filter by classID)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.query;
    const userId = req.user.userID;
    const role = req.user.role;
    
    let quizzes;
    if (classID) {
      quizzes = await Quiz.find({ 'assignedTo.classID': classID });
    } else if (role === 'faculty') {
      // For faculty, get quizzes from all their classes
      const facultyClasses = await Class.find({ facultyID: userId });
      const classIDs = facultyClasses.map(c => c.classID);
      quizzes = await Quiz.find({ 
        $or: [ 
          { classID: { $in: classIDs } }, 
          { 'assignedTo.classID': { $in: classIDs } } 
        ] 
      });
    } else {
      quizzes = [];
    }
    
    // Get class information for all unique classIDs
    const allClassIDs = [...new Set([
      ...quizzes.map(q => q.classID).filter(Boolean),
      ...quizzes.flatMap(q => q.assignedTo?.map(a => a.classID) || []).filter(Boolean)
    ])];
    
    const classesMap = {};
    if (allClassIDs.length > 0) {
      const classes = await Class.find({ classID: { $in: allClassIDs } });
      classes.forEach(cls => {
        classesMap[cls.classID] = {
          className: cls.className,
          classCode: cls.classCode,
          classDesc: cls.classDesc
        };
      });
    }
    
    // Add class info to quizzes
    const quizzesWithClassInfo = quizzes.map(q => {
      const quizObj = q.toObject();
      const primaryClassID = q.classID || q.assignedTo?.[0]?.classID;
      return {
        ...quizObj,
        classInfo: classesMap[primaryClassID] || { className: 'Unknown', classCode: 'N/A', classDesc: '' }
      };
    });
    
    res.json(quizzesWithClassInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// IMPORTANT: Place this route BEFORE any /:id or /:quizId routes!
// =======================

// Fetch a single student's response for a quiz
router.get('/:quizId/response/:studentId', authenticateToken, async (req, res) => {
  try {
    const { quizId, studentId } = req.params;
    const response = await QuizResponse.findOne({ quizId, studentId }).populate('studentId', 'firstname lastname email');
    if (!response) return res.status(404).json({ error: 'Response not found.' });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single quiz by ID (for edit/faculty)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a quiz for a student (with shuffling)
router.get('/:quizId', authenticateToken, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId).lean();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    console.log('[QuizRoutes] Fetching quiz:', req.params.quizId);
    console.log('[QuizRoutes] Quiz timing data:', quiz.timing);

    // FIX: Use questionBehaviour.shuffle (boolean)
    if (quiz.questionBehaviour && quiz.questionBehaviour.shuffle && req.user && req.user._id) {
      quiz.questions = seededShuffle(quiz.questions, req.user._id.toString());
    }

    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a quiz by ID
router.put('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    console.log('[QuizRoutes] Updating quiz:', req.params.id);
    console.log('[QuizRoutes] Update data:', req.body);
    console.log('[QuizRoutes] Update timing data:', req.body.timing);
    
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    
    console.log('[QuizRoutes] Quiz updated successfully');
    console.log('[QuizRoutes] Updated timing data:', quiz.timing);
    
    res.json(quiz);
  } catch (err) {
    console.error('[QuizRoutes] Error updating quiz:', err);
    res.status(400).json({ error: err.message });
  }
});

// PATCH a quiz by ID (partial update)
router.patch('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a quiz by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student submits quiz answers
router.post('/:quizId/submit', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const studentId = req.user ? req.user._id : req.body.studentId;
    const { answers, violationCount, violationEvents, questionTimes } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Answers are required.' });
    }
    const existing = await QuizResponse.findOne({ quizId, studentId });
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted this quiz. You cannot submit again.' });
    }
    const quiz = await Quiz.findById(quizId);
    let score = 0;
    let checkedAnswers = [];
    quiz.questions.forEach((q, i) => {
      const studentAnswer = answers[i]?.answer;
      let correct = false;
      if (q.type === 'multiple') {
        if (Array.isArray(q.correctAnswers) && q.correctAnswers.length === 1) {
          correct = studentAnswer === q.correctAnswers[0];
        } else {
          correct = Array.isArray(studentAnswer) && Array.isArray(q.correctAnswers) &&
            studentAnswer.length === q.correctAnswers.length &&
            studentAnswer.every(a => q.correctAnswers.includes(a));
        }
      } else {
        correct = studentAnswer === q.correctAnswer;
      }
      if (correct) score += q.points || 1;
      checkedAnswers.push({ correct, studentAnswer, correctAnswer: q.correctAnswers || q.correctAnswer });
    });
    const response = new QuizResponse({ quizId, studentId, answers, score, checkedAnswers, violationCount, violationEvents, questionTimes });
    await response.save();
    res.status(201).json({ message: 'Quiz submitted successfully.', score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Faculty fetches all responses for a quiz
router.get('/:quizId/responses', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const responses = await QuizResponse.find({ quizId }).populate('studentId', 'firstname lastname email');
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH a quiz response's score by responseId
router.patch('/:quizId/responses/:responseId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { responseId } = req.params;
    const { score } = req.body;
    if (typeof score !== 'number') return res.status(400).json({ error: 'Score must be a number.' });
    const updated = await QuizResponse.findByIdAndUpdate(responseId, { score }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Quiz response not found.' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch students by array of IDs
router.post('/students/by-ids', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No student IDs provided.' });
    }
    const students = await User.find({ userID: { $in: ids } }, 'firstname lastname email _id userID');
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get the current student's score for a quiz
router.get('/:quizId/myscore', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const studentId = req.user._id;
    const response = await QuizResponse.findOne({ quizId, studentId });
    if (!response) return res.status(404).json({ error: 'No submission found' });

    const quiz = await Quiz.findById(quizId);
    const total = quiz && Array.isArray(quiz.questions)
      ? quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0)
      : null;

    res.json({
      score: response.score ?? 0,
      total: total ?? 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Seeded Fisher-Yates shuffle
function seededShuffle(array, seed) {
  const rng = seedrandom(seed);
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default router;