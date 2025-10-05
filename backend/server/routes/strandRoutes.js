import express from 'express';
import Strand from '../models/Strand.js';
import Term from '../models/Term.js';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';
import StudentAssignment from '../models/StudentAssignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';

const router = express.Router();

// Get all strands for a specific track
router.get('/track/:trackName', async (req, res) => {
  try {
    const { trackName } = req.params;
    const { schoolYear, termName, quarterName } = req.query;
    const filter = { trackName, schoolYear, termName };
    if (quarterName) filter.quarterName = quarterName;
    const strands = await Strand.find(filter);
    res.status(200).json(strands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all strands for a specific school year and term
router.get('/schoolyear/:schoolYear/term/:termName', async (req, res) => {
  try {
    const { schoolYear, termName } = req.params;
    const { quarterName } = req.query;
    const filter = { schoolYear, termName };
    if (quarterName) filter.quarterName = quarterName;
    const strands = await Strand.find(filter);
    // Deduplicate by strandName, trackName, schoolYear, termName, quarterName
    const unique = new Map();
    for (const s of strands) {
      const key = `${s.strandName}|${s.trackName}|${s.schoolYear}|${s.termName}|${s.quarterName || ''}`;
      if (!unique.has(key)) unique.set(key, s);
    }
    res.json(Array.from(unique.values()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all strands for a specific term by term ID (more precise)
router.get('/termId/:termId', async (req, res) => {
  try {
    const { termId } = req.params;
    const { quarterName } = req.query;
    
    // First get the term details to get schoolYear and termName
    const term = await Term.findById(termId);
    
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }
    
    // Get strands for this specific school year and term, regardless of status
    const filter = { schoolYear: term.schoolYear, termName: term.termName };
    if (quarterName) filter.quarterName = quarterName;
    const strands = await Strand.find(filter);
    
    // Deduplicate by strandName, trackName, schoolYear, termName, quarterName
    const unique = new Map();
    for (const s of strands) {
      const key = `${s.strandName}|${s.trackName}|${s.schoolYear}|${s.termName}|${s.quarterName || ''}`;
      if (!unique.has(key)) unique.set(key, s);
    }
    
    res.json(Array.from(unique.values()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new strand
router.post('/', async (req, res) => {
  const { strandName, trackName, schoolYear, termName, quarterName } = req.body;

  if (!strandName || !trackName || !schoolYear || !termName) {
    return res.status(400).json({ message: 'Strand name, track name, school year, and term name are required' });
  }

  try {
    // Check for existing strand with same name in the same track, school year, term, and quarter
    const existingStrand = await Strand.findOne({ 
      strandName: new RegExp(`^${strandName}$`, 'i'),
      trackName,
      schoolYear,
      termName,
      quarterName
    });
    if (existingStrand) {
      return res.status(409).json({ message: 'Strand name must be unique within the same track, school year, term, and quarter.' });
    }

    const newStrand = new Strand({ 
      strandName, 
      trackName, 
      schoolYear, 
      termName,
      quarterName
    });
    await newStrand.save();
    res.status(201).json(newStrand);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a strand
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { strandName, trackName, quarterName } = req.body;

  if (!strandName || !trackName) {
    return res.status(400).json({ message: 'Strand name and track name are required' });
  }

  try {
    const strand = await Strand.findById(id);
    if (!strand) {
      return res.status(404).json({ message: 'Strand not found' });
    }

    // Get the current active term
    const currentTerm = await Term.findOne({ status: 'active' });
    if (!currentTerm) {
      return res.status(400).json({ message: 'No active term found' });
    }

    // Check for existing strand with same name in the same track, school year, term, and quarter, excluding current
    const existingStrand = await Strand.findOne({ 
      strandName: new RegExp(`^${strandName}$`, 'i'),
      trackName,
      schoolYear: currentTerm.schoolYear,
      termName: currentTerm.termName,
      quarterName: quarterName,
      _id: { $ne: id }
    });
    if (existingStrand) {
      return res.status(409).json({ message: 'Strand name must be unique within the same track, school year, term, and quarter.' });
    }

    // Store original values for cascading updates
    const originalStrandName = strand.strandName;
    const originalTrackName = strand.trackName;

    strand.strandName = strandName;
    strand.trackName = trackName;
    strand.schoolYear = currentTerm.schoolYear;
    strand.termName = currentTerm.termName;
    if (quarterName !== undefined) {
      strand.quarterName = quarterName;
    }

    await strand.save();

    // Cascade update to all related entities if strand name or track name changed
    if (originalStrandName !== strandName || originalTrackName !== trackName) {
      console.log(`Cascading strand update from "${originalTrackName}/${originalStrandName}" to "${trackName}/${strandName}"`);
      
      await Promise.all([
        // Update sections
        Section.updateMany(
          { 
            trackName: originalTrackName,
            strandName: originalStrandName, 
            schoolYear: currentTerm.schoolYear, 
            termName: currentTerm.termName 
          },
          { $set: { trackName: trackName, strandName: strandName } }
        ),
        
        // Update subjects
        Subject.updateMany(
          { 
            trackName: originalTrackName,
            strandName: originalStrandName, 
            schoolYear: currentTerm.schoolYear, 
            termName: currentTerm.termName 
          },
          { $set: { trackName: trackName, strandName: strandName } }
        ),
        
        // Update student assignments
        StudentAssignment.updateMany(
          { 
            trackName: originalTrackName,
            strandName: originalStrandName, 
            schoolYear: currentTerm.schoolYear, 
            termName: currentTerm.termName 
          },
          { $set: { trackName: trackName, strandName: strandName } }
        ),
        
        // Update faculty assignments
        FacultyAssignment.updateMany(
          { 
            trackName: originalTrackName,
            strandName: originalStrandName, 
            schoolYear: currentTerm.schoolYear, 
            termName: currentTerm.termName 
          },
          { $set: { trackName: trackName, strandName: strandName } }
        )
      ]);
      
      console.log(`Successfully cascaded strand update to all related entities`);
    }

    res.status(200).json(strand);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Check strand dependencies before deletion
router.get('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    const strand = await Strand.findById(id);
    
    if (!strand) {
      return res.status(404).json({ message: 'Strand not found' });
    }

    // Check all dependencies
    const [sections, subjects, studentAssignments, facultyAssignments] = await Promise.all([
      Section.find({ 
        trackName: strand.trackName,
        strandName: strand.strandName, 
        schoolYear: strand.schoolYear, 
        termName: strand.termName 
      }),
      Subject.find({ 
        trackName: strand.trackName,
        strandName: strand.strandName, 
        schoolYear: strand.schoolYear, 
        termName: strand.termName 
      }),
      StudentAssignment.find({ 
        trackName: strand.trackName,
        strandName: strand.strandName, 
        schoolYear: strand.schoolYear, 
        termName: strand.termName 
      }),
      FacultyAssignment.find({ 
        trackName: strand.trackName,
        strandName: strand.strandName, 
        schoolYear: strand.schoolYear, 
        termName: strand.termName 
      })
    ]);

    const dependencies = {
      strand: strand,
      sections: sections,
      subjects: subjects,
      studentAssignments: studentAssignments,
      facultyAssignments: facultyAssignments,
      totalConnections: sections.length + subjects.length + studentAssignments.length + facultyAssignments.length
    };

    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a strand and all its dependencies
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmCascade } = req.query;

    const strand = await Strand.findById(id);
    if (!strand) {
      return res.status(404).json({ message: 'Strand not found' });
    }

    // If cascade confirmation is not provided, check dependencies first
    if (!confirmCascade) {
      const dependencies = await Promise.all([
        Section.countDocuments({ 
          trackName: strand.trackName,
          strandName: strand.strandName, 
          schoolYear: strand.schoolYear, 
          termName: strand.termName,
          quarterName: strand.quarterName
        }),
        Subject.countDocuments({ 
          trackName: strand.trackName,
          strandName: strand.strandName, 
          schoolYear: strand.schoolYear, 
          termName: strand.termName,
          quarterName: strand.quarterName
        }),
        StudentAssignment.countDocuments({ 
          trackName: strand.trackName,
          strandName: strand.strandName, 
          schoolYear: strand.schoolYear, 
          termName: strand.termName,
          quarterName: strand.quarterName
        }),
        FacultyAssignment.countDocuments({ 
          trackName: strand.trackName,
          strandName: strand.strandName, 
          schoolYear: strand.schoolYear, 
          termName: strand.termName,
          quarterName: strand.quarterName
        })
      ]);

      const totalDependencies = dependencies.reduce((sum, count) => sum + count, 0);
      
      if (totalDependencies > 0) {
        return res.status(409).json({ 
          message: `Cannot delete strand: It has ${totalDependencies} connected records. Use confirmCascade=true to delete all connected data.`,
          dependencyCount: totalDependencies
        });
      }
    }

    // Proceed with cascading deletion (quarter-specific)
    console.log(`Cascading deletion of strand: ${strand.trackName}/${strand.strandName} for quarter: ${strand.quarterName}`);
    
    await Promise.all([
      // Delete all related entities for this specific quarter only
      Section.deleteMany({ 
        trackName: strand.trackName,
        strandName: strand.strandName, 
        schoolYear: strand.schoolYear, 
        termName: strand.termName,
        quarterName: strand.quarterName
      }),
      Subject.deleteMany({ 
        trackName: strand.trackName,
        strandName: strand.strandName, 
        schoolYear: strand.schoolYear, 
        termName: strand.termName,
        quarterName: strand.quarterName
      }),
      StudentAssignment.deleteMany({ 
        trackName: strand.trackName,
        strandName: strand.strandName, 
        schoolYear: strand.schoolYear, 
        termName: strand.termName,
        quarterName: strand.quarterName
      }),
      FacultyAssignment.deleteMany({ 
        trackName: strand.trackName,
        strandName: strand.strandName, 
        schoolYear: strand.schoolYear, 
        termName: strand.termName,
        quarterName: strand.quarterName
      })
    ]);

    // Finally delete the strand
    await Strand.findByIdAndDelete(id);
    
    console.log(`Successfully deleted strand and all connected data`);
    res.status(200).json({ message: 'Strand and all connected data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update strands by quarter and school year
router.patch('/quarter/:quarterName/schoolyear/:schoolYear', async (req, res) => {
  try {
    const { quarterName, schoolYear } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const result = await Strand.updateMany(
      { 
        quarterName: quarterName,
        schoolYear: schoolYear
      },
      { $set: { status: status } }
    );

    console.log(`Updated ${result.modifiedCount} strands to status: ${status} for quarter: ${quarterName}, school year: ${schoolYear}`);
    res.json({ 
      message: `Updated ${result.modifiedCount} strands to status: ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Copy strand to all quarters within the same term
router.post('/:id/copy-to-quarters', async (req, res) => {
  try {
    const { id } = req.params;
    const { quarterNames } = req.body; // Array of quarter names to copy to

    if (!quarterNames || !Array.isArray(quarterNames) || quarterNames.length === 0) {
      return res.status(400).json({ message: 'Quarter names array is required' });
    }

    const originalStrand = await Strand.findById(id);
    if (!originalStrand) {
      return res.status(404).json({ message: 'Strand not found' });
    }

    const copiedStrands = [];
    
    for (const quarterName of quarterNames) {
      // Check if strand already exists in this quarter
      const existingStrand = await Strand.findOne({
        strandName: originalStrand.strandName,
        trackName: originalStrand.trackName,
        schoolYear: originalStrand.schoolYear,
        termName: originalStrand.termName,
        quarterName: quarterName
      });

      if (!existingStrand) {
        const newStrand = new Strand({
          strandName: originalStrand.strandName,
          trackName: originalStrand.trackName,
          schoolYear: originalStrand.schoolYear,
          termName: originalStrand.termName,
          quarterName: quarterName,
          status: originalStrand.status
        });
        
        await newStrand.save();
        copiedStrands.push(newStrand);
      }
    }

    res.status(201).json({
      message: `Successfully copied strand to ${copiedStrands.length} quarters`,
      copiedStrands: copiedStrands,
      skipped: quarterNames.length - copiedStrands.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 