import express from 'express';
import Meeting from '../models/Meeting.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getIO } from '../server.js';
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
    console.log(`[MEETINGS] Fetching meetings for classID: ${classID}`);
    
    const meetings = await Meeting.find({ classID });
    
    // Deduplicate meetings by _id to prevent duplicates
    const uniqueMeetings = meetings.filter((meeting, index, self) => 
      index === self.findIndex(m => m._id.toString() === meeting._id.toString())
    );
    
    console.log(`[MEETINGS] Found ${meetings.length} meetings, ${uniqueMeetings.length} unique after deduplication`);
    res.json(uniqueMeetings);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// GET /api/meetings/direct-invite - Get all direct invitation meetings
router.get('/direct-invite', authenticateToken, async (req, res) => {
  try {
    console.log('[MEETINGS] User role:', req.user.role, 'User ID:', req.user._id);
    // Only VPE and Principal can access direct invitation meetings
    if (!['vpe', 'principal', 'vice president of education'].includes(req.user.role)) {
      console.log('[MEETINGS] Access denied for role:', req.user.role);
      return res.status(403).json({ error: 'Access denied. Only VPE and Principal can view direct invitation meetings.' });
    }

    const meetings = await Meeting.find({ 
      isDirectInvite: true,
      $or: [
        { createdBy: req.user._id }, // Meetings created by the current user
        { 'invitedUsers.userId': req.user._id } // Meetings where current user is invited
      ]
    }).populate('createdBy', 'firstName lastName email role')
      .populate('invitedUsers.userId', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    // Deduplicate meetings by _id to prevent duplicates
    const uniqueMeetings = meetings.filter((meeting, index, self) => 
      index === self.findIndex(m => m._id.toString() === meeting._id.toString())
    );
    
    console.log(`[MEETINGS] Found ${meetings.length} direct-invite meetings, ${uniqueMeetings.length} unique after deduplication`);
    res.json(uniqueMeetings);
  } catch (err) {
    console.error('Error fetching direct invitation meetings:', err);
    res.status(500).json({ error: 'Failed to fetch direct invitation meetings' });
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

    // Create notifications for class members
    try {
      console.log(`[MEETING] Creating notifications for class: ${classID}`);
      
      // Get class members
      const classData = await Class.findById(classID);
      if (classData && classData.members) {
        console.log(`[MEETING] Found ${classData.members.length} class members to notify`);
        
        // Create notifications for each class member
        const notifications = [];
        for (const memberId of classData.members) {
          const notification = new Notification({
            recipientId: memberId,
            type: 'meeting',
            title: `New Meeting: ${title}`,
            message: `A new meeting "${title}" has been scheduled for your class`,
            priority: 'normal',
            classID: classID,
            relatedItemId: newMeeting._id,
            timestamp: new Date()
          });
          
          await notification.save();
          notifications.push(notification);
        }

        console.log(`[MEETING] Created ${notifications.length} notifications`);

        // Emit real-time notifications to all class members
        const io = getIO();
        if (io) {
          for (const notification of notifications) {
            io.to(`user_${notification.recipientId}`).emit('newNotification', {
              notification,
              timestamp: new Date().toISOString()
            });
          }
          console.log(`[MEETING] Emitted real-time notifications to ${notifications.length} class members`);
        }
      }
    } catch (notificationError) {
      console.error('[MEETING] Error creating notifications:', notificationError);
      // Don't fail the meeting creation if notifications fail
    }

    res.status(201).json(newMeeting);
  } catch (err) {
    console.error('Error creating meeting:', err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// POST /api/meetings/direct-invite - Create a meeting with direct user invitations
router.post('/direct-invite', authenticateToken, async (req, res) => {
  try {
    const { classID, title, description, scheduledTime, duration, meetingType, invitedUsers } = req.body;
    
    // Validate required fields
    if (!title || !meetingType) {
      return res.status(400).json({ error: 'Missing required fields: title and meetingType' });
    }

    if (!invitedUsers || !Array.isArray(invitedUsers) || invitedUsers.length === 0) {
      return res.status(400).json({ error: 'At least one user must be invited' });
    }

    // Validate user roles - only VPE and Principal can create direct invitation meetings
    if (!['vpe', 'principal', 'vice president of education'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only VPE and Principal can create direct invitation meetings' });
    }

    const newMeeting = new Meeting({
      classID: classID || 'direct-invite', // Use direct-invite as default for direct invitations
      title,
      description,
      scheduledTime,
      duration,
      meetingType,
      createdBy: req.user._id,
      status: 'scheduled',
      createdAt: new Date(),
      invitedUsers: invitedUsers.map(user => ({
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        invitedAt: new Date()
      })),
      isDirectInvite: true // Flag to identify direct invitation meetings
    });

    await newMeeting.save();
    
    console.log(`[MEETINGS] Direct invitation meeting created by ${req.user.role}:`, {
      meetingId: newMeeting._id,
      title: newMeeting.title,
      invitedUsers: newMeeting.invitedUsers.length
    });

    // Create notifications for invited users
    try {
      console.log(`[MEETING] Creating notifications for ${newMeeting.invitedUsers.length} invited users`);
      
      const notifications = [];
      for (const invitedUser of newMeeting.invitedUsers) {
        const notification = new Notification({
          recipientId: invitedUser.userId,
          type: 'meeting_invitation',
          title: `Meeting Invitation: ${title}`,
          message: `You have been invited to a meeting: "${title}"`,
          priority: 'high',
          relatedItemId: newMeeting._id,
          timestamp: new Date()
        });
        
        await notification.save();
        notifications.push(notification);
      }

      console.log(`[MEETING] Created ${notifications.length} invitation notifications`);

      // Emit real-time notifications to all invited users
      const io = getIO();
      if (io) {
        for (const notification of notifications) {
          io.to(`user_${notification.recipientId}`).emit('newNotification', {
            notification,
            timestamp: new Date().toISOString()
          });
        }
        console.log(`[MEETING] Emitted real-time notifications to ${notifications.length} invited users`);
      }
    } catch (notificationError) {
      console.error('[MEETING] Error creating invitation notifications:', notificationError);
      // Don't fail the meeting creation if notifications fail
    }

    res.status(201).json(newMeeting);
  } catch (err) {
    console.error('Error creating direct invitation meeting:', err);
    res.status(500).json({ error: 'Failed to create direct invitation meeting' });
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

// GET /api/meetings/invited - Get meetings where current user is invited
router.get('/invited', authenticateToken, async (req, res) => {
  try {
    console.log('[MEETINGS] Getting invited meetings for user:', req.user._id, 'role:', req.user.role);
    
    const meetings = await Meeting.find({ 
      isDirectInvite: true,
      'invitedUsers.userId': req.user._id
    })
    .populate('createdBy', 'firstName lastName email role')
    .populate('invitedUsers.userId', 'firstName lastName email role')
    .sort({ createdAt: -1 });

    // Deduplicate meetings by _id to prevent duplicates
    const uniqueMeetings = meetings.filter((meeting, index, self) => 
      index === self.findIndex(m => m._id.toString() === meeting._id.toString())
    );
    
    console.log(`[MEETINGS] Found ${meetings.length} invited meetings, ${uniqueMeetings.length} unique after deduplication`);
    res.json(uniqueMeetings);
  } catch (error) {
    console.error('[MEETINGS] Error fetching invited meetings:', error);
    res.status(500).json({ error: 'Failed to fetch invited meetings' });
  }
});

export default router;
