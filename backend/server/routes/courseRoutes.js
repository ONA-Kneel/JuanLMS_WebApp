import express from 'express';
import Course from '../models/Course.js';
import Program from '../models/Program.js'; // Needed for validation if program exists

const router = express.Router();

// GET all courses, populating program details
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().populate('program', 'programName status').sort({ courseName: 1 });
    // We populate 'program' and select only 'programName' and 'status' fields from the Program document
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
});

// POST a new course
router.post('/', async (req, res) => {
  const { courseName, program } = req.body; // program should be the ObjectId of the program

  if (!courseName || !program) {
    return res.status(400).json({ message: 'Missing required fields: courseName, program.' });
  }

  try {
    // Optional: Validate if the program ObjectId actually exists
    const programExists = await Program.findById(program);
    if (!programExists) {
      return res.status(404).json({ message: 'Program not found. Cannot create course.' });
    }

    const newCourse = new Course({
      courseName,
      program, // Store the ObjectId
    });
    await newCourse.save();
    // Populate program details for the response of the newly created course
    const populatedCourse = await Course.findById(newCourse._id).populate('program', 'programName status');
    res.status(201).json(populatedCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', error: error.message });
    }
    // Add more specific error handling if needed (e.g., for unique constraints if you add them)
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
});

export default router; 