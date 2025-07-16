import express from 'express';
import Quiz from '../models/Quiz.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import QuizResponse from '../models/QuizResponse.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

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
  // Construct public URL (assuming /uploads is served statically)
  const imageUrl = `/uploads/quiz-images/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Create a new quiz
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    const quiz = new Quiz(req.body);
    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all quizzes (optionally filter by classID)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.query;
    let filter = {};
    if (classID) {
      filter['assignedTo.classID'] = classID;
    }
    const quizzes = await Quiz.find(filter);
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single quiz by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a quiz by ID
router.put('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
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
        const studentId = req.user ? req.user._id : req.body.studentId; // fallback for testing
        const { answers } = req.body;
        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ error: 'Answers are required.' });
        }
        // Prevent duplicate submissions (optional)
        const existing = await QuizResponse.findOne({ quizId, studentId });
        if (existing) {
            return res.status(400).json({ error: 'You have already submitted this quiz.' });
        }
        // --- Auto-grading logic ---
        const quiz = await Quiz.findById(quizId);
        let score = 0;
        let checkedAnswers = [];
        quiz.questions.forEach((q, i) => {
          const studentAnswer = answers[i]?.answer;
          let correct = false;
          if (q.type === 'multiple') {
            correct = Array.isArray(studentAnswer) && Array.isArray(q.correct) &&
                      studentAnswer.length === q.correct.length &&
                      studentAnswer.every(a => q.correct.includes(a));
          } else {
            correct = studentAnswer === q.correct;
          }
          if (correct) score += q.points || 1;
          checkedAnswers.push({ correct, studentAnswer, correctAnswer: q.correct });
        });
        // Save response with score
        const response = new QuizResponse({ quizId, studentId, answers, score, checkedAnswers });
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
        // Optionally: check if req.user is faculty
        const responses = await QuizResponse.find({ quizId }).populate('studentId', 'firstname lastname email');
        res.json(responses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Faculty fetches a single student's response
router.get('/quizzes/:quizId/response/:studentId', async (req, res) => {
    try {
        const { quizId, studentId } = req.params;
        // Optionally: check if req.user is faculty
        const response = await QuizResponse.findOne({ quizId, studentId }).populate('studentId', 'firstname lastname email');
        if (!response) return res.status(404).json({ error: 'Response not found.' });
        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router; 