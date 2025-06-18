import express from 'express';
import Term from '../models/Term.js';
import SchoolYear from '../models/SchoolYear.js';
import StudentAssignment from '../models/StudentAssignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';

const router = express.Router();

// Get all terms for a school year by its name
router.get('/schoolyear/:schoolYearName', async (req, res) => {
  try {
    const terms = await Term.find({ schoolYear: req.params.schoolYearName })
      .sort({ termName: 1 });
    res.json(terms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new term
router.post('/', async (req, res) => {
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
router.patch('/:termId/archive', async (req, res) => {
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
router.patch('/:id', async (req, res) => {
  try {
    const term = await Term.findById(req.params.id);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }
    if (req.body.status === 'active') {
      // Archive all other terms in the same school year
      await Term.updateMany(
        { schoolYear: term.schoolYear, _id: { $ne: term._id } },
        { status: 'archived' }
      );
      term.status = 'active';
    } else if (req.body.status) {
      term.status = req.body.status;
    }
    // Add other updatable fields if needed
    const updatedTerm = await term.save();
    res.json(updatedTerm);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a term by ID
router.get('/:id', async (req, res) => {
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

// Get the current active term
router.get('/active', async (req, res) => {
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

export default router; 