import express from 'express';
import Subject from '../models/Subject.js';

const router = express.Router();

// Get all subjects for a specific term
router.get('/term/:termId', async (req, res) => {
  try {
    const { termId } = req.params;
    const { schoolYear } = req.query;
    const filter = { termName: termId, status: 'active' };
    if (schoolYear) filter.schoolYear = schoolYear;
    const subjects = await Subject.find(filter);
    // Deduplicate by subjectName, trackName, strandName, gradeLevel, schoolYear, termName
    const unique = new Map();
    for (const s of subjects) {
      const key = `${s.subjectName}|${s.trackName}|${s.strandName}|${s.gradeLevel}|${s.schoolYear}|${s.termName}`;
      if (!unique.has(key)) unique.set(key, s);
    }
    res.json(Array.from(unique.values()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new subject
router.post('/', async (req, res) => {
  try {
    const { subjectName, trackName, strandName, gradeLevel, schoolYear, termName } = req.body;

    // Absolute uniqueness: check for any subject with the same name (case-insensitive)
    const existingSubject = await Subject.findOne({ subjectName: new RegExp(`^${subjectName}$`, 'i') });
    if (existingSubject) {
      return res.status(400).json({ message: 'Subject name must be unique across the system.' });
    }

    const subject = new Subject({
      subjectName,
      trackName,
      strandName,
      gradeLevel,
      schoolYear,
      termName
    });

    const savedSubject = await subject.save();
    res.status(201).json(savedSubject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a subject
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectName, trackName, strandName, gradeLevel, schoolYear, termName } = req.body;

    // Absolute uniqueness: check for any subject with the same name (case-insensitive), excluding current
    const existingSubject = await Subject.findOne({ subjectName: new RegExp(`^${subjectName}$`, 'i'), _id: { $ne: id } });
    if (existingSubject) {
      return res.status(400).json({ message: 'Subject name must be unique across the system.' });
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { subjectName, trackName, strandName, gradeLevel, schoolYear, termName },
      { new: true, runValidators: true }
    );

    if (!updatedSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json(updatedSubject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a subject
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSubject = await Subject.findByIdAndDelete(id);
    
    if (!deletedSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create subjects in bulk
router.post('/bulk', async (req, res) => {
  try {
    const { subjects } = req.body;

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: 'Invalid subjects data' });
    }

    // Validate all subjects have required fields
    const invalidSubjects = subjects.filter(subject => 
      !subject.subjectName || !subject.trackName || !subject.strandName || 
      !subject.gradeLevel || !subject.schoolYear || !subject.termName
    );
    
    if (invalidSubjects.length > 0) {
      return res.status(400).json({ message: 'Some subjects are missing required fields' });
    }

    // Check for duplicates within the uploaded data
    const subjectKeys = subjects.map(s => 
      `${s.subjectName.trim()}-${s.trackName.trim()}-${s.strandName.trim()}-${s.gradeLevel}-${s.termName}-${s.schoolYear}`
    );
    const uniqueSubjectKeys = new Set(subjectKeys);
    if (uniqueSubjectKeys.size !== subjectKeys.length) {
      return res.status(400).json({ message: 'Duplicate subjects found in the uploaded data' });
    }

    // Check for existing subjects
    const existingSubjects = await Subject.find({
      $or: subjects.map(subject => ({
        subjectName: subject.subjectName.trim(),
        trackName: subject.trackName.trim(),
        strandName: subject.strandName.trim(),
        gradeLevel: subject.gradeLevel,
        termName: subject.termName,
        schoolYear: subject.schoolYear
      }))
    });

    if (existingSubjects.length > 0) {
      const existingNames = existingSubjects.map(s => s.subjectName).join(', ');
      return res.status(400).json({ 
        message: `Some subjects already exist: ${existingNames}` 
      });
    }

    // Create all subjects
    const createdSubjects = await Subject.insertMany(
      subjects.map(subject => ({
        subjectName: subject.subjectName.trim(),
        trackName: subject.trackName.trim(),
        strandName: subject.strandName.trim(),
        gradeLevel: subject.gradeLevel,
        schoolYear: subject.schoolYear,
        termName: subject.termName,
        status: 'active'
      }))
    );

    res.status(201).json(createdSubjects);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Some subjects already exist in this term' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all subjects for a specific school year and term
router.get('/schoolyear/:schoolYear/term/:termName', async (req, res) => {
  try {
    const { schoolYear, termName } = req.params;
    const subjects = await Subject.find({ schoolYear, termName, status: 'active' });
    // Deduplicate by subjectName, trackName, strandName, gradeLevel, schoolYear, termName
    const unique = new Map();
    for (const s of subjects) {
      const key = `${s.subjectName}|${s.trackName}|${s.strandName}|${s.gradeLevel}|${s.schoolYear}|${s.termName}`;
      if (!unique.has(key)) unique.set(key, s);
    }
    res.json(Array.from(unique.values()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 