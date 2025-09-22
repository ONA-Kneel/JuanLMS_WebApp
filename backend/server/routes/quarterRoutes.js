import express from 'express';
import Quarter from '../models/Quarter.js';
import SchoolYear from '../models/SchoolYear.js';
import Term from '../models/Term.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all quarters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const quarters = await Quarter.find().sort({ schoolYear: -1, termName: 1, quarterName: 1 });
    res.json(quarters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all quarters for a school year by its name
router.get('/schoolyear/:schoolYearName', authenticateToken, async (req, res) => {
  try {
    const { schoolYearName } = req.params;
    const quarters = await Quarter.find({ schoolYear: schoolYearName }).sort({ termName: 1, quarterName: 1 });
    res.json(quarters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get quarters by school year ID
router.get('/schoolyear-id/:schoolYearId', authenticateToken, async (req, res) => {
  try {
    const { schoolYearId } = req.params;
    const schoolYear = await SchoolYear.findById(schoolYearId);
    if (!schoolYear) {
      return res.status(404).json({ message: 'School year not found' });
    }
    
    const schoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;
    const quarters = await Quarter.find({ schoolYear: schoolYearName }).sort({ termName: 1, quarterName: 1 });
    res.json(quarters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single quarter
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const quarter = await Quarter.findById(req.params.id);
    if (!quarter) {
      return res.status(404).json({ message: 'Quarter not found' });
    }
    res.json(quarter);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new quarter
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { schoolYearId, quarterName, termName, startDate, endDate } = req.body;
    
    // Get school year to get the school year name
    const schoolYear = await SchoolYear.findById(schoolYearId);
    if (!schoolYear) {
      return res.status(404).json({ message: 'School year not found' });
    }
    
    const schoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;
    
    // Check if quarter already exists for this school year and term
    const existingQuarter = await Quarter.findOne({
      schoolYear: schoolYearName,
      quarterName,
      termName
    });
    
    if (existingQuarter) {
      return res.status(400).json({ message: `${quarterName} already exists for ${termName}` });
    }
    
    const quarter = new Quarter({
      quarterName,
      schoolYear: schoolYearName,
      termName,
      startDate,
      endDate
    });
    
    const savedQuarter = await quarter.save();
    res.status(201).json(savedQuarter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a quarter
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { quarterName, termName, startDate, endDate, status } = req.body;
    
    const quarter = await Quarter.findById(req.params.id);
    if (!quarter) {
      return res.status(404).json({ message: 'Quarter not found' });
    }
    
    // If updating quarter name or term, check for duplicates
    if (quarterName || termName) {
      const existingQuarter = await Quarter.findOne({
        _id: { $ne: req.params.id },
        schoolYear: quarter.schoolYear,
        quarterName: quarterName || quarter.quarterName,
        termName: termName || quarter.termName
      });
      
      if (existingQuarter) {
        return res.status(400).json({ message: 'Quarter already exists for this term' });
      }
    }
    
    const updatedQuarter = await Quarter.findByIdAndUpdate(
      req.params.id,
      { quarterName, termName, startDate, endDate, status },
      { new: true, runValidators: true }
    );
    
    res.json(updatedQuarter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Archive a quarter
router.patch('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const quarter = await Quarter.findById(req.params.id);
    if (!quarter) {
      return res.status(404).json({ message: 'Quarter not found' });
    }
    
    const updatedQuarter = await Quarter.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );
    
    res.json(updatedQuarter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a quarter
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const quarter = await Quarter.findById(req.params.id);
    if (!quarter) {
      return res.status(404).json({ message: 'Quarter not found' });
    }
    
    await Quarter.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quarter deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
