// classRoutes.js
// Handles creation and retrieval of class records for JuanLMS.
// Uses Mongoose for class storage.

import express from 'express';
import Class from '../models/Class.js';

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

export default router; 