import express from 'express';
import Meeting from '../models/Meeting.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';
const JITSI_USE_JWT = (process.env.JITSI_USE_JWT || 'false').toLowerCase() === 'true';
const JITSI_APP_ID = process.env.JITSI_APP_ID || '';
const JITSI_SECRET = process.env.JITSI_SECRET || '';

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

// Helper: build room name from meeting
function buildRoomName(meeting) {
  // Use human-friendly slug if title available, else fallback to id
  const base = (meeting?.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const suffix = String(meeting._id).slice(-6);
  return base ? `${base}-${suffix}` : String(meeting._id);
}

// POST /api/meetings/:meetingID/join - Join a meeting
router.post('/:meetingID/join', authenticateToken, async (req, res) => {
  try {
    const { meetingID } = req.params;
    const meeting = await Meeting.findById(meetingID);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const roomName = buildRoomName(meeting);

    // Default: no JWT, anonymous access on your Jitsi deployment
    let token = undefined;

    if (JITSI_USE_JWT) {
      // Optional JWT: enables moderator/guest roles based on token when configured in Jitsi
      // See: Jitsi JWT docs; this signs token with app_id and secret
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        aud: 'jitsi',
        iss: JITSI_APP_ID,
        sub: JITSI_DOMAIN, // your deployment domain
        room: roomName,
        exp: now + 60 * 60, // 1 hour
        nbf: now - 10,
        context: {
          user: {
            name: req.user?.name || 'User',
            email: req.user?.email || undefined,
            affiliation: (req.user?.role === 'faculty' || req.user?.role === 'admin') ? 'owner' : 'member'
          }
        }
      };
      token = jwt.sign(payload, JITSI_SECRET);
    }

    const roomUrl = `https://${JITSI_DOMAIN}/${encodeURIComponent(roomName)}`;
    res.json({ roomUrl, jwt: token });
  } catch (err) {
    console.error('Error joining meeting:', err);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

// POST /api/meetings/:meetingID/leave - Leave a meeting (dummy, for now)
router.post('/:meetingID/leave', authenticateToken, async (req, res) => {
  try {
    res.json({ success: true });
  } catch (err) {
    console.error('Error leaving meeting:', err);
    res.status(500).json({ error: 'Failed to leave meeting' });
  }
});

export default router;
