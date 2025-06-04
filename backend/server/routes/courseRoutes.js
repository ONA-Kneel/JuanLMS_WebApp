import express from 'express';
import Course from '../models/Course.js';
import Program from '../models/Program.js';
import Section from '../models/Section.js';
import User from '../models/User.js';

const router = express.Router();

// GET all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().sort({ courseName: 1 });
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
});

// POST a new course
router.post('/', async (req, res) => {
  const { courseName, programName } = req.body;

  if (!courseName || !programName) {
    return res.status(400).json({ message: 'Missing required fields: courseName, programName.' });
  }

  try {
    // Validate if the program exists
    const programExists = await Program.findOne({ programName });
    if (!programExists) {
      return res.status(404).json({ message: 'Program not found. Cannot create course.' });
    }

    const newCourse = new Course({
      courseName,
      programName
    });
    
    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', error: error.message });
    }
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
});

// PATCH/Update a course
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { courseName, programName } = req.body;

    // Validate required fields
    if (!courseName || !programName) {
      return res.status(400).json({ message: 'Missing required fields: courseName, programName.' });
    }

    // Validate if the program exists
    const programExists = await Program.findOne({ programName });
    if (!programExists) {
      return res.status(404).json({ message: 'Program not found. Cannot update course.' });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { courseName, programName },
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
});

// DELETE a course
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First check if the course exists
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check for dependencies in sections
    const hasSections = await Section.exists({ courseName: course.courseName });
    if (hasSections) {
      return res.status(400).json({ 
        message: 'Cannot delete course with associated sections. Please delete the sections first.' 
      });
    }

    // Check for dependencies in users (faculty)
    const hasFaculty = await User.exists({ 
      $and: [
        { role: "faculty" },
        {
          $or: [
            { courseAssigned: id },
            { programAssigned: { $exists: true }, courseAssigned: id }
          ]
        }
      ]
    });
    if (hasFaculty) {
      return res.status(400).json({ 
        message: 'Cannot delete course with assigned faculty members. Please remove faculty assignments first.' 
      });
    }

    // Check for dependencies in users (students)
    const hasStudents = await User.exists({ 
      role: "students",
      courseAssigned: id 
    });
    if (hasStudents) {
      return res.status(400).json({ 
        message: 'Cannot delete course with assigned students. Please remove student assignments first.' 
      });
    }

    const deletedCourse = await Course.findByIdAndDelete(id);
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ message: 'Error deleting course', error: error.message });
  }
});

export default router; 