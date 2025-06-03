import express from 'express';
import SchoolYear from '../models/SchoolYear.js'; // Adjust path as needed

const router = express.Router();

// GET all school years
router.get('/', async (req, res) => {
  try {
    const schoolYears = await SchoolYear.find().sort({ startYear: -1 }); // Sort by startYear descending
    res.status(200).json(schoolYears);
  } catch (error) {
    console.error("Error fetching school years:", error);
    res.status(500).json({ message: 'Error fetching school years', error: error.message });
  }
});

// POST a new school year
router.post('/', async (req, res) => {
  const { startYear, endYear, status } = req.body;

  if (!startYear || !endYear || !status) {
    return res.status(400).json({ message: 'Missing required fields: startYear, endYear, status.' });
  }

  try {
    const newSchoolYear = new SchoolYear({
      startYear: parseInt(startYear),
      endYear: parseInt(endYear),
      status,
    });
    await newSchoolYear.save();
    res.status(201).json(newSchoolYear);
  } catch (error) {
    console.error("Error creating school year:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', error: error.message });
    }
    res.status(500).json({ message: 'Error creating school year', error: error.message });
  }
});

export default router; 