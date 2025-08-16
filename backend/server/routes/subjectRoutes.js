import express from 'express';
import Subject from '../models/Subject.js';
import Term from '../models/Term.js';
import FacultyAssignment from '../models/FacultyAssignment.js';

const router = express.Router();

// Get all subjects for a specific term by term name (keeping for backward compatibility)
router.get('/term/:termName', async (req, res) => {
  try {
    const { termName } = req.params;
    const { schoolYear } = req.query;
    const filter = { termName: termName };
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

// Get all subjects for a specific term by term ID (more precise)
router.get('/termId/:termId', async (req, res) => {
  try {
    const { termId } = req.params;
    
    // First get the term details to get schoolYear and termName
    const term = await Term.findById(termId);
    
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }
    
    // Get subjects for this specific school year and term, regardless of status
    const subjects = await Subject.find({ 
      schoolYear: term.schoolYear, 
      termName: term.termName 
    });
    
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

    // Check for existing subject with same combination (using the compound unique index)
    const existingSubject = await Subject.findOne({ 
      subjectName: new RegExp(`^${subjectName}$`, 'i'),
      trackName,
      strandName,
      gradeLevel,
      termName,
      schoolYear
    });
    if (existingSubject) {
      return res.status(400).json({ message: 'Subject already exists in this track, strand, grade, term, and school year.' });
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
    if (error.code === 11000) {
      // Duplicate key error from the compound unique index
      res.status(400).json({ message: 'Subject already exists in this track, strand, grade, term, and school year.' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

// Update a subject
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectName, trackName, strandName, gradeLevel, schoolYear, termName } = req.body;

    // Check for existing subject with same combination, excluding current subject
    const existingSubject = await Subject.findOne({ 
      subjectName: new RegExp(`^${subjectName}$`, 'i'),
      trackName,
      strandName,
      gradeLevel,
      termName,
      schoolYear,
      _id: { $ne: id }
    });
    if (existingSubject) {
      return res.status(400).json({ message: 'Subject already exists in this track, strand, grade, term, and school year.' });
    }

    // Get the original subject to compare for cascading updates
    const originalSubject = await Subject.findById(id);
    if (!originalSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { subjectName, trackName, strandName, gradeLevel, schoolYear, termName },
      { new: true, runValidators: true }
    );

    // Cascade update to faculty assignments if subject name or related fields changed
    if (originalSubject.subjectName !== subjectName || 
        originalSubject.trackName !== trackName || 
        originalSubject.strandName !== strandName || 
        originalSubject.gradeLevel !== gradeLevel) {
      console.log(`Cascading subject update from "${originalSubject.trackName}/${originalSubject.strandName}/${originalSubject.subjectName}" to "${trackName}/${strandName}/${subjectName}"`);
      
      await FacultyAssignment.updateMany(
        { 
          trackName: originalSubject.trackName,
          strandName: originalSubject.strandName,
          subjectName: originalSubject.subjectName,
          gradeLevel: originalSubject.gradeLevel,
          schoolYear: originalSubject.schoolYear,
          termName: originalSubject.termName
        },
        { $set: { 
          trackName: trackName,
          strandName: strandName,
          subjectName: subjectName,
          gradeLevel: gradeLevel
        } }
      );
      
      console.log(`Successfully cascaded subject update to faculty assignments`);
    }

    res.json(updatedSubject);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Subject already exists in this track, strand, grade, term, and school year.' });
    } else {
      res.status(400).json({ message: error.message });
    }
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
    const subjects = await Subject.find({ schoolYear, termName });
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

// Check subject dependencies before deletion
router.get('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check all dependencies
    const facultyAssignments = await FacultyAssignment.find({ 
      trackName: subject.trackName,
      strandName: subject.strandName,
      subjectName: subject.subjectName, 
      schoolYear: subject.schoolYear, 
      termName: subject.termName 
    });

    const dependencies = {
      subject: subject,
      facultyAssignments: facultyAssignments,
      totalConnections: facultyAssignments.length
    };

    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a subject and all its dependencies
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmCascade } = req.query;
    
    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // If cascade confirmation is not provided, check dependencies first
    if (!confirmCascade) {
      const dependencyCount = await FacultyAssignment.countDocuments({ 
        trackName: subject.trackName,
        strandName: subject.strandName,
        subjectName: subject.subjectName, 
        schoolYear: subject.schoolYear, 
        termName: subject.termName 
      });
      
      if (dependencyCount > 0) {
        return res.status(409).json({ 
          message: `Cannot delete subject: It has ${dependencyCount} connected records. Use confirmCascade=true to delete all connected data.`,
          dependencyCount: dependencyCount
        });
      }
    }

    // Proceed with cascading deletion
    console.log(`Cascading deletion of subject: ${subject.trackName}/${subject.strandName}/${subject.subjectName}`);
    
    // Delete all related faculty assignments
    await FacultyAssignment.deleteMany({ 
      trackName: subject.trackName,
      strandName: subject.strandName,
      subjectName: subject.subjectName, 
      schoolYear: subject.schoolYear, 
      termName: subject.termName 
      });
    
    // Finally delete the subject
    await Subject.findByIdAndDelete(id);
    
    console.log(`Successfully deleted subject and all connected data`);
    res.status(200).json({ message: 'Subject and all connected data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 