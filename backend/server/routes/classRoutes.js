// classRoutes.js
// Handles creation and retrieval of class records for JuanLMS.
// Uses Mongoose for class storage.

import express from 'express';
import Class from '../models/Class.js';
import database from '../connect.cjs';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authMiddleware.js';


const router = express.Router();

// --- POST / - Create a new class ---
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { classID, className, classCode, classDesc, members, facultyID } = req.body;
    
    // Validate required fields
    if (!classID || !className || !classCode || !classDesc || !members || !Array.isArray(members) || !facultyID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create new class
    const newClass = new Class({ classID, className, classCode, classDesc, members, facultyID });
    await newClass.save();

    // Create audit log for class creation
    const db = database.getDb();
    await db.collection('AuditLogs').insertOne({
      userId: new ObjectId(req.user._id),
      userName: `${req.user.firstname} ${req.user.lastname}`,
      userRole: req.user.role,
      action: `${req.user.role.toUpperCase()}_ADD_CLASS`,
      details: `Created new class "${className}" (${classCode})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      timestamp: new Date()
    });

    res.status(201).json({ success: true, class: newClass });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// --- GET / - Get all classes ---
router.get('/', authenticateToken, async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// --- GET /:id - Get a specific class ---
// router.get('/:id', authenticateToken, async (req, res) => {
//   try {
//     const classData = await Class.findById(req.params.id);
//     if (!classData) {
//       return res.status(404).json({ error: 'Class not found' });
//     }
//     res.json(classData);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to fetch class' });
//   }
// });

// --- GET /:classID/members - Get all members (faculty and students) of a class ---
router.get('/:classID/members', async (req, res) => {
  try {
    const { classID } = req.params;
    const db = req.app.locals.db || database.getDb();
    // Find the class by classID
    const classDoc = await db.collection('Classes').findOne({ classID });
    if (!classDoc) return res.status(404).json({ error: 'Class not found' });
    // Get faculty user
    const faculty = await db.collection('Users').find({ userID: classDoc.facultyID }).toArray();
    // Get student users
    const students = classDoc.members && classDoc.members.length > 0
      ? await db.collection('Users').find({ userID: { $in: classDoc.members } }).toArray()
      : [];
    res.json({ faculty, students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch class members' });
  }
});

// Get all classes for the logged-in user (student)
router.get('/my-classes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const classes = await Class.find({ members: userId });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes.' });
  }
});

export default router; 