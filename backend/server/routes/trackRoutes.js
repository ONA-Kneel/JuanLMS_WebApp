import express from 'express';
import Track from '../models/Track.js';
import Strand from '../models/Strand.js';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';
import StudentAssignment from '../models/StudentAssignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';

const router = express.Router();

// Get all tracks for a specific term by term name (keeping for backward compatibility)
router.get('/term/:termName', async (req, res) => {
  try {
    const { termName } = req.params;
    // Get all tracks for this term name, regardless of status, but show their actual status
    const tracks = await Track.find({ termName: termName });
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all tracks for a specific term by term ID (more precise)
router.get('/termId/:termId', async (req, res) => {
  try {
    const { termId } = req.params;
    
    // First get the term details to get schoolYear and termName
    const Term = (await import('../models/Term.js')).default;
    const term = await Term.findById(termId);
    
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }
    
    // Get tracks for this specific school year and term, regardless of status
    const tracks = await Track.find({ 
      schoolYear: term.schoolYear, 
      termName: term.termName 
    });
    
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new track
router.post('/', async (req, res) => {
  try {
    const { trackName, schoolYear, termName, quarterName } = req.body;

    // Check if track already exists in the same school year, term, and quarter
    const existingTrack = await Track.findOne({
      trackName,
      schoolYear,
      termName,
      quarterName
    });

    if (existingTrack) {
      return res.status(400).json({ message: 'Track already exists in this term and quarter' });
    }

    const track = new Track({
      trackName,
      schoolYear,
      termName,
      quarterName
    });

    const savedTrack = await track.save();
    res.status(201).json(savedTrack);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a track
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { trackName, schoolYear, termName, quarterName } = req.body;

    // Check if the new name would create a duplicate
    const existingTrack = await Track.findOne({
      trackName,
      schoolYear,
      termName,
      quarterName,
      _id: { $ne: id } // Exclude the current track from the check
    });

    if (existingTrack) {
      return res.status(400).json({ message: 'Track name already exists in this term and quarter' });
    }

    // Get the original track to compare for cascading updates
    const originalTrack = await Track.findById(id);
    if (!originalTrack) {
      return res.status(404).json({ message: 'Track not found' });
    }

    const updatedTrack = await Track.findByIdAndUpdate(
      id,
      { trackName, schoolYear, termName, quarterName },
      { new: true, runValidators: true }
    );

    // Cascade update to all related entities if track name changed
    if (originalTrack.trackName !== trackName) {
      console.log(`Cascading track name update from "${originalTrack.trackName}" to "${trackName}"`);
      
      await Promise.all([
        // Update strands
        Strand.updateMany(
          { 
            trackName: originalTrack.trackName, 
            schoolYear: originalTrack.schoolYear, 
            termName: originalTrack.termName 
          },
          { $set: { trackName: trackName } }
        ),
        
        // Update sections  
        Section.updateMany(
          { 
            trackName: originalTrack.trackName, 
            schoolYear: originalTrack.schoolYear, 
            termName: originalTrack.termName 
          },
          { $set: { trackName: trackName } }
        ),
        
        // Update subjects
        Subject.updateMany(
          { 
            trackName: originalTrack.trackName, 
            schoolYear: originalTrack.schoolYear, 
            termName: originalTrack.termName 
          },
          { $set: { trackName: trackName } }
        ),
        
        // Update student assignments
        StudentAssignment.updateMany(
          { 
            trackName: originalTrack.trackName, 
            schoolYear: originalTrack.schoolYear, 
            termName: originalTrack.termName 
          },
          { $set: { trackName: trackName } }
        ),
        
        // Update faculty assignments
        FacultyAssignment.updateMany(
          { 
            trackName: originalTrack.trackName, 
            schoolYear: originalTrack.schoolYear, 
            termName: originalTrack.termName 
          },
          { $set: { trackName: trackName } }
        )
      ]);
      
      console.log(`Successfully cascaded track name update to all related entities`);
    }

    res.json(updatedTrack);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Check track dependencies before deletion
router.get('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    const track = await Track.findById(id);
    
    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    // Check all dependencies
    const [strands, sections, subjects, studentAssignments, facultyAssignments] = await Promise.all([
      Strand.find({ 
        trackName: track.trackName, 
        schoolYear: track.schoolYear, 
        termName: track.termName 
      }),
      Section.find({ 
        trackName: track.trackName, 
        schoolYear: track.schoolYear, 
        termName: track.termName 
      }),
      Subject.find({ 
        trackName: track.trackName, 
        schoolYear: track.schoolYear, 
        termName: track.termName 
      }),
      StudentAssignment.find({ 
        trackName: track.trackName, 
        schoolYear: track.schoolYear, 
        termName: track.termName 
      }),
      FacultyAssignment.find({ 
        trackName: track.trackName, 
        schoolYear: track.schoolYear, 
        termName: track.termName 
      })
    ]);

    const dependencies = {
      track: track,
      strands: strands,
      sections: sections,
      subjects: subjects,
      studentAssignments: studentAssignments,
      facultyAssignments: facultyAssignments,
      totalConnections: strands.length + sections.length + subjects.length + studentAssignments.length + facultyAssignments.length
    };

    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a track and all its dependencies
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmCascade } = req.query;
    
    const track = await Track.findById(id);
    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    // If cascade confirmation is not provided, check dependencies first
    if (!confirmCascade) {
      const dependencies = await Promise.all([
        Strand.countDocuments({ 
          trackName: track.trackName, 
          schoolYear: track.schoolYear, 
          termName: track.termName 
        }),
        Section.countDocuments({ 
          trackName: track.trackName, 
          schoolYear: track.schoolYear, 
          termName: track.termName 
        }),
        Subject.countDocuments({ 
          trackName: track.trackName, 
          schoolYear: track.schoolYear, 
          termName: track.termName 
        }),
        StudentAssignment.countDocuments({ 
          trackName: track.trackName, 
          schoolYear: track.schoolYear, 
          termName: track.termName 
        }),
        FacultyAssignment.countDocuments({ 
          trackName: track.trackName, 
          schoolYear: track.schoolYear, 
          termName: track.termName 
        })
      ]);

      const totalDependencies = dependencies.reduce((sum, count) => sum + count, 0);
      
      if (totalDependencies > 0) {
        return res.status(409).json({ 
          message: `Cannot delete track: It has ${totalDependencies} connected records. Use confirmCascade=true to delete all connected data.`,
          dependencyCount: totalDependencies
        });
      }
    }

    // Proceed with cascading deletion
    console.log(`Cascading deletion of track: ${track.trackName}`);
    
    await Promise.all([
      // Delete all related entities
      Strand.deleteMany({ 
        trackName: track.trackName, 
        schoolYear: track.schoolYear, 
        termName: track.termName 
      }),
      Section.deleteMany({ 
        trackName: track.trackName, 
        schoolYear: track.schoolYear, 
        termName: track.termName 
      }),
      Subject.deleteMany({ 
        trackName: track.trackName, 
        schoolYear: track.schoolYear, 
        termName: track.termName 
      }),
      StudentAssignment.deleteMany({ 
        trackName: track.trackName, 
        schoolYear: track.schoolYear, 
        termName: track.termName 
      }),
      FacultyAssignment.deleteMany({ 
        trackName: track.trackName, 
        schoolYear: track.schoolYear, 
        termName: track.termName 
      })
    ]);

    // Finally delete the track
    await Track.findByIdAndDelete(id);
    
    console.log(`Successfully deleted track and all connected data`);
    res.json({ message: 'Track and all connected data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create tracks in bulk
router.post('/bulk', async (req, res) => {
  try {
    const { tracks } = req.body;

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({ message: 'Invalid tracks data' });
    }

    // Validate all tracks have required fields
    const invalidTracks = tracks.filter(track => !track.trackName || !track.schoolYear || !track.termName);
    if (invalidTracks.length > 0) {
      return res.status(400).json({ message: 'Some tracks are missing required fields' });
    }

    // Check for duplicates within the uploaded data
    const trackNames = tracks.map(t => t.trackName.trim());
    const uniqueTrackNames = new Set(trackNames);
    if (uniqueTrackNames.size !== trackNames.length) {
      return res.status(400).json({ message: 'Duplicate track names found in the uploaded data' });
    }

    // Check for existing tracks
    const existingTracks = await Track.find({
      $or: tracks.map(track => ({
        trackName: new RegExp(`^${track.trackName.trim()}$`, 'i'), // Case-insensitive match
        schoolYear: track.schoolYear,
        termName: track.termName,
        quarterName: track.quarterName
      }))
    });

    if (existingTracks.length > 0) {
      const existingNames = existingTracks.map(t => t.trackName).join(', ');
      return res.status(400).json({ 
        message: `Some tracks already exist: ${existingNames}` 
      });
    }

    // Create all tracks
    const createdTracks = await Track.insertMany(
      tracks.map(track => ({
        trackName: track.trackName.trim(),
        schoolYear: track.schoolYear,
        termName: track.termName,
        quarterName: track.quarterName,
        status: 'active'
      }))
    );

    res.status(201).json(createdTracks);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Some tracks already exist in this term' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

export default router; 