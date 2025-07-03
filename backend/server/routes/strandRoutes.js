import express from 'express';
import Strand from '../models/Strand.js';
import Term from '../models/Term.js';

const router = express.Router();

// Get all strands for a specific track
router.get('/track/:trackName', async (req, res) => {
  try {
    const { trackName } = req.params;
    const { schoolYear, termName } = req.query;
    const strands = await Strand.find({ 
      trackName, 
      schoolYear,
      termName,
      status: 'active' 
    });
    res.status(200).json(strands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all strands for a specific school year and term
router.get('/schoolyear/:schoolYear/term/:termName', async (req, res) => {
  try {
    const { schoolYear, termName } = req.params;
    const strands = await Strand.find({ schoolYear, termName, status: 'active' });
    // Deduplicate by strandName, trackName, schoolYear, termName
    const unique = new Map();
    for (const s of strands) {
      const key = `${s.strandName}|${s.trackName}|${s.schoolYear}|${s.termName}`;
      if (!unique.has(key)) unique.set(key, s);
    }
    res.json(Array.from(unique.values()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new strand
router.post('/', async (req, res) => {
  const { strandName, trackName, schoolYear, termName } = req.body;

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
      termName 
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
  const { strandName, trackName } = req.body;

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

    strand.strandName = strandName;
    strand.trackName = trackName;
    strand.schoolYear = currentTerm.schoolYear;
    strand.termName = currentTerm.termName;

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