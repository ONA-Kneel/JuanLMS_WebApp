import express from 'express';
import Announcement from '../models/Announcement.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createAnnouncementNotification } from '../services/notificationService.js';

const router = express.Router();

// Get all announcements for a class
router.get('/', authenticateToken, async (req, res) => {
  const { classID } = req.query;
  const announcements = await Announcement.find({ classID }).sort({ createdAt: -1 });
  res.json(announcements);
});

// Create announcement
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { classID, title, content } = req.body;
    console.log(`Creating announcement for class: ${classID}`);
    console.log(`Announcement data:`, { title, content, createdBy: req.user._id });
    
    const announcement = new Announcement({
      classID, title, content, createdBy: req.user._id
    });
    await announcement.save();
    
    console.log(`Announcement saved with ID: ${announcement._id}`);
    
    // Create notifications for students in the class
    console.log(`Creating notifications for class: ${classID}`);
    await createAnnouncementNotification(classID, announcement);
    
    res.status(201).json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
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