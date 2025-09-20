import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getIO } from '../server.js';

const router = express.Router();

// Get notifications for a user
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Fetching notifications for user: ${userId}`);
    
    const notifications = await Notification.find({ recipientId: userId })
      .sort({ timestamp: -1 })
      .limit(50);
    
    console.log(`Found ${notifications.length} notifications for user ${userId}`);
    
    // Emit real-time notification fetch event
    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit('notificationsFetched', {
        notifications,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read for a user
router.patch('/:userId/read-all', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await Notification.updateMany(
      { recipientId: userId, read: false },
      { read: true }
    );
    
    res.json({ 
      success: true, 
      updatedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Create notification (internal use)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      recipientId,
      type,
      title,
      message,
      faculty,
      classID,
      relatedItemId,
      priority = 'normal'
    } = req.body;

    const notification = new Notification({
      recipientId,
      type,
      title,
      message,
      faculty,
      classID,
      relatedItemId,
      priority
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndDelete(notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Test endpoint to check all notifications (for debugging)
router.get('/debug/all', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({}).sort({ timestamp: -1 });
    console.log(`Total notifications in database: ${notifications.length}`);
    res.json({ 
      count: notifications.length, 
      notifications: notifications.slice(0, 5) // Return first 5 for debugging
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router; 