//assignment routes
import express from 'express';
import Assignment from '../models/Assignment.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import Submission from '../models/Submission.js';
import multer from 'multer';
import path from 'path';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Class from '../models/Class.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import StudentAssignment from '../models/StudentAssignment.js';
import { createAssignmentNotification } from '../services/notificationService.js';

const router = express.Router();

// Storage configuration
const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);


async function initializeAssignmentStorage() {
  if (USE_CLOUDINARY) {
    console.log('[ASSIGNMENTS] Using Cloudinary storage');
    try {
      const { assignmentStorage, submissionStorage } = await import('../config/cloudinary.js');
      return {
        assignmentUpload: multer({ storage: assignmentStorage }),
        submissionUpload: multer({ storage: submissionStorage })
      };
    } catch (error) {
      console.error('[ASSIGNMENTS] Cloudinary setup failed, falling back to local storage:', error.message);
    }
  }
  
  // Local storage fallback
  console.log('[ASSIGNMENTS] Using local storage');
  const uploadDir = path.join(process.cwd(), 'uploads', 'submissions');
  const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });
  const localUpload = multer({ storage: localStorage });
  return {
    assignmentUpload: localUpload,
    submissionUpload: localUpload
  };
}

// Initialize upload middleware
const uploadMiddleware = await initializeAssignmentStorage();
const upload = uploadMiddleware.submissionUpload; // For backward compatibility

// Get all assignments for a class
router.get('/', authenticateToken, async (req, res) => {
  const { classID } = req.query;
  const userId = req.user.userID; // Use userID (school ID) for filtering
  const role = req.user.role;

  console.log('[DEBUG][ASSIGNMENTS] Request details:', {
    classID,
    userId,
    role,
    userObject: req.user,
    userID: req.user.userID,
    roleFromToken: req.user.role
  });

  let assignments;
  if (classID) {
    // Always filter by classID if provided
    console.log('[DEBUG][ASSIGNMENTS] Querying assignments for classID:', classID);
    console.log('[DEBUG][ASSIGNMENTS] MongoDB query: Assignment.find({ classID: "' + classID + '" })');
    assignments = await Assignment.find({ classID }).sort({ createdAt: -1 });
    console.log('[DEBUG][ASSIGNMENTS] Found assignments:', assignments.length, assignments.map(a => ({ id: a._id, title: a.title, classID: a.classID })));
  } else if (role === 'faculty') {
    // Optionally: show all assignments created by this faculty
    assignments = await Assignment.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  } else {
    // If no classID and not faculty, return empty
    assignments = [];
  }

  // Debug: Show all assignments in database for troubleshooting
  console.log('[DEBUG][ASSIGNMENTS] All assignments in database:', await Assignment.find({}).select('_id title classID').lean());

  // Debug log for faculty
  if (role === 'faculty') {
    console.log('[DEBUG][FACULTY] /assignments', { classID, userId, assignmentsCount: assignments.length, assignmentTitles: assignments.map(a => a.title) });
  }

  // Fetch quizzes for this class
  let quizzes = [];
  if (classID) {
    console.log('[DEBUG][ASSIGNMENTS] Querying quizzes for classID:', classID);
    quizzes = await Quiz.find({ $or: [ { classID }, { classIDs: classID } ] }).sort({ createdAt: -1 });
    console.log('[DEBUG][ASSIGNMENTS] Found quizzes:', quizzes.length, quizzes.map(q => ({ id: q._id, title: q.title, classID: q.classID })));
  } else if (role === 'faculty') {
    // For faculty, get quizzes from all their classes
    const facultyClasses = await Class.find({ facultyID: userId });
    const classIDs = facultyClasses.map(c => c.classID);
    quizzes = await Quiz.find({ 
      $or: [ 
        { classID: { $in: classIDs } }, 
        { classIDs: { $in: classIDs } } 
      ] 
    }).sort({ createdAt: -1 });
  }

  // Get class information for all unique classIDs
  const allClassIDs = [...new Set([
    ...assignments.map(a => a.classID),
    ...quizzes.map(q => q.classID || q.classIDs?.[0]).filter(Boolean)
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

  // Add type field and class info for frontend
  const assignmentsWithType = assignments.map(a => ({ 
    ...a.toObject(), 
    type: 'assignment',
    classInfo: classesMap[a.classID] || { className: 'Unknown', classCode: 'N/A', classDesc: '' }
  }));
  const quizzesWithType = quizzes.map(q => ({ 
    ...q.toObject(), 
    type: 'quiz',
    classInfo: classesMap[q.classID || q.classIDs?.[0]] || { className: 'Unknown', classCode: 'N/A', classDesc: '' }
  }));

  // Debug log before filtering
  console.log('[DEBUG] Role:', role, 'Assignments before filter:', assignments ? assignments.length : 'undefined', 'classID:', classID, 'userId:', userId);

  let combined = [...assignmentsWithType, ...quizzesWithType];

  if (role === 'students') {
    const now = new Date();
    
    // TEMPORARY: For local testing, allow all assignments for students
    console.log('DEBUG_ASSIGNMENT_SCHEDULE: LOCAL TESTING MODE - Allowing all assignments for students');
    console.log('DEBUG_ASSIGNMENT_SCHEDULE: Combined assignments before filtering:', combined.length);
    console.log('DEBUG_ASSIGNMENT_SCHEDULE: Raw assignments:', assignments);
    console.log('DEBUG_ASSIGNMENT_SCHEDULE: Raw quizzes:', quizzes);
    
    // For now, don't filter anything for students in local testing
    // combined = combined.filter(a => { ... });
    
    console.log('DEBUG_ASSIGNMENT_SCHEDULE: After local testing mode - keeping all assignments');
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
router.post('/', authenticateToken, uploadMiddleware.assignmentUpload.single('attachmentFile'), async (req, res) => {
  try {
    let { classIDs, classID, title, instructions, type, activityType, description, dueDate, points, fileUploadRequired, allowedFileTypes, fileInstructions, questions, assignedTo, attachmentLink, postAt } = req.body;
    const createdBy = req.user._id;
    
    // Debug logging
    console.log('[AssignmentRoutes] Creating assignment with activityType:', activityType);
    console.log('[AssignmentRoutes] Full request body:', req.body);
    
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
      // Handle both Cloudinary and local storage
      attachmentFile = req.file.secure_url || req.file.path || `/uploads/submissions/${req.file.filename}`;
    }
    
    let assignments = [];
    if (Array.isArray(classIDs) && classIDs.length > 0) {
      for (const cid of classIDs) {
        const assignment = new Assignment({
          classID: cid,
          title: title.trim(),
          instructions,
          type: type || 'assignment',
          activityType: activityType || 'written',
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
        
        // Create notifications for students in this class
        await createAssignmentNotification(cid, assignment);
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
      
      // Create notifications for students in this class
      await createAssignmentNotification(classID, assignment);
      
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
    
    console.log(`[DEBUG][VIEW] User ${userId} requesting to mark assignment ${req.params.id} as viewed`);
    console.log(`[DEBUG][VIEW] Current views array:`, assignment.views);
    
    // Initialize views array if it doesn't exist
    if (!assignment.views) assignment.views = [];
    
    // Check if user is already in views array using ObjectId comparison
    const userAlreadyViewed = assignment.views.some(viewId => 
      viewId.toString() === userId.toString()
    );
    
    console.log(`[DEBUG][VIEW] User already viewed: ${userAlreadyViewed}`);
    
    // Only add if not already viewed
    if (!userAlreadyViewed) {
      assignment.views.push(userId);
      await assignment.save();
      console.log(`[DEBUG][VIEW] Added user ${userId} to views for assignment ${req.params.id}`);
      console.log(`[DEBUG][VIEW] Updated views array:`, assignment.views);
    } else {
      console.log(`[DEBUG][VIEW] User ${userId} already viewed assignment ${req.params.id}, skipping duplicate`);
    }
    
    res.json(assignment);
  } catch (err) {
    console.error('Error marking assignment as viewed:', err);
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
router.post('/:id/submit', authenticateToken, uploadMiddleware.submissionUpload.array('files', 5), async (req, res) => {
  try {
    const student = req.user._id;
    const assignment = req.params.id;
    let files = [];
    let links = [];
    
    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      files = req.files.map(f => ({
        url: f.secure_url || f.path || `/uploads/submissions/${f.filename}`,
        name: f.originalname
      }));
    }
    
    // Handle links if any
    if (req.body.links) {
      // Parse links from form data
      if (typeof req.body.links === 'string') {
        // Single link
        if (req.body.links.trim()) {
          links = [req.body.links.trim()];
        }
      } else if (Array.isArray(req.body.links)) {
        // Multiple links
        links = req.body.links.filter(link => link && link.trim());
      }
    }
    
    // Get context from form data if provided
    const context = req.body.context || '';
    
    // Check if already submitted
    let submission = await Submission.findOne({ assignment, student });
    if (submission) {
      submission.files = files;
      submission.links = links;
      submission.context = context;
      submission.submittedAt = new Date();
      submission.status = 'turned-in';
      await submission.save();
    } else {
      // Create new submission - files and links can be empty arrays for empty submissions
      submission = new Submission({ assignment, student, files, links, context });
      await submission.save();
    }
    
    res.json(submission);
  } catch (err) {
    console.error('Error creating submission:', err);
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
    const { submissionId, studentId, grade, feedback } = req.body;
    const assignmentId = req.params.id;
    
    let submission;
    
    // If submissionId is provided, find existing submission
    if (submissionId) {
      submission = await Submission.findById(submissionId);
      if (!submission) return res.status(404).json({ error: 'Submission not found' });
    } 
    // If studentId is provided, find or create submission
    else if (studentId) {
      submission = await Submission.findOne({ assignment: assignmentId, student: studentId });
      if (!submission) {
        // Create a new submission for the student if none exists
        submission = new Submission({
          assignment: assignmentId,
          student: studentId,
          files: [],
          context: '',
          status: 'turned-in',
          submittedAt: new Date()
        });
      }
    } else {
      return res.status(400).json({ error: 'Either submissionId or studentId is required' });
    }
    
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
    console.error('Error grading submission:', err);
    res.status(500).json({ error: 'Failed to grade submission.' });
  }
});

// Mark all submissions for an assignment as graded (for faculty convenience)
router.patch('/:id/mark-all-graded', authenticateToken, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    
    // Update all submissions for this assignment to mark them as graded
    const result = await Submission.updateMany(
      { assignment: assignmentId },
      { 
        status: 'graded',
        updatedAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} submissions as graded`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Error marking submissions as graded:', err);
    res.status(500).json({ error: 'Failed to mark submissions as graded.' });
  }
});

// Student undoes their submission (delete submission)
router.delete('/:id/submission', authenticateToken, async (req, res) => {
  try {
    const student = req.user._id;
    const assignment = req.params.id;
    
    // Find the submission first to check if it's graded
    const submission = await Submission.findOne({ assignment, student });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }
    
    // Check if the submission has been graded
    if (submission.status === 'graded' || submission.grade !== undefined || submission.grade !== null) {
      return res.status(403).json({ 
        error: 'Cannot undo submission. This submission has already been graded and cannot be modified.' 
      });
    }
    
    // If not graded, proceed with deletion
    await Submission.findOneAndDelete({ assignment, student });
    res.json({ success: true });
  } catch (err) {
    console.error('Error undoing submission:', err);
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
    
    // Check if the submission has been graded
    if (submission.status === 'graded' || submission.grade !== undefined || submission.grade !== null) {
      return res.status(403).json({ 
        error: 'Cannot modify submission. This submission has already been graded and cannot be modified.' 
      });
    }
    
    // Remove the file from the files array
    submission.files = (submission.files || []).filter(f => f.url !== fileUrl);
    await submission.save();
    res.json(submission);
  } catch (err) {
    console.error('Error deleting file from submission:', err);
    res.status(500).json({ error: 'Failed to delete file from submission.' });
  }
});

// Get student activity audit for faculty, VPE, and Principal (who missed or haven't viewed activities)
router.get('/audit/student-activity', authenticateToken, async (req, res) => {
  try {
    console.log('[DEBUG] User role:', req.user.role);
    console.log('[DEBUG] User ID:', req.user._id);
    console.log('[DEBUG] Query params:', req.query);
    
    // Only faculty, VPE, and Principal can access this endpoint
    if (!['faculty', 'vice president of education', 'principal'].includes(req.user.role)) {
      console.log('[DEBUG] Access denied for role:', req.user.role);
      return res.status(403).json({ error: 'Access denied. Faculty, VPE, and Principal only.' });
    }

    const { termId, sectionName } = req.query;
    const isAdmin = ['vice president of education', 'principal'].includes(req.user.role);
    const facultyId = req.user.role === 'faculty' ? req.user._id : null;

    // Get faculty's assigned sections for the term (only for faculty users)
    let facultySections = [];
    if (termId && !isAdmin) {
      const facultyAssignments = await FacultyAssignment.find({
        facultyId,
        termId,
        status: 'active'
      });
      facultySections = facultyAssignments.map(fa => fa.sectionName);
    }

    // Get all assignments and quizzes (all faculty for VPE/Principal, specific faculty for faculty users)
    let assignments = [], quizzes = [];
    try {
      if (isAdmin) {
        // VPE and Principal can see all assignments and quizzes
        console.log('[DEBUG] Fetching all assignments and quizzes for admin user');
        assignments = await Assignment.find({}).populate('views', 'firstname lastname userID').populate('createdBy', 'firstname lastname');
        quizzes = await Quiz.find({}).populate('views', 'firstname lastname userID').populate('createdBy', 'firstname lastname');
        console.log('[DEBUG] Found assignments:', assignments.length);
        console.log('[DEBUG] Found quizzes:', quizzes.length);
      } else {
        // Faculty users only see their own assignments and quizzes
        console.log('[DEBUG] Fetching assignments and quizzes for faculty user:', facultyId);
        assignments = await Assignment.find({ createdBy: facultyId }).populate('views', 'firstname lastname userID');
        quizzes = await Quiz.find({ createdBy: facultyId }).populate('views', 'firstname lastname userID');
        console.log('[DEBUG] Found assignments:', assignments.length);
        console.log('[DEBUG] Found quizzes:', quizzes.length);
      }
    } catch (err) {
      console.error('[DEBUG] Error fetching assignments/quizzes:', err);
      assignments = [];
      quizzes = [];
    }

    // Get all students (all students for VPE/Principal, filtered by faculty sections for faculty users)
    let studentQuery = {};
    if (termId) studentQuery.termId = termId;
    if (sectionName) studentQuery.sectionName = sectionName;
    
    if (!isAdmin && facultySections.length > 0) {
      // Faculty users only see students in their assigned sections
      studentQuery.sectionName = { $in: facultySections };
    }
    
    // For VPE/Principal, if no termId is provided, don't filter by term
    if (isAdmin && !termId) {
      console.log('[DEBUG] Admin user with no termId - fetching all students');
    }

    let studentAssignments = [];
    try {
      studentAssignments = await StudentAssignment.find(studentQuery).populate('studentId', 'firstname lastname userID schoolID');
      console.log('[DEBUG] Found student assignments:', studentAssignments.length);
      console.log('[DEBUG] Student query:', studentQuery);
    } catch (err) {
      console.error('[DEBUG] Error fetching student assignments:', err);
      studentAssignments = [];
    }

    // If no student assignments found, return empty array
    if (!studentAssignments || studentAssignments.length === 0) {
      console.log('[DEBUG] No student assignments found, returning empty audit data');
      return res.json({ auditData: [] });
    }

    // Build activity audit data using a Map to prevent duplicates
    const auditMap = new Map();
    
    // Create a set of unique student-activity combinations to avoid duplicates
    const processedCombinations = new Set();
    
    // Process assignments
    for (const assignment of assignments) {
      const assignedStudents = assignment.assignedTo?.find(a => a.classID === assignment.classID)?.studentIDs || [];
      const viewedStudentIds = assignment.views?.map(v => v._id.toString()) || [];
      
      for (const studentAssignment of studentAssignments) {
        // Skip if studentId is not populated
        if (!studentAssignment.studentId) {
          console.log('[DEBUG] Skipping student assignment with no studentId:', studentAssignment._id);
          continue;
        }
        
        const studentId = studentAssignment.studentId._id.toString();
        const studentUserID = studentAssignment.studentId.userID;
        
        // Check if student is assigned to this activity
        const isAssigned = assignedStudents.some(id => 
          id.toString() === studentId || id.toString() === studentUserID
        );
        
        if (isAssigned) {
          // Create unique key to prevent duplicates
          const uniqueKey = `${studentId}-${assignment._id}`;
          
          // Skip if we've already processed this combination
          if (processedCombinations.has(uniqueKey)) {
            continue;
          }
          processedCombinations.add(uniqueKey);
          
          const hasViewed = viewedStudentIds.includes(studentId);
          const now = new Date();
          const dueDate = assignment.dueDate;
          const isMissed = dueDate && now > dueDate && !hasViewed;
          
          auditMap.set(uniqueKey, {
            studentId: studentId,
            studentName: `${studentAssignment.studentId.lastname}, ${studentAssignment.studentId.firstname}`,
            sectionName: studentAssignment.sectionName,
            activityId: assignment._id,
            activityTitle: assignment.title,
            activityType: 'assignment',
            classID: assignment.classID,
            dueDate: assignment.dueDate,
            status: hasViewed ? 'viewed' : (isMissed ? 'missed' : 'not_viewed'),
            lastViewedAt: hasViewed ? new Date() : null,
            submittedAt: null,
            assignedTo: assignedStudents,
            facultyName: isAdmin ? `${assignment.createdBy?.lastname || 'Unknown'}, ${assignment.createdBy?.firstname || 'Unknown'}` : undefined
          });
        }
      }
    }

    // Process quizzes
    for (const quiz of quizzes) {
      const assignedStudents = quiz.assignedTo?.find(a => a.classID === quiz.classID)?.studentIDs || [];
      const viewedStudentIds = quiz.views?.map(v => v._id.toString()) || [];
      
      for (const studentAssignment of studentAssignments) {
        // Skip if studentId is not populated
        if (!studentAssignment.studentId) {
          console.log('[DEBUG] Skipping student assignment with no studentId:', studentAssignment._id);
          continue;
        }
        
        const studentId = studentAssignment.studentId._id.toString();
        const studentUserID = studentAssignment.studentId.userID;
        
        // Check if student is assigned to this activity
        const isAssigned = assignedStudents.some(id => 
          id.toString() === studentId || id.toString() === studentUserID
        );
        
        if (isAssigned) {
          // Create unique key to prevent duplicates
          const uniqueKey = `${studentId}-${quiz._id}`;
          
          // Skip if we've already processed this combination
          if (processedCombinations.has(uniqueKey)) {
            continue;
          }
          processedCombinations.add(uniqueKey);
          
          const hasViewed = viewedStudentIds.includes(studentId);
          const now = new Date();
          const dueDate = quiz.dueDate;
          const isMissed = dueDate && now > dueDate && !hasViewed;
          
          auditMap.set(uniqueKey, {
            studentId: studentId,
            studentName: `${studentAssignment.studentId.lastname}, ${studentAssignment.studentId.firstname}`,
            sectionName: studentAssignment.sectionName,
            activityId: quiz._id,
            activityTitle: quiz.title,
            activityType: 'quiz',
            classID: quiz.classID,
            dueDate: quiz.dueDate,
            status: hasViewed ? 'viewed' : (isMissed ? 'missed' : 'not_viewed'),
            lastViewedAt: hasViewed ? new Date() : null,
            submittedAt: null,
            assignedTo: assignedStudents,
            facultyName: isAdmin ? `${quiz.createdBy?.lastname || 'Unknown'}, ${quiz.createdBy?.firstname || 'Unknown'}` : undefined
          });
        }
      }
    }

    // Convert Map values to array
    const auditData = Array.from(auditMap.values());
    console.log('[DEBUG] Final audit data count:', auditData.length);
    console.log('[DEBUG] Sample audit data:', auditData.slice(0, 2));

    res.json({ auditData });
  } catch (err) {
    console.error('Error fetching student activity audit:', err);
    res.status(500).json({ error: 'Failed to fetch student activity audit.' });
  }
});

export default router; 