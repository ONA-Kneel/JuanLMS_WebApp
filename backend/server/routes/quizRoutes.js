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
import { getIO } from '../server.js';

const router = express.Router();

// Add body parsing middleware
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Storage configuration
const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);


async function initializeQuizStorage() {
  if (USE_CLOUDINARY) {
    console.log('[QUIZ] Using Cloudinary storage');
    try {
      const { quizImageStorage } = await import('../config/cloudinary.js');
      return multer({ storage: quizImageStorage });
    } catch (error) {
      console.error('[QUIZ] Cloudinary setup failed, falling back to local storage:', error.message);
    }
  }
  
  // Local storage fallback
  console.log('[QUIZ] Using local storage');
  const quizImageDir = path.resolve('uploads/quiz-images');
  if (!fs.existsSync(quizImageDir)) {
    fs.mkdirSync(quizImageDir, { recursive: true });
  }
  
  const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, quizImageDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const filename = uniqueSuffix + ext;
      cb(null, filename);
    }
  });
  return multer({ storage: localStorage });
}

// Initialize upload middleware
const upload = await initializeQuizStorage();

// Upload quiz image
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Return the appropriate URL based on storage type
  let imageUrl;
  if (req.file.secure_url) {
    // Cloudinary URL
    imageUrl = req.file.secure_url;
  } else {
    // Local storage - construct backend URL
    const backendUrl = process.env.BACKEND_URL || 'https://juanlms-webapp-server.onrender.com';
    imageUrl = `${backendUrl}/uploads/quiz-images/${req.file.filename}`;
  }
  
  res.json({ url: imageUrl });
});

// Create a new quiz
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    console.log('[QuizRoutes] Creating quiz with data:', req.body);
    console.log('[QuizRoutes] ActivityType:', req.body.activityType);
    console.log('[QuizRoutes] Timing data:', req.body.timing);
    
    // Validate quarter data
    const { quarter, termName, academicYear } = req.body;
    if (!quarter || !termName || !academicYear) {
      return res.status(400).json({ 
        error: 'Quarter, term name, and academic year are required.' 
      });
    }

    // Validate quarter based on term
    if (termName === 'Term 1' && !['Q1', 'Q2'].includes(quarter)) {
      return res.status(400).json({
        error: 'Invalid quarter for Term 1. Must be Q1 or Q2.'
      });
    }
    
    if (termName === 'Term 2' && !['Q3', 'Q4'].includes(quarter)) {
      return res.status(400).json({
        error: 'Invalid quarter for Term 2. Must be Q3 or Q4.'
      });
    }
    
    // Validate points boundaries before creating
    const total = Array.isArray(req.body.questions)
      ? req.body.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)
      : Number(req.body.points) || 0;
    if (total < 1 || total > 100) {
      return res.status(400).json({ error: 'Total quiz points must be between 1 and 100.' });
    }
    if (Array.isArray(req.body.questions)) {
      for (const q of req.body.questions) {
        if ((Number(q.points) || 0) < 1) {
          return res.status(400).json({ error: 'Each question must be at least 1 point.' });
        }
      }
    }

    // Check for duplicate quiz before creating
    const existingQuiz = await Quiz.findOne({
      classID: req.body.classID,
      title: req.body.title,
      quarter: req.body.quarter,
      termName: req.body.termName,
      academicYear: req.body.academicYear
    });
    
    if (existingQuiz) {
      console.log(`[QuizRoutes] Duplicate quiz detected: ${req.body.title} for class ${req.body.classID}`);
      return res.status(400).json({ 
        error: 'A quiz with this title already exists for this class in this quarter.' 
      });
    }

    const quiz = new Quiz(req.body);
    try {
    await quiz.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        console.log(`[QuizRoutes] Duplicate quiz detected during save: ${req.body.title} for class ${req.body.classID}`);
        return res.status(400).json({ 
          error: 'A quiz with this title already exists for this class in this quarter.' 
        });
      }
      throw saveError;
    }
    
    console.log('[QuizRoutes] Quiz created successfully:', quiz._id);
    console.log('[QuizRoutes] Saved timing data:', quiz.timing);
    
    // Create notifications for students in the class(es)
    if (quiz.classID) {
      await createQuizNotification(quiz.classID, quiz);
      
      // Emit real-time update to all users in the class
      const io = getIO();
      if (io) {
        io.to(`class_${quiz.classID}`).emit('newQuiz', {
          quiz,
          classID: quiz.classID,
          timestamp: new Date().toISOString()
        });
      }
    } else if (quiz.assignedTo && Array.isArray(quiz.assignedTo)) {
      const io = getIO();
      for (const assignment of quiz.assignedTo) {
        if (assignment.classID) {
          await createQuizNotification(assignment.classID, quiz);
          
          // Emit real-time update to all users in the class
          if (io) {
            io.to(`class_${assignment.classID}`).emit('newQuiz', {
              quiz,
              classID: assignment.classID,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }
    
    res.status(201).json(quiz);
  } catch (err) {
    console.error('[QuizRoutes] Error creating quiz:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get all quizzes (optionally filter by classID, quarter, termName, academicYear)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { classID, quarter, termName, academicYear } = req.query;
    const userId = req.user.userID;
    const role = req.user.role;
    
    console.log('[QuizRoutes] GET / - Role:', role, 'UserID:', userId, 'ClassID:', classID, 'Quarter:', quarter);
    console.log('[QuizRoutes] Full user object:', req.user);
    
    // Build query object
    const query = {};
    if (classID) query['assignedTo.classID'] = classID;
    if (quarter) query.quarter = quarter;
    if (termName) query.termName = termName;
    if (academicYear) query.academicYear = academicYear;

    let quizzes;
    if (Object.keys(query).length > 0) {
      // Filter by provided parameters
      quizzes = await Quiz.find(query);
      console.log('[QuizRoutes] Found quizzes with query:', query, 'Count:', quizzes.length);
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
      console.log('[QuizRoutes] Found quizzes for faculty classes:', classIDs, 'Count:', quizzes.length);
    } else {
      // For students, get all quizzes for local testing
      if (role === 'students') {
        console.log('[QuizRoutes] LOCAL TESTING MODE - Getting all quizzes for students');
        quizzes = await Quiz.find({});
      } else {
        quizzes = [];
      }
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
    const response = await QuizResponse.findOne({ quizId, studentId }).populate('studentId', 'firstname lastname email _id userID');
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
    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing or invalid. Please ensure Content-Type is application/json.' });
    }
    
    console.log('[QuizRoutes] Updating quiz:', req.params.id);
    console.log('[QuizRoutes] Update data:', req.body);
    console.log('[QuizRoutes] Update timing data:', req.body.timing);
    
    const { quarter, termName, academicYear } = req.body;
    
    // Validate required quarter fields if provided
    if (quarter && !['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return res.status(400).json({ error: 'Quarter must be Q1, Q2, Q3, or Q4.' });
    }
    
    if (termName && !['Term 1', 'Term 2'].includes(termName)) {
      return res.status(400).json({ error: 'Term name must be "Term 1" or "Term 2".' });
    }
    
    // Validate points boundaries before updating
    const total = Array.isArray(req.body.questions)
      ? req.body.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)
      : Number(req.body.points) || 0;
    if (total < 1 || total > 100) {
      return res.status(400).json({ error: 'Total quiz points must be between 1 and 100.' });
    }
    if (Array.isArray(req.body.questions)) {
      for (const q of req.body.questions) {
        if ((Number(q.points) || 0) < 1) {
          return res.status(400).json({ error: 'Each question must be at least 1 point.' });
        }
      }
    }

    // Get existing quiz to check for required fields
    const existingQuiz = await Quiz.findById(req.params.id);
    if (!existingQuiz) return res.status(404).json({ error: 'Quiz not found' });
    
    // Ensure required fields are present (for existing quizzes that might not have them)
    const updateData = { ...req.body };
    if (!existingQuiz.quarter && !updateData.quarter) {
      updateData.quarter = quarter || 'Q1'; // Default to Q1 if not provided
    }
    if (!existingQuiz.termName && !updateData.termName) {
      updateData.termName = termName || 'Term 1'; // Default to Term 1 if not provided
    }
    if (!existingQuiz.academicYear && !updateData.academicYear) {
      updateData.academicYear = academicYear || '2024-2025'; // Default academic year if not provided
    }

    const quiz = await Quiz.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    
    console.log('[QuizRoutes] Quiz updated successfully');
    console.log('[QuizRoutes] Updated timing data:', quiz.timing);
    
    res.json(quiz);
  } catch (err) {
    console.error('[QuizRoutes] Error updating quiz:', err);
    console.error('[QuizRoutes] Request body:', req.body);
    console.error('[QuizRoutes] Quiz ID:', req.params.id);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      console.error('[QuizRoutes] Validation errors:', errors);
      return res.status(400).json({ error: errors.join(', ') });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A quiz with this title already exists for this class in this quarter.' });
    }
    res.status(400).json({ error: err.message });
  }
});

// PATCH a quiz by ID (partial update)
router.patch('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing or invalid. Please ensure Content-Type is application/json.' });
    }
    
    const { quarter, termName, academicYear } = req.body;
    
    // Validate required quarter fields if provided
    if (quarter && !['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return res.status(400).json({ error: 'Quarter must be Q1, Q2, Q3, or Q4.' });
    }
    
    if (termName && !['Term 1', 'Term 2'].includes(termName)) {
      return res.status(400).json({ error: 'Term name must be "Term 1" or "Term 2".' });
    }
    
    // Get existing quiz to check for required fields
    const existingQuiz = await Quiz.findById(req.params.id);
    if (!existingQuiz) return res.status(404).json({ error: 'Quiz not found' });
    
    // Ensure required fields are present (for existing quizzes that might not have them)
    const updateData = { ...req.body };
    if (!existingQuiz.quarter && !updateData.quarter) {
      updateData.quarter = quarter || 'Q1'; // Default to Q1 if not provided
    }
    if (!existingQuiz.termName && !updateData.termName) {
      updateData.termName = termName || 'Term 1'; // Default to Term 1 if not provided
    }
    if (!existingQuiz.academicYear && !updateData.academicYear) {
      updateData.academicYear = academicYear || '2024-2025'; // Default academic year if not provided
    }
    
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    console.error('[QuizRoutes] Error updating quiz:', err);
    console.error('[QuizRoutes] Request body:', req.body);
    console.error('[QuizRoutes] Quiz ID:', req.params.id);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      console.error('[QuizRoutes] Validation errors:', errors);
      return res.status(400).json({ error: errors.join(', ') });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A quiz with this title already exists for this class in this quarter.' });
    }
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
    const { answers, violationCount, violationEvents, questionTimes, isTimeoutSubmission } = req.body;
    
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Answers are required.' });
    }
    
    const existing = await QuizResponse.findOne({ quizId, studentId });
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted this quiz. You cannot submit again.' });
    }
    
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    
    // Validate that at least one question has been answered (not empty)
    // Skip validation if this is a timeout submission
    if (!isTimeoutSubmission) {
      const hasValidAnswers = answers.some(answer => {
        if (answer && answer.answer !== null && answer.answer !== undefined) {
          if (typeof answer.answer === 'string') {
            return answer.answer.trim() !== '';
          } else if (Array.isArray(answer.answer)) {
            return answer.answer.length > 0 && answer.answer.some(a => a !== null && a !== undefined && a !== '');
          }
          return true; // For other types (boolean, number, etc.)
        }
        return false;
      });
      
      if (!hasValidAnswers) {
        return res.status(400).json({ error: 'You must answer at least one question before submitting.' });
      }
    }
    
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
    const response = new QuizResponse({ quizId, studentId, answers, score, checkedAnswers, violationCount, violationEvents, questionTimes, graded: true });
    await response.save();
    
    // Emit real-time quiz completion event
    const io = getIO();
    if (io) {
      io.to(`class_${quiz.classID}`).emit('quizCompleted', {
        quizId: quizId,
        studentId: studentId,
        response: response,
        classID: quiz.classID,
        timestamp: new Date().toISOString()
      });
      console.log(`[QuizRoutes] Emitted quizCompleted event for quiz ${quizId} by student ${studentId} in class ${quiz.classID}`);
    }
    
    res.status(201).json({ message: 'Quiz submitted successfully.', score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Faculty fetches all responses for a quiz
router.get('/:quizId/responses', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const responses = await QuizResponse.find({ quizId }).populate('studentId', 'firstname lastname email _id userID');
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all quiz responses as graded (for faculty convenience)
router.patch('/:quizId/responses/mark-all-graded', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { quizId } = req.params;
    
    // Update all responses for this quiz to mark them as graded
    const result = await QuizResponse.updateMany(
      { quizId },
      { 
        graded: true,
        updatedAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} responses as graded`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH a quiz response's score by responseId
router.patch('/:quizId/responses/:responseId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { responseId } = req.params;
    const { score, feedback } = req.body;
    
    // Validate score - allow 0 as a valid score since students may not pass anything
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ 
        error: 'Score must be a non-negative number. Zero is a valid score for students who did not pass anything.' 
      });
    }
    
    const updateData = { 
      score, 
      graded: true,
      updatedAt: new Date()
    };
    
    if (feedback !== undefined) {
      updateData.feedback = feedback;
    }
    
    const updated = await QuizResponse.findByIdAndUpdate(responseId, updateData, { new: true });
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
    // Search by both _id and userID to handle different ID formats
    const students = await User.find({ 
      $or: [
        { _id: { $in: ids } },
        { userID: { $in: ids } }
      ]
    }, 'firstname lastname email _id userID');
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

// Debug endpoint to troubleshoot quiz assignment data
router.get('/:quizId/debug', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    
    const responses = await QuizResponse.find({ quizId }).populate('studentId', 'firstname lastname email _id userID');
    
    // Get assigned student IDs
    const assignedIDs = quiz?.assignedTo?.[0]?.studentIDs || [];
    
    // Try to find students by these IDs
    const students = await User.find({ 
      $or: [
        { _id: { $in: assignedIDs } },
        { userID: { $in: assignedIDs } }
      ]
    }, 'firstname lastname email _id userID');
    
    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        assignedTo: quiz.assignedTo
      },
      assignedIDs,
      studentsFound: students.length,
      students: students.map(s => ({
        _id: s._id,
        userID: s.userID,
        firstname: s.firstname,
        lastname: s.lastname
      })),
      responses: responses.map(r => ({
        _id: r._id,
        studentId: r.studentId,
        score: r.score,
        graded: r.graded
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fix pending quiz scores - mark all responses with scores as graded
router.patch('/fix-pending-scores', authenticateToken, async (req, res) => {
  try {
    // Only allow faculty/admin to run this
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Find all quiz responses that have a score but are not marked as graded
    const pendingResponses = await QuizResponse.find({
      score: { $exists: true, $ne: null },
      graded: { $ne: true }
    });
    
    console.log(`Found ${pendingResponses.length} quiz responses with scores that are not marked as graded`);
    
    if (pendingResponses.length > 0) {
      // Update all these responses to mark them as graded
      const result = await QuizResponse.updateMany(
        {
          score: { $exists: true, $ne: null },
          graded: { $ne: true }
        },
        {
          $set: { 
            graded: true,
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`Successfully updated ${result.modifiedCount} quiz responses to marked as graded`);
      
      res.json({
        success: true,
        message: `Updated ${result.modifiedCount} quiz responses to marked as graded`,
        modifiedCount: result.modifiedCount
      });
    } else {
      res.json({
        success: true,
        message: 'No pending quiz responses found to update',
        modifiedCount: 0
      });
    }
  } catch (err) {
    console.error('Error fixing pending quiz scores:', err);
    res.status(500).json({ error: 'Failed to fix pending quiz scores' });
  }
});

// Mark quiz as viewed by a student
router.post('/:id/view', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    
    console.log(`[DEBUG][VIEW] User ${userId} requesting to mark quiz ${req.params.id} as viewed`);
    console.log(`[DEBUG][VIEW] Current views array:`, quiz.views);
    
    // Initialize views array if it doesn't exist
    if (!quiz.views) quiz.views = [];
    
    // Check if user is already in views array using ObjectId comparison
    const userAlreadyViewed = quiz.views.some(viewId => 
      viewId.toString() === userId.toString()
    );
    
    console.log(`[DEBUG][VIEW] User already viewed: ${userAlreadyViewed}`);
    
    // Only add if not already viewed
    if (!userAlreadyViewed) {
      quiz.views.push(userId);
      await quiz.save();
      console.log(`[DEBUG][VIEW] Added user ${userId} to views for quiz ${req.params.id}`);
      console.log(`[DEBUG][VIEW] Updated views array:`, quiz.views);
    } else {
      console.log(`[DEBUG][VIEW] User ${userId} already viewed quiz ${req.params.id}, skipping duplicate`);
    }
    
    res.json(quiz);
  } catch (err) {
    console.error('Error marking quiz as viewed:', err);
    res.status(500).json({ error: 'Failed to mark as viewed' });
  }
});

export default router;