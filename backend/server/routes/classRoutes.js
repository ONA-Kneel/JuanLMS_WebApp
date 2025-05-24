// classRoutes.js
// Handles creation and retrieval of class records for JuanLMS.
// Uses Mongoose for class storage.

import express from 'express';
import Class from '../models/Class.js';
import database from "../connect.cjs";

const router = express.Router();

// --- POST / - Create a new class ---
router.post('/', async (req, res) => {
  try {
    const { classID, className, classCode, classDesc, members, facultyID } = req.body;
    // Validate required fields
    // members must be an array of user IDs (students enrolled in the class)
    if (!classID || !className || !classCode || !classDesc || !members || !Array.isArray(members) || !facultyID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Class object structure: classID, className, classCode, classDesc, members (array), facultyID
    const newClass = new Class({ classID, className, classCode, classDesc, members, facultyID });
    await newClass.save();
    res.status(201).json({ success: true, class: newClass });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// --- GET / - Get all classes ---
router.get('/', async (req, res) => {
  try {
    // Returns all class records in the database
    const classes = await Class.find();
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

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

export default router; 