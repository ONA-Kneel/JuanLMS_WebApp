import express from 'express';
import Term from '../models/Term.js';
import SchoolYear from '../models/SchoolYear.js';
import StudentAssignment from '../models/StudentAssignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Section from '../models/Section.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all terms
router.get('/', authenticateToken, async (req, res) => {
  try {
    const terms = await Term.find().sort({ schoolYear: -1, termName: 1 });
    res.json(terms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all terms for a school year by its name
router.get('/schoolyear/:schoolYearName', authenticateToken, async (req, res) => {
  try {
    const terms = await Term.find({ schoolYear: req.params.schoolYearName })
      .sort({ termName: 1 });
    res.json(terms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new term
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { schoolYearId, startDate, endDate } = req.body;

    // Get the school year (using ID for lookup to get name for new term)
    const schoolYear = await SchoolYear.findById(schoolYearId);
    if (!schoolYear) {
      return res.status(404).json({ message: 'School year not found' });
    }

    const fullSchoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;

    // Get all terms for this school year (by name)
    const existingTerms = await Term.find({ schoolYear: fullSchoolYearName }).sort({ termName: 1 });
    
    // Check if there's a previous term that's still active
    if (existingTerms.length > 0) {
      const lastTerm = existingTerms[existingTerms.length - 1];
      if (lastTerm.status === 'active') {
        return res.status(400).json({ 
          message: 'Cannot create a new term while the previous term is still active. Please archive the current term first.' 
        });
      }
    }

    // Check for overlapping terms before creating new one
    const overlappingTerms = await Term.find({
      schoolYear: fullSchoolYearName,
      status: { $ne: 'archived' }, // Only check active/inactive terms
      $or: [
        // New term starts during an existing term
        {
          startDate: { $lte: startDate },
          endDate: { $gt: startDate }
        },
        // New term ends during an existing term
        {
          startDate: { $lt: endDate },
          endDate: { $gte: endDate }
        },
        // New term completely contains an existing term
        {
          startDate: { $gte: startDate },
          endDate: { $lte: endDate }
        }
      ]
    });

    if (overlappingTerms.length > 0) {
      const overlappingTermNames = overlappingTerms.map(t => t.termName).join(', ');
      return res.status(400).json({ 
        message: `Term dates overlap with existing terms: ${overlappingTermNames}. Please choose different dates.` 
      });
    }

    // Create new term with simple numbering and school year name
    const term = new Term({
      termName: `Term ${existingTerms.length + 1}`,
      schoolYear: fullSchoolYearName,
      startDate,
      endDate,
      status: 'active'
    });

    // If this is the first term, ensure previous terms for this school year are archived (by name)
    if (existingTerms.length === 0) {
      await Term.updateMany(
        { schoolYear: fullSchoolYearName },
        { status: 'archived' }
      );
    }

    const newTerm = await term.save();
    res.status(201).json(newTerm);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Archive a term
router.patch('/:termId/archive', authenticateToken, async (req, res) => {
  try {
    const term = await Term.findById(req.params.termId);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    term.status = 'archived';
    await term.save();

    // Archive all assignments for this term
    await StudentAssignment.updateMany({ termId: term._id }, { $set: { status: 'archived' } });
    await FacultyAssignment.updateMany({ termId: term._id }, { $set: { status: 'archived' } });
    
    res.json(term);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add this endpoint after the archive endpoint
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const term = await Term.findById(req.params.id);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    // Handle status updates
    if (req.body.status === 'active') {
      // Archive other terms in the same school year only
      await Term.updateMany(
        { _id: { $ne: term._id }, schoolYear: term.schoolYear },
        { status: 'archived' }
      );
      term.status = 'active';
    } else if (req.body.status) {
      term.status = req.body.status;
    }

    // Handle date updates
    if (req.body.startDate) {
      term.startDate = new Date(req.body.startDate);
    }
    if (req.body.endDate) {
      term.endDate = new Date(req.body.endDate);
    }

    // Validate dates if both are provided
    if (req.body.startDate && req.body.endDate) {
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      
      if (endDate <= startDate) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }

      // Check for overlapping terms in the same school year
      const overlappingTerms = await Term.find({
        _id: { $ne: term._id }, // Exclude current term being edited
        schoolYear: term.schoolYear,
        status: { $ne: 'archived' }, // Only check active/inactive terms
        $or: [
          // New term starts during an existing term
          {
            startDate: { $lte: startDate },
            endDate: { $gt: startDate }
          },
          // New term ends during an existing term
          {
            startDate: { $lt: endDate },
            endDate: { $gte: endDate }
          },
          // New term completely contains an existing term
          {
            startDate: { $gte: startDate },
            endDate: { $lte: endDate }
          }
        ]
      });

      if (overlappingTerms.length > 0) {
        const overlappingTermNames = overlappingTerms.map(t => t.termName).join(', ');
        return res.status(400).json({ 
          message: `Term dates overlap with existing terms: ${overlappingTermNames}. Please choose different dates.` 
        });
      }
    }

    const updatedTerm = await term.save();
    res.json(updatedTerm);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a term by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const term = await Term.findById(req.params.id);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }
    res.json(term);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get sections for a specific term by ID
router.get('/:id/sections', authenticateToken, async (req, res) => {
  try {
    const term = await Term.findById(req.params.id);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    // Find sections that match the term's school year and term name
    const sections = await Section.find({
      schoolYear: term.schoolYear,
      termName: term.termName,
      status: 'active'
    }).sort({ sectionName: 1 });

    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get the current active term
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const activeTerm = await Term.findOne({ status: 'active' });
    if (!activeTerm) {
      return res.status(404).json({ message: 'No active term found' });
    }
    res.json(activeTerm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current term (alias for active)
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const activeTerm = await Term.findOne({ status: 'active' });
    if (!activeTerm) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active term found' 
      });
    }
    res.json({
      success: true,
      term: activeTerm
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

export default router; 