import express from 'express';
import Announcement from '../models/Announcement.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all announcements for a class
router.get('/', authenticateToken, async (req, res) => {
  const { classID } = req.query;
  const announcements = await Announcement.find({ classID }).sort({ createdAt: -1 });
  res.json(announcements);
});

// Create announcement
router.post('/', authenticateToken, async (req, res) => {
  const { classID, title, content } = req.body;
  const announcement = new Announcement({
    classID, title, content, createdBy: req.user._id
  });
  await announcement.save();
  res.status(201).json(announcement);
});

// Edit announcement
router.put('/:id', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  const announcement = await Announcement.findByIdAndUpdate(
    req.params.id, { title, content }, { new: true }
  );
  res.json(announcement);
});

// Delete announcement
router.delete('/:id', authenticateToken, async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router; 