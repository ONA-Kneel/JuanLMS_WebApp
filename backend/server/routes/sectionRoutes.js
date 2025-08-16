import express from 'express';
import Section from '../models/Section.js';
import Term from '../models/Term.js';

const router = express.Router();

// Get all sections
router.get('/', async (req, res) => {
  try {
    const { schoolYear, termName } = req.query;
    const filter = {};
    
    // If schoolYear and termName are provided, filter by them
    if (schoolYear) filter.schoolYear = schoolYear;
    if (termName) filter.termName = termName;
    
    const sections = await Section.find(filter).sort({ sectionName: 1 });
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all sections for a specific track and strand
router.get('/track/:trackName/strand/:strandName', async (req, res) => {
  try {
    const { trackName, strandName } = req.params;
    const { schoolYear, termName } = req.query;
    const sections = await Section.find({ 
      trackName, 
      strandName, 
      schoolYear,
      termName,
      // status: 'active' // Remove status filter to show actual status 
    });
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all sections for a specific term by term ID (more precise)
router.get('/termId/:termId', async (req, res) => {
  try {
    const { termId } = req.params;
    
    // First get the term details to get schoolYear and termName
    const term = await Term.findById(termId);
    
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }
    
    // Get sections for this specific school year and term, regardless of status
    const sections = await Section.find({ 
      schoolYear: term.schoolYear, 
      termName: term.termName 
    }).sort({ sectionName: 1 });
    
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new section
router.post('/', async (req, res) => {
  const { sectionName, trackName, strandName, gradeLevel, schoolYear, termName } = req.body;

  if (!sectionName || !trackName || !strandName || !gradeLevel) {
    return res.status(400).json({ message: 'Section name, track name, strand name, and grade level are required' });
  }
  if (!['Grade 11', 'Grade 12'].includes(gradeLevel)) {
    return res.status(400).json({ message: 'Grade Level must be "Grade 11" or "Grade 12"' });
  }

  try {
    // Use provided schoolYear and termName, or fall back to current active term
    let targetSchoolYear = schoolYear;
    let targetTermName = termName;
    
    if (!targetSchoolYear || !targetTermName) {
      const currentTerm = await Term.findOne({ status: 'active' });
      if (!currentTerm) {
        return res.status(400).json({ message: 'No active term found and no school year/term provided' });
      }
      targetSchoolYear = currentTerm.schoolYear;
      targetTermName = currentTerm.termName;
    }

    // Check for existing section with same name in the same track, strand, school year, and term
    const existingSection = await Section.findOne({ 
      sectionName: new RegExp(`^${sectionName}$`, 'i'),
      trackName,
      strandName,
      schoolYear: targetSchoolYear,
      termName: targetTermName
    });
    if (existingSection) {
      return res.status(409).json({ message: 'Section already exists in this track, strand, school year, and term.' });
    }

    const newSection = new Section({ 
      sectionName, 
      trackName, 
      strandName, 
      gradeLevel,
      schoolYear: targetSchoolYear,
      termName: targetTermName
    });
    await newSection.save();
    res.status(201).json(newSection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a section
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { sectionName, trackName, strandName, gradeLevel } = req.body;

  if (!sectionName || !trackName || !strandName || !gradeLevel) {
    return res.status(400).json({ message: 'Section name, track name, strand name, and grade level are required' });
  }
  if (!['Grade 11', 'Grade 12'].includes(gradeLevel)) {
    return res.status(400).json({ message: 'Grade Level must be "Grade 11" or "Grade 12"' });
  }

  try {
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Get the current active term
    const currentTerm = await Term.findOne({ status: 'active' });
    if (!currentTerm) {
      return res.status(400).json({ message: 'No active term found' });
    }

    // Check for existing section with same name in the same track, strand, school year, and term, excluding current
    const existingSection = await Section.findOne({ 
      sectionName: new RegExp(`^${sectionName}$`, 'i'),
      trackName,
      strandName,
      schoolYear: currentTerm.schoolYear,
      termName: currentTerm.termName,
      _id: { $ne: id }
    });
    if (existingSection) {
      return res.status(409).json({ message: 'Section name must be unique within the same track, strand, school year, and term.' });
    }

    section.sectionName = sectionName;
    section.trackName = trackName;
    section.strandName = strandName;
    section.gradeLevel = gradeLevel;
    section.schoolYear = currentTerm.schoolYear;
    section.termName = currentTerm.termName;

    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a section
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSection = await Section.findByIdAndDelete(id);

    if (!deletedSection) {
      return res.status(404).json({ message: 'Section not found' });
    }
    res.status(200).json({ message: 'Section deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 