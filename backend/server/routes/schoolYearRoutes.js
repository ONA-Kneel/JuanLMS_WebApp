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
    res.status(201).json(savedYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update school year status
router.patch('/:id', async (req, res) => {
  try {
    const schoolYear = await SchoolYear.findById(req.params.id);
    if (!schoolYear) {
      return res.status(404).json({ message: 'School year not found' });
    }

    // If setting to active, deactivate all others
    if (req.body.status === 'active') {
      await SchoolYear.updateMany(
        { _id: { $ne: req.params.id }, status: 'active' },
        { status: 'inactive' }
      );
    }
    
    schoolYear.status = req.body.status;
    const updatedSchoolYear = await schoolYear.save();

    // Archive all terms and assignments for this school year if archiving
    if (req.body.status === 'archived' || req.body.status === 'inactive') {
      const schoolYearName = `${schoolYear.schoolYearStart}-${schoolYear.schoolYearEnd}`;
      await Term.updateMany({ schoolYear: schoolYearName }, { status: 'archived' });
      await StudentAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } });
      await FacultyAssignment.updateMany({ schoolYear: schoolYearName }, { $set: { status: 'archived' } });
    }

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

export default router; 