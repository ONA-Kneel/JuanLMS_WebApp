import express from 'express';
import Section from '../models/Section.js';
import Term from '../models/Term.js';
import StudentAssignment from '../models/StudentAssignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';

const router = express.Router();

// Get all sections
router.get('/', async (req, res) => {
  try {
    const { schoolYear, termName, quarterName } = req.query;
    const filter = {};
    
    // If schoolYear and termName are provided, filter by them
    if (schoolYear) filter.schoolYear = schoolYear;
    if (termName) filter.termName = termName;
    if (quarterName) filter.quarterName = quarterName;
    
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
    const { schoolYear, termName, quarterName } = req.query;
    const filter = { trackName, strandName };
    if (schoolYear) filter.schoolYear = schoolYear;
    if (termName) filter.termName = termName;
    if (quarterName) filter.quarterName = quarterName;
    const sections = await Section.find(filter);
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all sections for a specific term by term ID (more precise)
router.get('/termId/:termId', async (req, res) => {
  try {
    const { termId } = req.params;
    const { quarterName } = req.query;
    
    // First get the term details to get schoolYear and termName
    const term = await Term.findById(termId);
    
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }
    
    // Get sections for this specific school year and term, regardless of status
    const filter = { schoolYear: term.schoolYear, termName: term.termName };
    if (quarterName) filter.quarterName = quarterName;
    const sections = await Section.find(filter).sort({ sectionName: 1 });
    
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new section
router.post('/', async (req, res) => {
  const { sectionName, trackName, strandName, gradeLevel, schoolYear, termName, quarterName } = req.body;

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
    let targetQuarterName = quarterName;
    
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
      termName: targetTermName,
      quarterName: targetQuarterName
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

    // Store original values for cascading updates
    const originalSectionName = section.sectionName;
    const originalTrackName = section.trackName;
    const originalStrandName = section.strandName;
    const originalGradeLevel = section.gradeLevel;
    
    section.sectionName = sectionName;
    section.trackName = trackName;
    section.strandName = strandName;
    section.gradeLevel = gradeLevel;
    section.schoolYear = currentTerm.schoolYear;
    section.termName = currentTerm.termName;

    await section.save();

    // Cascade update to all related entities if any values changed
    if (originalSectionName !== sectionName || originalTrackName !== trackName || 
        originalStrandName !== strandName || originalGradeLevel !== gradeLevel) {
      console.log(`Cascading section update from "${originalTrackName}/${originalStrandName}/${originalSectionName}" to "${trackName}/${strandName}/${sectionName}"`);
      
      await Promise.all([
        // Update student assignments
        StudentAssignment.updateMany(
          { 
            trackName: originalTrackName,
            strandName: originalStrandName,
            sectionName: originalSectionName,
            gradeLevel: originalGradeLevel,
            schoolYear: currentTerm.schoolYear, 
            termName: currentTerm.termName 
          },
          { $set: { 
            trackName: trackName, 
            strandName: strandName, 
            sectionName: sectionName, 
            gradeLevel: gradeLevel 
          } }
        ),
        
        // Update faculty assignments
        FacultyAssignment.updateMany(
          { 
            trackName: originalTrackName,
            strandName: originalStrandName,
            sectionName: originalSectionName,
            gradeLevel: originalGradeLevel,
            schoolYear: currentTerm.schoolYear, 
            termName: currentTerm.termName 
          },
          { $set: { 
            trackName: trackName, 
            strandName: strandName, 
            sectionName: sectionName, 
            gradeLevel: gradeLevel 
          } }
        )
      ]);
      
      console.log(`Successfully cascaded section update to all related entities`);
    }

    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Check section dependencies before deletion
router.get('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    const section = await Section.findById(id);
    
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Check all dependencies
    const [studentAssignments, facultyAssignments] = await Promise.all([
      StudentAssignment.find({ 
        trackName: section.trackName,
        strandName: section.strandName,
        sectionName: section.sectionName, 
        schoolYear: section.schoolYear, 
        termName: section.termName 
      }),
      FacultyAssignment.find({ 
        trackName: section.trackName,
        strandName: section.strandName,
        sectionName: section.sectionName, 
        schoolYear: section.schoolYear, 
        termName: section.termName 
      })
    ]);

    const dependencies = {
      section: section,
      studentAssignments: studentAssignments,
      facultyAssignments: facultyAssignments,
      totalConnections: studentAssignments.length + facultyAssignments.length
    };

    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a section and all its dependencies
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmCascade } = req.query;
    
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // If cascade confirmation is not provided, check dependencies first
    if (!confirmCascade) {
      const dependencies = await Promise.all([
        StudentAssignment.countDocuments({ 
          trackName: section.trackName,
          strandName: section.strandName,
          sectionName: section.sectionName, 
          schoolYear: section.schoolYear, 
          termName: section.termName 
        }),
        FacultyAssignment.countDocuments({ 
          trackName: section.trackName,
          strandName: section.strandName,
          sectionName: section.sectionName, 
          schoolYear: section.schoolYear, 
          termName: section.termName 
        })
      ]);

      const totalDependencies = dependencies.reduce((sum, count) => sum + count, 0);
      
      if (totalDependencies > 0) {
        return res.status(409).json({ 
          message: `Cannot delete section: It has ${totalDependencies} connected records. Use confirmCascade=true to delete all connected data.`,
          dependencyCount: totalDependencies
        });
      }
    }

    // Proceed with cascading deletion
    console.log(`Cascading deletion of section: ${section.trackName}/${section.strandName}/${section.sectionName}`);
    
    await Promise.all([
      // Delete all related entities
      StudentAssignment.deleteMany({ 
        trackName: section.trackName,
        strandName: section.strandName,
        sectionName: section.sectionName, 
        schoolYear: section.schoolYear, 
        termName: section.termName 
      }),
      FacultyAssignment.deleteMany({ 
        trackName: section.trackName,
        strandName: section.strandName,
        sectionName: section.sectionName, 
        schoolYear: section.schoolYear, 
        termName: section.termName 
      })
    ]);

    // Finally delete the section
    await Section.findByIdAndDelete(id);
    
    console.log(`Successfully deleted section and all connected data`);
    res.status(200).json({ message: 'Section and all connected data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update sections by quarter and school year
router.patch('/quarter/:quarterName/schoolyear/:schoolYear', async (req, res) => {
  try {
    const { quarterName, schoolYear } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const result = await Section.updateMany(
      { 
        quarterName: quarterName,
        schoolYear: schoolYear
      },
      { $set: { status: status } }
    );

    console.log(`Updated ${result.modifiedCount} sections to status: ${status} for quarter: ${quarterName}, school year: ${schoolYear}`);
    res.json({ 
      message: `Updated ${result.modifiedCount} sections to status: ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 