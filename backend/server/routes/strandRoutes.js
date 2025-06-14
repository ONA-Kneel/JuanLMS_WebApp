import express from 'express';
import Strand from '../models/Strand.js';

const router = express.Router();

// Get all strands for a specific track
router.get('/track/:trackName', async (req, res) => {
  try {
    const { trackName } = req.params;
    const strands = await Strand.find({ trackName, status: 'active' });
    res.status(200).json(strands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new strand
router.post('/', async (req, res) => {
  const { strandName, trackName } = req.body;

  if (!strandName || !trackName) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingStrand = await Strand.findOne({ strandName, trackName });
    if (existingStrand) {
      return res.status(409).json({ message: 'Strand with this name already exists for this track.' });
    }

    const newStrand = new Strand({ strandName, trackName });
    await newStrand.save();
    res.status(201).json(newStrand);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a strand
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { strandName, trackName } = req.body;

  if (!strandName || !trackName) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const strand = await Strand.findById(id);
    if (!strand) {
      return res.status(404).json({ message: 'Strand not found' });
    }

    // Check for duplicate strand name for the same track, excluding the current strand
    const existingStrand = await Strand.findOne({
      strandName,
      trackName,
      _id: { $ne: id }
    });

    if (existingStrand) {
      return res.status(409).json({ message: 'Strand with this name already exists for this track.' });
    }

    strand.strandName = strandName;
    strand.trackName = trackName;

    await strand.save();
    res.status(200).json(strand);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a strand
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStrand = await Strand.findByIdAndDelete(id);

    if (!deletedStrand) {
      return res.status(404).json({ message: 'Strand not found' });
    }
    res.status(200).json({ message: 'Strand deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 