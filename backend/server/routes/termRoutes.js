import express from 'express';
import Term from '../models/Term.js';
import SchoolYear from '../models/SchoolYear.js';
import StudentAssignment from '../models/StudentAssignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';
import Track from '../models/Track.js';
import Strand from '../models/Strand.js';
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

    // Prevent creating terms for inactive school years
    if (schoolYear.status === 'inactive') {
      return res.status(403).json({ 
        message: 'Cannot create terms for an inactive school year. Please activate the school year first.' 
      });
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

    // Enforce a maximum of 2 terms per school year (any status)
    const totalTermsCount = existingTerms.length;
    if (totalTermsCount >= 2) {
      return res.status(400).json({
        message: 'This school year already has 2 terms. You cannot add another.'
      });
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

    // Archive all related entities for this term
    console.log(`Archiving all entities for term: ${term.termName} (${term.schoolYear})`);
    
    await Promise.all([
      // Archive assignments
      StudentAssignment.updateMany({ termId: term._id }, { $set: { status: 'archived' } }),
      FacultyAssignment.updateMany({ termId: term._id }, { $set: { status: 'archived' } }),
      
      // Archive structural entities by schoolYear and termName
      Track.updateMany(
        { schoolYear: term.schoolYear, termName: term.termName }, 
        { $set: { status: 'archived' } }
      ),
      Strand.updateMany(
        { schoolYear: term.schoolYear, termName: term.termName }, 
        { $set: { status: 'archived' } }
      ),
      Section.updateMany(
        { schoolYear: term.schoolYear, termName: term.termName }, 
        { $set: { status: 'archived' } }
      ),
      Subject.updateMany(
        { schoolYear: term.schoolYear, termName: term.termName }, 
        { $set: { status: 'archived' } }
      )
    ]);
    
    console.log(`Successfully archived all entities for term: ${term.termName}`);
    
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

    // Check if the school year is inactive and prevent editing
    const schoolYearName = term.schoolYear;
    const [startYear, endYear] = schoolYearName.split('-');
    const schoolYear = await SchoolYear.findOne({ 
      schoolYearStart: parseInt(startYear), 
      schoolYearEnd: parseInt(endYear) 
    });

    if (schoolYear && schoolYear.status === 'inactive') {
      return res.status(403).json({ 
        message: 'Cannot edit terms of an inactive school year. Only status changes are allowed.' 
      });
    }

    // Handle status updates
    if (req.body.status === 'active') {
      // Archive other terms in the same school year only
      await Term.updateMany(
        { _id: { $ne: term._id }, schoolYear: term.schoolYear },
        { status: 'archived' }
      );
      
      term.status = 'active';
      
      // Reactivate all related entities for this term
      console.log(`Reactivating all entities for term: ${term.termName} (${term.schoolYear})`);
      
      await Promise.all([
        // Reactivate assignments
        StudentAssignment.updateMany(
          { termId: term._id }, 
          { $set: { status: 'active' } }
        ),
        FacultyAssignment.updateMany(
          { termId: term._id }, 
          { $set: { status: 'active' } }
        ),
        
        // Reactivate structural entities by schoolYear and termName
        Track.updateMany(
          { schoolYear: term.schoolYear, termName: term.termName }, 
          { $set: { status: 'active' } }
        ),
        Strand.updateMany(
          { schoolYear: term.schoolYear, termName: term.termName }, 
          { $set: { status: 'active' } }
        ),
        Section.updateMany(
          { schoolYear: term.schoolYear, termName: term.termName }, 
          { $set: { status: 'active' } }
        ),
        Subject.updateMany(
          { schoolYear: term.schoolYear, termName: term.termName }, 
          { $set: { status: 'active' } }
        )
      ]);
      
      console.log(`Successfully reactivated all entities for term: ${term.termName}`);
      
    } else if (req.body.status === 'archived') {
      term.status = 'archived';
      
      // Archive all related entities for this term (same logic as archive endpoint)
      console.log(`Archiving all entities for term: ${term.termName} (${term.schoolYear})`);
      
      await Promise.all([
        // Archive assignments
        StudentAssignment.updateMany({ termId: term._id }, { $set: { status: 'archived' } }),
        FacultyAssignment.updateMany({ termId: term._id }, { $set: { status: 'archived' } }),
        
        // Archive structural entities by schoolYear and termName
        Track.updateMany(
          { schoolYear: term.schoolYear, termName: term.termName }, 
          { $set: { status: 'archived' } }
        ),
        Strand.updateMany(
          { schoolYear: term.schoolYear, termName: term.termName }, 
          { $set: { status: 'archived' } }
        ),
        Section.updateMany(
          { schoolYear: term.schoolYear, termName: term.termName }, 
          { $set: { status: 'archived' } }
        ),
        Subject.updateMany(
          { schoolYear: term.schoolYear, termName: term.termName }, 
          { $set: { status: 'archived' } }
        )
      ]);
      
      console.log(`Successfully archived all entities for term: ${term.termName}`);
      
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
      termName: term.termName
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

// Check term dependencies before deletion
router.get('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    const term = await Term.findById(id);
    
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    // Check all dependencies
    const [tracks, strands, sections, subjects, studentAssignments, facultyAssignments] = await Promise.all([
      Track.find({ schoolYear: term.schoolYear, termName: term.termName }),
      Strand.find({ schoolYear: term.schoolYear, termName: term.termName }),
      Section.find({ schoolYear: term.schoolYear, termName: term.termName }),
      Subject.find({ schoolYear: term.schoolYear, termName: term.termName }),
      StudentAssignment.find({ termId: term._id }),
      FacultyAssignment.find({ termId: term._id })
    ]);

    const dependencies = {
      term: term,
      tracks: tracks,
      strands: strands,
      sections: sections,
      subjects: subjects,
      studentAssignments: studentAssignments,
      facultyAssignments: facultyAssignments,
      totalConnections: tracks.length + strands.length + sections.length + subjects.length + studentAssignments.length + facultyAssignments.length
    };

    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a term and all its dependencies
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmCascade } = req.query;
    
    const term = await Term.findById(id);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    // If cascade confirmation is not provided, check dependencies first
    if (!confirmCascade) {
      const dependencies = await Promise.all([
        Track.countDocuments({ schoolYear: term.schoolYear, termName: term.termName }),
        Strand.countDocuments({ schoolYear: term.schoolYear, termName: term.termName }),
        Section.countDocuments({ schoolYear: term.schoolYear, termName: term.termName }),
        Subject.countDocuments({ schoolYear: term.schoolYear, termName: term.termName }),
        StudentAssignment.countDocuments({ termId: term._id }),
        FacultyAssignment.countDocuments({ termId: term._id })
      ]);

      const totalDependencies = dependencies.reduce((sum, count) => sum + count, 0);
      
      if (totalDependencies > 0) {
        return res.status(409).json({ 
          message: `Cannot delete term: It has ${totalDependencies} connected records. Use confirmCascade=true to delete all connected data.`,
          dependencyCount: totalDependencies,
          term: term
        });
      }
    }

    // Proceed with cascading deletion using the model's pre-remove middleware
    console.log(`Deleting term: ${term.termName} (${term.schoolYear})`);
    
    // Use remove() to trigger the pre-remove middleware for cascading deletes
    await term.remove();
    
    console.log(`Successfully deleted term and all connected data`);
    res.json({ message: 'Term and all connected data deleted successfully' });
  } catch (error) {
    console.error('Error deleting term:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router; 