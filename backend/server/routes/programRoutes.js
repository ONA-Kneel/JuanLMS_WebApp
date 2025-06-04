import express from 'express';
import Program from '../models/Program.js';
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Section from '../models/Section.js';
import User from '../models/User.js';

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
    const { programName, yearLevel } = req.body;
    if (!programName || !yearLevel) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    const newProgram = new Program({ programName, yearLevel });
    await newProgram.save();
    res.status(201).json(newProgram);
  } catch (error) {
    res.status(500).json({ message: 'Error creating program', error: error.message });
  }
});

// PATCH/Update a program
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { programName, yearLevel } = req.body;

    // Validate required fields
    if (!programName || !yearLevel) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const updatedProgram = await Program.findByIdAndUpdate(
      id,
      { programName, yearLevel },
      { new: true }
    );

    if (!updatedProgram) {
      return res.status(404).json({ message: 'Program not found' });
    }

    res.status(200).json(updatedProgram);
  } catch (error) {
    res.status(500).json({ message: 'Error updating program', error: error.message });
  }
});

// DELETE a program
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First check if the program exists
    const program = await Program.findById(id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check for dependencies in courses
    const hasCourses = await Course.exists({ programName: program.programName });
    if (hasCourses) {
      return res.status(400).json({ 
        message: 'Cannot delete program with associated courses. Please delete the courses first.' 
      });
    }

    // Check for dependencies in sections
    const hasSections = await Section.exists({ programName: program.programName });
    if (hasSections) {
      return res.status(400).json({ 
        message: 'Cannot delete program with associated sections. Please delete the sections first.' 
      });
    }

    // Check for dependencies in users (faculty and students)
    const hasUsers = await User.exists({ programAssigned: program._id });
    if (hasUsers) {
      return res.status(400).json({ 
        message: 'Cannot delete program with assigned faculty or students. Please remove assignments first.' 
      });
    }

    const deletedProgram = await Program.findByIdAndDelete(id);
    res.status(200).json({ message: 'Program deleted successfully' });
  } catch (error) {
    console.error("Error deleting program:", error);
    res.status(500).json({ message: 'Error deleting program', error: error.message });
  }
});

export default router;