import express from 'express';
import Section from '../models/Section.js';
import Program from '../models/Program.js'; // For validating program existence
import Course from '../models/Course.js'; // For validating course existence
import User from '../models/User.js';

const router = express.Router();

// GET all sections
router.get('/', async (req, res) => {
  try {
    const sections = await Section.find().sort({ sectionName: 1 });
    res.status(200).json(sections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).json({ message: 'Error fetching sections', error: error.message });
  }
});

// POST a new section
router.post('/', async (req, res) => {
  const { sectionName, programName, yearLevel, courseName } = req.body;

  if (!sectionName || !programName || !yearLevel) {
    return res.status(400).json({ message: 'Missing required fields: sectionName, programName, yearLevel.' });
  }

  try {
    // Validate if the program exists
    const programExists = await Program.findOne({ programName });
    if (!programExists) {
      return res.status(404).json({ message: 'Program not found. Cannot create section.' });
    }

    // If courseName is provided, validate if it exists and belongs to the program
    if (courseName) {
      const courseExists = await Course.findOne({ courseName, programName });
      if (!courseExists) {
        return res.status(404).json({ message: 'Course not found or does not belong to the selected program.' });
      }
    }

    const newSection = new Section({
      sectionName,
      programName,
      yearLevel,
      courseName: courseName || null
    });

    await newSection.save();
    res.status(201).json(newSection);
  } catch (error) {
    console.error("Error creating section:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', error: error.message });
    }
    res.status(500).json({ message: 'Error creating section', error: error.message });
  }
});

// PATCH/Update a section
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { sectionName, programName, yearLevel, courseName } = req.body;

    if (!sectionName || !programName || !yearLevel) {
      return res.status(400).json({ message: 'Missing required fields: sectionName, programName, yearLevel.' });
    }

    // Validate if the program exists
    const programExists = await Program.findOne({ programName });
    if (!programExists) {
      return res.status(404).json({ message: 'Program not found. Cannot update section.' });
    }

    // If courseName is provided, validate if it exists and belongs to the program
    if (courseName) {
      const courseExists = await Course.findOne({ courseName, programName });
      if (!courseExists) {
        return res.status(404).json({ message: 'Course not found or does not belong to the selected program.' });
      }
    }

    const updatedSection = await Section.findByIdAndUpdate(
      id,
      {
        sectionName,
        programName,
        yearLevel,
        courseName: courseName || null
      },
      { new: true }
    );

    if (!updatedSection) {
      return res.status(404).json({ message: 'Section not found' });
    }

    res.status(200).json(updatedSection);
  } catch (error) {
    console.error("Error updating section:", error);
    res.status(500).json({ message: 'Error updating section', error: error.message });
  }
});

// DELETE a section
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First check if the section exists
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Check for dependencies in users (students)
    const hasUsers = await User.exists({ sectionAssigned: id });
    if (hasUsers) {
      return res.status(400).json({ 
        message: 'Cannot delete section with assigned students. Please remove student assignments first.' 
      });
    }

    const deletedSection = await Section.findByIdAndDelete(id);
    res.status(200).json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error("Error deleting section:", error);
    res.status(500).json({ message: 'Error deleting section', error: error.message });
  }
});

export default router; 