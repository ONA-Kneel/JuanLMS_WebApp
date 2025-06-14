import express from 'express';
import Section from '../models/Section.js';

const router = express.Router();

// Get all sections for a specific track and strand
router.get('/track/:trackName/strand/:strandName', async (req, res) => {
  try {
    const { trackName, strandName } = req.params;
    const sections = await Section.find({ trackName, strandName, status: 'active' });
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new section
router.post('/', async (req, res) => {
  const { sectionName, trackName, strandName } = req.body;

  if (!sectionName || !trackName || !strandName) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingSection = await Section.findOne({ sectionName, trackName, strandName });
    if (existingSection) {
      return res.status(409).json({ message: 'Section with this name already exists for this track and strand.' });
    }

    const newSection = new Section({ sectionName, trackName, strandName });
    await newSection.save();
    res.status(201).json(newSection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a section
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
  const { sectionName, trackName, strandName } = req.body;

  if (!sectionName || !trackName || !strandName) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Check for duplicate section name for the same track and strand, excluding the current section
    const existingSection = await Section.findOne({
      sectionName,
      trackName,
      strandName,
      _id: { $ne: id }
    });

    if (existingSection) {
      return res.status(409).json({ message: 'Section with this name already exists for this track and strand.' });
    }

    section.sectionName = sectionName;
    section.trackName = trackName;
    section.strandName = strandName;

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