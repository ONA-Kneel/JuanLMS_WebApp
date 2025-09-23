import express from 'express';
import Quarter from '../models/Quarter.js';
import SchoolYear from '../models/SchoolYear.js';
import Term from '../models/Term.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Deprecated: Terms should keep admin-set dates. Quarters must fit inside term, but should not change term dates.
async function syncTermDateRange() { return; }

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
    // Validate term exists and quarter dates are within the term bounds
    const parentTerm = await Term.findOne({ schoolYear: schoolYearName, termName });
    if (!parentTerm) {
      return res.status(404).json({ message: `Parent term ${termName} not found in ${schoolYearName}` });
    }
    const qStart = new Date(startDate);
    const qEnd = new Date(endDate);
    if (qEnd <= qStart) {
      return res.status(400).json({ message: 'Quarter end date must be after start date' });
    }
    if (qStart < new Date(parentTerm.startDate) || qEnd > new Date(parentTerm.endDate)) {
      return res.status(400).json({ message: `Quarter dates must be within ${termName} (${new Date(parentTerm.startDate).toLocaleDateString()} - ${new Date(parentTerm.endDate).toLocaleDateString()}).` });
    }
    
    // Check if quarter already exists for this school year and term
    const existingQuarter = await Quarter.findOne({
      schoolYear: schoolYearName,
      quarterName,
      termName
    });
    
    if (existingQuarter) {
      return res.status(409).json({ message: `${quarterName} already exists for ${termName}` });
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
    // Do not sync term date range from quarters

    // If status is being set to active, enforce consistency across terms/quarters
    if (status === 'active') {
      const schoolYearName = updatedQuarter.schoolYear;
      const parentTermName = updatedQuarter.termName;

      // Activate parent term and archive other terms in the same school year
      await Term.updateMany(
        { schoolYear: schoolYearName, termName: { $ne: parentTermName } },
        { status: 'archived' }
      );
      await Term.updateMany(
        { schoolYear: schoolYearName, termName: parentTermName },
        { status: 'active' }
      );

      // Inactivate any active quarters from other terms in the same SY
      await Quarter.updateMany(
        {
          schoolYear: schoolYearName,
          termName: { $ne: parentTermName },
          status: 'active'
        },
        { $set: { status: 'inactive' } }
      );

      // Ensure only this quarter is active within its term
      await Quarter.updateMany(
        {
          _id: { $ne: updatedQuarter._id },
          schoolYear: schoolYearName,
          termName: parentTermName,
          status: 'active'
        },
        { $set: { status: 'inactive' } }
      );
    }

    // If quarter is being set to inactive and its term is active,
    // ensure that there remains exactly one active quarter for that term.
    if (status === 'inactive') {
      const schoolYearName = updatedQuarter.schoolYear;
      const parentTermName = updatedQuarter.termName;
      const parentTerm = await Term.findOne({ schoolYear: schoolYearName, termName: parentTermName });

      if (parentTerm && parentTerm.status === 'active') {
        const stillActive = await Quarter.findOne({
          _id: { $ne: updatedQuarter._id },
          schoolYear: schoolYearName,
          termName: parentTermName,
          status: 'active'
        });

        if (!stillActive) {
          // Try to activate the earliest remaining non-archived quarter
          const candidate = await Quarter.find({
            _id: { $ne: updatedQuarter._id },
            schoolYear: schoolYearName,
            termName: parentTermName,
            status: { $ne: 'archived' }
          }).sort({ startDate: 1 }).limit(1);

          if (candidate && candidate.length > 0) {
            await Quarter.findByIdAndUpdate(candidate[0]._id, { status: 'active' });
          } else {
            // No remaining quarters → set term inactive to maintain invariant
            await Term.updateMany(
              { schoolYear: schoolYearName, termName: parentTermName },
              { status: 'inactive' }
            );
          }
        }
      }
    }
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
    // Do not sync term date range from quarters
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
    // Do not sync term date range from quarters
    res.json({ message: 'Quarter deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
