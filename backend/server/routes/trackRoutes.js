import express from 'express';
import Track from '../models/Track.js';

const router = express.Router();

// Get all tracks for a specific term
router.get('/term/:termId', async (req, res) => {
  try {
    const { termId } = req.params;
    const tracks = await Track.find({ termName: termId, status: 'active' });
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new track
router.post('/', async (req, res) => {
  try {
    const { trackName, schoolYear, termName } = req.body;

    // Check if track already exists in the same school year and term
    const existingTrack = await Track.findOne({
      trackName,
      schoolYear,
      termName
    });

    if (existingTrack) {
      return res.status(400).json({ message: 'Track already exists in this term' });
    }

    const track = new Track({
      trackName,
      schoolYear,
      termName
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
    const { trackName, schoolYear, termName } = req.body;

    // Check if the new name would create a duplicate
    const existingTrack = await Track.findOne({
      trackName,
      schoolYear,
      termName,
      _id: { $ne: id } // Exclude the current track from the check
    });

    if (existingTrack) {
      return res.status(400).json({ message: 'Track name already exists in this term' });
    }

    const updatedTrack = await Track.findByIdAndUpdate(
      id,
      { trackName, schoolYear, termName },
      { new: true, runValidators: true }
    );

    if (!updatedTrack) {
      return res.status(404).json({ message: 'Track not found' });
    }

    res.json(updatedTrack);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a track
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTrack = await Track.findByIdAndDelete(id);
    
    if (!deletedTrack) {
      return res.status(404).json({ message: 'Track not found' });
    }

    res.json({ message: 'Track deleted successfully' });
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
        termName: track.termName
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