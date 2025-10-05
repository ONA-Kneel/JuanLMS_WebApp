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
    // Check for existing strand with same name in the same track, school year, and term
    const existingStrand = await Strand.findOne({ 
      strandName: new RegExp(`^${strandName}$`, 'i'),
      trackName,
      schoolYear,
      termName
    });
    if (existingStrand) {
      return res.status(409).json({ message: 'Strand name must be unique within the same track, school year, and term.' });
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

    // Check for existing strand with same name in the same track, school year, and term, excluding current
    const existingStrand = await Strand.findOne({ 
      strandName: new RegExp(`^${strandName}$`, 'i'),
      trackName,
      schoolYear: currentTerm.schoolYear,
      termName: currentTerm.termName,
      _id: { $ne: id }
    });
    if (existingStrand) {
      return res.status(409).json({ message: 'Strand name must be unique within the same track, school year, and term.' });
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

// Copy all academic structure from one quarter to another
router.post('/copy-quarter', async (req, res) => {
  try {
    const { sourceQuarter, targetQuarter, schoolYear, termName } = req.body;

    if (!sourceQuarter || !targetQuarter || !schoolYear || !termName) {
      return res.status(400).json({ 
        message: 'Source quarter, target quarter, school year, and term name are required' 
      });
    }

    if (sourceQuarter === targetQuarter) {
      return res.status(400).json({ 
        message: 'Source and target quarters cannot be the same' 
      });
    }

    console.log(`Starting quarter copy from ${sourceQuarter} to ${targetQuarter} for ${schoolYear} - ${termName}`);

    // Get all strands from source quarter
    const sourceStrands = await Strand.find({
      quarterName: sourceQuarter,
      schoolYear: schoolYear,
      termName: termName
    });

    if (sourceStrands.length === 0) {
      return res.status(404).json({ 
        message: `No strands found in source quarter: ${sourceQuarter}` 
      });
    }

    // Check if target quarter already has strands
    const existingTargetStrands = await Strand.find({
      quarterName: targetQuarter,
      schoolYear: schoolYear,
      termName: termName
    });

    if (existingTargetStrands.length > 0) {
      return res.status(409).json({ 
        message: `Target quarter ${targetQuarter} already has ${existingTargetStrands.length} strands. Cannot copy to avoid duplicates.` 
      });
    }

    // Copy strands to target quarter
    const copiedStrands = [];
    for (const strand of sourceStrands) {
      const newStrand = new Strand({
        strandName: strand.strandName,
        trackName: strand.trackName,
        schoolYear: strand.schoolYear,
        termName: strand.termName,
        quarterName: targetQuarter,
        status: strand.status
      });
      
      const savedStrand = await newStrand.save();
      copiedStrands.push(savedStrand);
    }

    console.log(`Successfully copied ${copiedStrands.length} strands from ${sourceQuarter} to ${targetQuarter}`);

    // Now copy related entities (sections, subjects, etc.)
    await copyRelatedEntities(sourceQuarter, targetQuarter, schoolYear, termName);

    res.json({ 
      message: `Successfully copied all academic structure from ${sourceQuarter} to ${targetQuarter}`,
      copiedStrands: copiedStrands.length,
      details: {
        strands: copiedStrands.length,
        // Will be populated by copyRelatedEntities
        sections: 0,
        subjects: 0,
        studentAssignments: 0,
        facultyAssignments: 0
      }
    });

  } catch (error) {
    console.error('Error copying quarter data:', error);
    res.status(500).json({ message: error.message });
  }
});

// Helper function to copy related entities
async function copyRelatedEntities(sourceQuarter, targetQuarter, schoolYear, termName) {
  const Track = (await import('../models/Track.js')).default;
  const Section = (await import('../models/Section.js')).default;
  const Subject = (await import('../models/Subject.js')).default;
  const StudentAssignment = (await import('../models/StudentAssignment.js')).default;
  const FacultyAssignment = (await import('../models/FacultyAssignment.js')).default;

  let copiedCounts = {
    tracks: 0,
    sections: 0,
    subjects: 0,
    studentAssignments: 0,
    facultyAssignments: 0
  };

  try {
    // Copy tracks
    const sourceTracks = await Track.find({
      quarterName: sourceQuarter,
      schoolYear: schoolYear,
      termName: termName
    });

    for (const track of sourceTracks) {
      const newTrack = new Track({
        trackName: track.trackName,
        schoolYear: track.schoolYear,
        termName: track.termName,
        quarterName: targetQuarter,
        status: track.status
      });
      await newTrack.save();
      copiedCounts.tracks++;
    }

    // Copy sections
    const sourceSections = await Section.find({
      quarterName: sourceQuarter,
      schoolYear: schoolYear,
      termName: termName
    });

    for (const section of sourceSections) {
      const newSection = new Section({
        sectionName: section.sectionName,
        trackName: section.trackName,
        strandName: section.strandName,
        gradeLevel: section.gradeLevel,
        schoolYear: section.schoolYear,
        termName: section.termName,
        quarterName: targetQuarter,
        status: section.status
      });
      await newSection.save();
      copiedCounts.sections++;
    }

    // Copy subjects
    const sourceSubjects = await Subject.find({
      quarterName: sourceQuarter,
      schoolYear: schoolYear,
      termName: termName
    });

    for (const subject of sourceSubjects) {
      const newSubject = new Subject({
        subjectName: subject.subjectName,
        trackName: subject.trackName,
        strandName: subject.strandName,
        gradeLevel: subject.gradeLevel,
        schoolYear: subject.schoolYear,
        termName: subject.termName,
        quarterName: targetQuarter,
        status: subject.status
      });
      await newSubject.save();
      copiedCounts.subjects++;
    }

    // Copy student assignments
    const sourceStudentAssignments = await StudentAssignment.find({
      quarterName: sourceQuarter,
      schoolYear: schoolYear,
      termName: termName
    });

    for (const assignment of sourceStudentAssignments) {
      const newAssignment = new StudentAssignment({
        studentId: assignment.studentId,
        trackName: assignment.trackName,
        strandName: assignment.strandName,
        sectionName: assignment.sectionName,
        subjectName: assignment.subjectName,
        schoolYear: assignment.schoolYear,
        termName: assignment.termName,
        quarterName: targetQuarter,
        status: assignment.status
      });
      await newAssignment.save();
      copiedCounts.studentAssignments++;
    }

    // Copy faculty assignments
    const sourceFacultyAssignments = await FacultyAssignment.find({
      quarterName: sourceQuarter,
      schoolYear: schoolYear,
      termName: termName
    });

    for (const assignment of sourceFacultyAssignments) {
      const newAssignment = new FacultyAssignment({
        facultyId: assignment.facultyId,
        trackName: assignment.trackName,
        strandName: assignment.strandName,
        sectionName: assignment.sectionName,
        subjectName: assignment.subjectName,
        schoolYear: assignment.schoolYear,
        termName: assignment.termName,
        quarterName: targetQuarter,
        status: assignment.status
      });
      await newAssignment.save();
      copiedCounts.facultyAssignments++;
    }

    console.log(`Copied related entities:`, copiedCounts);
    return copiedCounts;

  } catch (error) {
    console.error('Error copying related entities:', error);
    throw error;
  }
}

export default router; 