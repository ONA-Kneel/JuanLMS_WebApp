import express from 'express';
import Program from '../models/Program.js';

const router = express.Router();

// GET all programs
router.get('/', async (req, res) => {
  try {
    const programs = await Program.find().sort({ programName: 1 });
    res.status(200).json(programs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching programs', error: error.message });
  }
});

// POST a new program
router.post('/', async (req, res) => {
  try {
    const { programName, status, yearLevel } = req.body;
    if (!programName || !status || !yearLevel) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    const newProgram = new Program({ programName, status, yearLevel });
    await newProgram.save();
    res.status(201).json(newProgram);
  } catch (error) {
    res.status(500).json({ message: 'Error creating program', error: error.message });
  }
});

export default router;