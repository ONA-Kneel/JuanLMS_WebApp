import express from 'express';
import PushSubscription from '../models/PushSubscription.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import webpush from 'web-push';

const router = express.Router();

// Configure VAPID keys (you should set these in your environment variables)
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BK32H_uCiym7qRQl36JfVI4FRu6ZuazrdYohqZ5-rm5Ff2sfX0YHw_ubekDj9vVBwWiTSnq1pWoldWQJ1yw3c4Y',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'rr-Ry2WxXgZ9kYawhaIYG9N-2043_-9s0QjQFzENUN8'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Save push subscription
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, subscription, userAgent, endpoint } = req.body;
    const tokenUserId = req.user.userId;

    // Verify that the user is saving their own subscription
    if (userId !== tokenUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if subscription already exists for this endpoint
    const existingSubscription = await PushSubscription.findOne({ endpoint });

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.userId = userId;
      existingSubscription.keys = subscription.keys;
      existingSubscription.userAgent = userAgent;
      existingSubscription.isActive = true;
      existingSubscription.lastUsed = new Date();
      await existingSubscription.save();
      
      return res.json({ 
        message: 'Subscription updated successfully',
        subscription: existingSubscription 
      });
    } else {
      // Create new subscription
      const newSubscription = new PushSubscription({
        userId,
        endpoint,
        keys: subscription.keys,
        userAgent,
        isActive: true
      });

      await newSubscription.save();
      
      return res.status(201).json({ 
        message: 'Subscription saved successfully',
        subscription: newSubscription 
      });
    }
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

// Get user's push subscriptions
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const tokenUserId = req.user.userId;

    // Verify that the user is accessing their own subscriptions
    if (userId !== tokenUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const subscriptions = await PushSubscription.find({ 
      userId, 
      isActive: true 
    });

    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching push subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch push subscriptions' });
  }
});

// Delete push subscription
router.delete('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const tokenUserId = req.user.userId;

    // Verify that the user is deleting their own subscriptions
    if (userId !== tokenUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Deactivate all subscriptions for this user
    await PushSubscription.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    res.json({ message: 'Push subscriptions deactivated successfully' });
  } catch (error) {
    console.error('Error deleting push subscriptions:', error);
    res.status(500).json({ error: 'Failed to delete push subscriptions' });
  }
});

// Send push notification to user
router.post('/send/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, body, icon, badge, tag, data, requireInteraction } = req.body;
    const tokenUserId = req.user.userId;

    // Verify that the user is sending to themselves (for now, you might want to allow admins to send to others)
    if (userId !== tokenUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get all active subscriptions for the user
    const subscriptions = await PushSubscription.find({ 
      userId, 
      isActive: true 
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active push subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title || 'JuanLMS Notification',
      body: body || 'You have a new notification',
      icon: icon || '/juanlms.svg',
      badge: badge || '/juanlms.svg',
      tag: tag || 'juanlms-notification',
      requireInteraction: requireInteraction || false,
      data: data || {}
    });

    const results = [];
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: subscription.keys
        };

        await webpush.sendNotification(pushSubscription, payload);
        
        // Update last used timestamp
        subscription.lastUsed = new Date();
        await subscription.save();
        
        results.push({ success: true, endpoint: subscription.endpoint });
      } catch (error) {
        console.error('Error sending push notification:', error);
        
        // If the subscription is invalid, deactivate it
        if (error.statusCode === 410 || error.statusCode === 404) {
          subscription.isActive = false;
          await subscription.save();
        }
        
        results.push({ 
          success: false, 
          endpoint: subscription.endpoint, 
          error: error.message 
        });
      }
    }

    res.json({ 
      message: 'Push notifications sent',
      results 
    });
  } catch (error) {
    console.error('Error sending push notifications:', error);
    res.status(500).json({ error: 'Failed to send push notifications' });
  }
});

export default router;
