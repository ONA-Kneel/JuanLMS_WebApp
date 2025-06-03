import express from 'express';
import Section from '../models/Section.js';
import Program from '../models/Program.js'; // For validating program existence
import Course from '../models/Course.js'; // For validating course existence

const router = express.Router();

// GET all sections, populating program and course details
router.get('/', async (req, res) => {
  try {
    const sections = await Section.find()
      .populate('program', 'programName yearLevel') // Populate programName and yearLevel
      .populate('course', 'courseName')      // Populate courseName
      .sort({ sectionName: 1 });
    res.status(200).json(sections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).json({ message: 'Error fetching sections', error: error.message });
  }
});

// POST a new section
router.post('/', async (req, res) => {
  const { sectionName, program, yearLevel, course } = req.body; // Added course

  if (!sectionName || !program || !yearLevel) { // Course is optional, so not in this primary check
    return res.status(400).json({ message: 'Missing required fields: sectionName, program, yearLevel.' });
  }

  try {
    // Validate if the program ObjectId actually exists
    const programExists = await Program.findById(program);
    if (!programExists) {
      return res.status(404).json({ message: 'Program not found. Cannot create section.' });
    }

    // If course is provided, validate if it exists
    if (course) {
      const courseExists = await Course.findById(course);
      if (!courseExists) {
        return res.status(404).json({ message: 'Course not found. Cannot create section.' });
      }
      // Optional: Validate if the course belongs to the selected program
      if (courseExists.program.toString() !== programExists._id.toString()) {
        return res.status(400).json({ message: 'Selected course does not belong to the selected program.'});
      }
    }

    const newSection = new Section({
      sectionName,
      program, // Store ObjectId
      yearLevel,
      course: course || null, // Store ObjectId or null if not provided
    });
    await newSection.save();
    // Populate program and course details for the response
    const populatedSection = await Section.findById(newSection._id)
                                  .populate('program', 'programName yearLevel')
                                  .populate('course', 'courseName');
    res.status(201).json(populatedSection);
  } catch (error) {
    console.error("Error creating section:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', error: error.message });
    }
    res.status(500).json({ message: 'Error creating section', error: error.message });
  }
});

export default router; 