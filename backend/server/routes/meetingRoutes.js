import express from 'express';
import Meeting from '../models/Meeting.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();


// GET /api/meetings/class/:classID - Get all meetings for a class
router.get('/class/:classID', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    const meetings = await Meeting.find({ classID });
    res.json(meetings);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// POST /api/meetings - Create a new meeting
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { classID, title, description, scheduledTime, duration, meetingType } = req.body;
    if (!classID || !title || !meetingType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newMeeting = new Meeting({
      classID,
      title,
      description,
      scheduledTime,
      duration,
      meetingType,
      createdBy: req.user._id,
      status: 'scheduled',
      createdAt: new Date()
    });
    await newMeeting.save();
    res.status(201).json(newMeeting);
  } catch (err) {
    console.error('Error creating meeting:', err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// DELETE /api/meetings/:meetingID - Delete a meeting
router.delete('/:meetingID', authenticateToken, async (req, res) => {
  try {
    const { meetingID } = req.params;
    const deleted = await Meeting.findByIdAndDelete(meetingID);
    if (!deleted) return res.status(404).json({ error: 'Meeting not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting meeting:', err);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});


// POST /api/meetings/:meetingID/join - Join a meeting
router.post('/:meetingID/join', authenticateToken, async (req, res) => {
  try {
    const { meetingID } = req.params;
    const meeting = await Meeting.findById(meetingID);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    // Update meeting status to active
    meeting.isActive = true;
    meeting.participantCount = (meeting.participantCount || 0) + 1;
    await meeting.save();

    res.json({ 
      success: true, 
      message: 'Meeting joined successfully',
      meeting: meeting
    });
  } catch (err) {
    console.error('Error joining meeting:', err);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

// POST /api/meetings/:meetingID/leave - Leave a meeting
router.post('/:meetingID/leave', authenticateToken, async (req, res) => {
  try {
    const { meetingID } = req.params;
    const meeting = await Meeting.findById(meetingID);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    // Update participant count
    if (meeting.participantCount > 0) {
      meeting.participantCount = meeting.participantCount - 1;
    }
    
    // If no participants left, mark as inactive
    if (meeting.participantCount <= 0) {
      meeting.isActive = false;
    }
    
    await meeting.save();

    res.json({ success: true, message: 'Left meeting successfully' });
  } catch (err) {
    console.error('Error leaving meeting:', err);
    res.status(500).json({ error: 'Failed to leave meeting' });
  }
});

export default router;
