import express from 'express';
import SchoolYear from '../models/SchoolYear.js';
import StudentAssignment from '../models/StudentAssignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Term from '../models/Term.js';
import Track from '../models/Track.js';
import Strand from '../models/Strand.js';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';

const router = express.Router();

// Get all school years
router.get('/', async (req, res) => {
  try {
    const schoolYears = await SchoolYear.find().sort({ schoolYearStart: -1 });
    res.json(schoolYears);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new school year
// router.post('/', async (req, res) => {
//   try {
//     const { schoolYearStart } = req.body;
    
//     // Validate start year
//     if (!schoolYearStart || schoolYearStart < 1900 || schoolYearStart > 2100) {
//       return res.status(400).json({ message: 'Invalid school year start' });
//     }

//     // Check if a school year with this start year already exists
//     const existingSchoolYear = await SchoolYear.findOne({ schoolYearStart });
//     if (existingSchoolYear) {
//       return res.status(400).json({ message: 'A school year with this start year already exists.' });
//     }

//     // Deactivate all existing school years before creating a new active one
//     await SchoolYear.updateMany({}, { status: 'inactive' });

//     const schoolYear = new SchoolYear({
//       schoolYearStart,
//       schoolYearEnd: schoolYearStart + 1,
//       status: 'active' // Automatically set to active
//     });

//     const newSchoolYear = await schoolYear.save();
//     res.status(201).json(newSchoolYear);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// });

router.post('/', async (req, res) => {
  try {
    const { schoolYearStart, setAsActive } = req.body;

    // Basic validation
    if (!schoolYearStart || schoolYearStart < 1900 || schoolYearStart > 2100) {
      return res.status(400).json({ message: 'Invalid school year start' });
    }

    // Check for duplicates
    const existing = await SchoolYear.findOne({ schoolYearStart });
    if (existing) {
      return res.status(400).json({ message: 'A school year with this start already exists.' });
    }

    // Deactivate all existing school years if setAsActive is true
    if (setAsActive) {
      await SchoolYear.updateMany({ status: 'active' }, { status: 'inactive' });
    }

    const schoolYear = new SchoolYear({
      schoolYearStart,
      schoolYearEnd: schoolYearStart + 1,
      status: setAsActive ? 'active' : 'inactive'
    });

    const savedYear = await schoolYear.save();

    // If creating as inactive, archive any existing terms for this school year
    if (!setAsActive) {
      const schoolYearName = `${schoolYearStart}-${schoolYearStart + 1}`;
      await Term.updateMany({ schoolYear: schoolYearName }, { status: 'archived' });
    }

    res.status(201).json(savedYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update school year status or details
router.patch('/:id', async (req, res) => {
  try {
    const schoolYear = await SchoolYear.findById(req.params.id);
    if (!schoolYear) {
      return res.status(404).json({ message: 'School year not found' });
    }

    // Prevent editing of inactive school years (except for status changes)
    if (schoolYear.status === 'inactive' && req.body.schoolYearStart) {
      return res.status(403).json({ 
        message: 'Cannot edit details of an inactive school year. Only status changes are allowed.' 
      });
    }

    // Handle school year start year update
    if (req.body.schoolYearStart) {
      const newStartYear = parseInt(req.body.schoolYearStart);
      
      // Validate the new start year
      if (newStartYear < 1900 || newStartYear > 2100) {
        return res.status(400).json({ message: 'Invalid school year start' });
      }

      // Check for duplicates (excluding the current school year being edited and archived ones)
      const existingSchoolYear = await SchoolYear.findOne({ 
        schoolYearStart: newStartYear,
        status: { $ne: 'archived' },
        _id: { $ne: req.params.id }
      });
      
      if (existingSchoolYear) {
        return res.status(400).json({ message: 'A school year with this start year already exists' });
      }

      // Update the school year start and end
      schoolYear.schoolYearStart = newStartYear;
      schoolYear.schoolYearEnd = newStartYear + 1;
    }

    // Handle status update
    if (req.body.status) {
      // If setting to active, deactivate all others
      if (req.body.status === 'active') {
        await SchoolYear.updateMany(
          { _id: { $ne: req.params.id }, status: 'active' },
          { status: 'inactive' }
        );
        // Do not activate any terms automatically
        // Instead, return the list of terms for this school year in the response
        schoolYear.status = req.body.status;
        const updatedSchoolYear = await schoolYear.save();
        const schoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;
        const terms = await Term.find({ schoolYear: schoolYearName });
        return res.json({ schoolYear: updatedSchoolYear, terms });
      }
      
      schoolYear.status = req.body.status;

      // Archive all terms and related entities for this school year if archiving or inactivating
      if (req.body.status === 'archived' || req.body.status === 'inactive') {
        const schoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;
        console.log(`Archiving all entities for school year: ${schoolYearName}`);
        
        await Promise.all([
          // Archive all terms for this school year
          Term.updateMany({ schoolYear: schoolYearName }, { status: 'archived' }),
          
          // Archive all assignments for this school year
          StudentAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } }),
          FacultyAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } }),
          
          // Archive all structural entities for this school year
          Track.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } }),
          Strand.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } }),
          Section.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } }),
          Subject.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } })
        ]);
        
        console.log(`Successfully archived all entities for school year: ${schoolYearName}`);
      }
    }

    const updatedSchoolYear = await schoolYear.save();
    res.json(updatedSchoolYear);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get active school year
router.get('/active', async (req, res) => {
  try {
    const activeSchoolYear = await SchoolYear.findOne({ status: 'active' });
    res.json(activeSchoolYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current school year (alias for active)
router.get('/current', async (req, res) => {
  try {
    const activeSchoolYear = await SchoolYear.findOne({ status: 'active' });
    if (!activeSchoolYear) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active school year found' 
      });
    }
    res.json({
      success: true,
      schoolYear: activeSchoolYear
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Check school year dependencies before deletion
router.get('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    const schoolYear = await SchoolYear.findById(id);
    
    if (!schoolYear) {
      return res.status(404).json({ message: 'School year not found' });
    }

    const schoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;

    // Check all dependencies
    const [terms, tracks, strands, sections, subjects, studentAssignments, facultyAssignments] = await Promise.all([
      Term.find({ schoolYear: schoolYearName }),
      Track.find({ schoolYear: schoolYearName }),
      Strand.find({ schoolYear: schoolYearName }),
      Section.find({ schoolYear: schoolYearName }),
      Subject.find({ schoolYear: schoolYearName }),
      StudentAssignment.find({ schoolYear: schoolYearName }),
      FacultyAssignment.find({ schoolYear: schoolYearName })
    ]);

    const dependencies = {
      schoolYear: schoolYear,
      terms: terms,
      tracks: tracks,
      strands: strands,
      sections: sections,
      subjects: subjects,
      studentAssignments: studentAssignments,
      facultyAssignments: facultyAssignments,
      totalConnections: terms.length + tracks.length + strands.length + sections.length + subjects.length + studentAssignments.length + facultyAssignments.length
    };

    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a school year and all its dependencies
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmCascade } = req.query;
    
    const schoolYear = await SchoolYear.findById(id);
    if (!schoolYear) {
      return res.status(404).json({ message: 'School year not found' });
    }

    // If cascade confirmation is not provided, check dependencies first
    if (!confirmCascade) {
      const dependencies = await Promise.all([
        Term.countDocuments({ schoolYear: `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}` }),
        Track.countDocuments({ schoolYear: `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}` }),
        Strand.countDocuments({ schoolYear: `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}` }),
        Section.countDocuments({ schoolYear: `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}` }),
        Subject.countDocuments({ schoolYear: `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}` }),
        StudentAssignment.countDocuments({ schoolYear: `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}` }),
        FacultyAssignment.countDocuments({ schoolYear: `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}` })
      ]);

      const totalDependencies = dependencies.reduce((sum, count) => sum + count, 0);
      
      if (totalDependencies > 0) {
        return res.status(409).json({ 
          message: `Cannot delete school year: It has ${totalDependencies} connected records. Use confirmCascade=true to delete all connected data.`,
          dependencyCount: totalDependencies,
          schoolYear: schoolYear
        });
      }
    }

    // Proceed with cascading deletion using the model's pre-remove middleware
    console.log(`Deleting school year: ${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`);
    
    // Use remove() to trigger the pre-remove middleware for cascading deletes
    await schoolYear.remove();
    
    console.log(`Successfully deleted school year and all connected data`);
    res.json({ message: 'School year and all connected data deleted successfully' });
  } catch (error) {
    console.error('Error deleting school year:', error);
    res.status(500).json({ message: error.message });
  }
});

// Archive a school year (keep the existing PATCH endpoint for archiving)
router.patch('/:id/archive', async (req, res) => {
  try {
    const schoolYear = await SchoolYear.findById(req.params.id);
    if (!schoolYear) {
      return res.status(404).json({ message: 'School year not found' });
    }

    // Prevent archiving inactive school years
    if (schoolYear.status === 'inactive') {
      return res.status(403).json({ 
        message: 'Cannot archive inactive school years. Only active school years can be archived.' 
      });
    }

    schoolYear.status = 'archived';
    const updatedSchoolYear = await schoolYear.save();
    
    // Archive all related entities for this school year
    const schoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;
    console.log(`Archiving all entities for school year: ${schoolYearName}`);
    
    await Promise.all([
      // Archive all terms for this school year
      Term.updateMany({ schoolYear: schoolYearName }, { status: 'archived' }),
      
      // Archive all assignments for this school year
      StudentAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } }),
      FacultyAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } }),
      
      // Archive all structural entities for this school year
      Track.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } }),
      Strand.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } }),
      Section.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } }),
      Subject.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } })
    ]);
    
    console.log(`Successfully archived all entities for school year: ${schoolYearName}`);
    res.json(updatedSchoolYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 