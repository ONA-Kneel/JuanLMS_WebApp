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

// Stream Video configuration
const STREAM_API_KEY = process.env.STREAM_API_KEY || 'veyeuctsfcqt';
const STREAM_API_SECRET = process.env.STREAM_API_SECRET || 'gz28qmg9emda57vfejtcmgd26yxeze4yeeqfqf2kvtue4vjwsss7pjy2btnrn286';

// Helper function to create Stream Video JWT token
const createStreamVideoToken = (userId, expiresInSeconds = 3600) => {
  const now = Math.floor(Date.now() / 1000);
  
  // Try the minimal payload structure first
  const payload = {
    iss: STREAM_API_KEY,
    sub: userId,
    user_id: userId,
    iat: now,
    exp: now + expiresInSeconds
  };
  
  console.log(`[STREAM-CREDS] Creating JWT with payload:`, payload);
  console.log(`[STREAM-CREDS] Using secret: ${STREAM_API_SECRET.substring(0, 10)}...`);
  console.log(`[STREAM-CREDS] API Key: ${STREAM_API_KEY}`);
  
  return jwt.sign(payload, STREAM_API_SECRET, { algorithm: 'HS256' });
};

// POST /api/meetings/stream-credentials - Generate Stream Video credentials
router.post('/stream-credentials', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.body;
    
    if (!callId) {
      return res.status(400).json({ 
        success: false, 
        message: 'callId is required' 
      });
    }

    // Get user information
    const userId = String(req.user._id);
    
    // Debug: Log the user object to see what fields are available
    console.log(`[STREAM-CREDS] User object:`, {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    });
    
    const userName = req.user.name || 'User';
    const userEmail = req.user.email || '';

    console.log(`[STREAM-CREDS] Generating credentials for user: ${userId}, name: ${userName}, callId: ${callId}`);

    // Create a JWT token for the user (valid for 1 hour)
    const token = createStreamVideoToken(userId, 3600);
    
    // Debug: Log the generated token and its parts
    console.log(`[STREAM-CREDS] Generated token: ${token}`);
    try {
      const decoded = jwt.decode(token, { complete: true });
      console.log(`[STREAM-CREDS] Token header:`, decoded.header);
      console.log(`[STREAM-CREDS] Token payload:`, decoded.payload);
    } catch (err) {
      console.error(`[STREAM-CREDS] Error decoding token:`, err);
    }

    const credentials = {
      success: true,
      apiKey: STREAM_API_KEY,
      token,
      userId,
      callId: String(callId),
      userInfo: {
        id: userId,
        name: userName,
        email: userEmail
      }
    };

    console.log(`[STREAM-CREDS] Successfully generated credentials for user: ${userId}`);
    res.json(credentials);
  } catch (err) {
    console.error('[STREAM-CREDS] Error generating Stream credentials:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create Stream credentials',
      error: err.message 
    });
  }
});

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
    // VPE, Principal, and Students can access direct invitation meetings
    if (!['vpe', 'principal', 'vice president of education', 'students', 'student'].includes(req.user.role)) {
      console.log('[MEETINGS] Access denied for role:', req.user.role);
      return res.status(403).json({ error: 'Access denied. Only VPE, Principal, and Students can view direct invitation meetings.' });
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

    // Validate user roles - VPE, Principal, and Students can create direct invitation meetings
    if (!['vpe', 'principal', 'vice president of education', 'students', 'student'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only VPE, Principal, and Students can create direct invitation meetings' });
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

// POST /api/meetings/:meetingID/join - Join a meeting (Stream.io)
router.post('/:meetingID/join', authenticateToken, async (req, res) => {
  try {
    const { meetingID } = req.params;
    const meeting = await Meeting.findById(meetingID);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    // For Stream.io, we don't need a roomUrl - the frontend will use the meeting ID as callId
    // The Stream credentials will be fetched separately via /stream-credentials endpoint
    res.json({ 
      success: true,
      meetingId: meeting._id,
      callId: String(meeting._id), // Use meeting ID as Stream call ID
      message: 'Meeting ready for Stream.io connection'
    });
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
