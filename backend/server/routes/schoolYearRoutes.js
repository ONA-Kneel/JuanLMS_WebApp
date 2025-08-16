import express from 'express';
import SchoolYear from '../models/SchoolYear.js';
import StudentAssignment from '../models/StudentAssignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Term from '../models/Term.js';

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
    
    // If the school year was created as inactive, automatically archive it and its terms/assignments
    if (!setAsActive) {
      savedYear.status = 'archived';
      await savedYear.save();
      
      const schoolYearName = `${savedYear.schoolYearStart}-${savedYear.schoolYearEnd}`;
      // Archive all terms for this school year
      await Term.updateMany({ schoolYear: schoolYearName }, { status: 'archived' });
      await StudentAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } });
      await FacultyAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } });
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
      } else if (req.body.status === 'inactive') {
        // When setting school year to inactive, automatically archive it and its terms/assignments
        schoolYear.status = 'archived';
        
        const schoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;
        // Archive all terms for this school year
        await Term.updateMany({ schoolYear: schoolYearName }, { status: 'archived' });
        await StudentAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } });
        await FacultyAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } });
      } else {
        schoolYear.status = req.body.status;
      }
      
      // Archive all terms and assignments for this school year if archiving
      if (req.body.status === 'archived') {
        const schoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;
        // Archive all terms for this school year
        await Term.updateMany({ schoolYear: schoolYearName }, { status: 'archived' });
        await StudentAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } });
        await FacultyAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } });
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

export default router; 