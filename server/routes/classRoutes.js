import express from 'express';
import Class from '../models/Class.js';

const router = express.Router();

// Create a new class
router.post('/', async (req, res) => {
  try {
    const { classID, className, classCode, classDesc, members, facultyID } = req.body;
    if (!classID || !className || !classCode || !classDesc || !members || !Array.isArray(members) || !facultyID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newClass = new Class({ classID, className, classCode, classDesc, members, facultyID });
    await newClass.save();
    res.status(201).json({ success: true, class: newClass });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

export default router; 