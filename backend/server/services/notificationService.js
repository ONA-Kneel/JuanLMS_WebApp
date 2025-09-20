import Notification from '../models/Notification.js';
import Class from '../models/Class.js';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';
import webpush from 'web-push';
import { getIO } from '../server.js';

// Create notifications for all students in a class
export const createClassNotifications = async (classID, notificationData) => {
  try {
    // Get the class and its members
    const classData = await Class.findOne({ classID });
    if (!classData) {
      console.error(`Class ${classID} not found`);
      return;
    }

    console.log(`Found class: ${classID} with ${classData.members.length} members`);

    // Get faculty name - try to find by userID first, then by schoolID, then by _id
    let faculty = await User.findOne({ userID: classData.facultyID });
    if (!faculty) {
      faculty = await User.findOne({ schoolID: classData.facultyID });
    }
    if (!faculty) {
      faculty = await User.findById(classData.facultyID);
    }
    const facultyName = faculty ? `${faculty.firstname} ${faculty.lastname}` : 'Unknown Faculty';

    console.log(`Faculty: ${facultyName}`);

    // Create notifications for all students in the class
    const notifications = [];
    for (const memberId of classData.members) {
      // Skip if the member is the faculty (they don't need notifications for their own posts)
      if (memberId === classData.facultyID) {
        console.log(`Skipping faculty member: ${memberId}`);
        continue;
      }

      // Check if the member is a student - try to find by userID first, then by schoolID, then by _id
      let member = await User.findOne({ userID: memberId });
      if (!member) {
        member = await User.findOne({ schoolID: memberId });
      }
      if (!member) {
        member = await User.findById(memberId);
      }
      
      if (member && member.role === 'students') {
        console.log(`Creating notification for student: ${member.firstname} ${member.lastname} (ID: ${member._id})`);
        const notification = new Notification({
          recipientId: member._id, // Use the actual ObjectId
          faculty: facultyName,
          classID: classID,
          className: classData.className, // Add class name
          classCode: classData.classCode, // Add class code
          ...notificationData
        });
        notifications.push(notification);
      } else {
        console.log(`Member ${memberId} is not a student or not found. Role: ${member?.role}`);
      }
    }

    if (notifications.length > 0) {
      const savedNotifications = await Notification.insertMany(notifications);
      console.log(`Created ${notifications.length} notifications for class ${classID}`);
      
      // Send push notifications and emit real-time events for each saved notification
      for (const notification of savedNotifications) {
        await sendPushNotification(notification);
        
        // Emit real-time notification to the specific user
        const io = getIO();
        if (io) {
          io.to(`user_${notification.recipientId}`).emit('newNotification', {
            notification,
            timestamp: new Date().toISOString()
          });
        }
      }
    } else {
      console.log(`No notifications created for class ${classID}`);
    }
  } catch (error) {
    console.error('Error creating class notifications:', error);
  }
};

// Create notification for announcement
export const createAnnouncementNotification = async (classID, announcement) => {
  const notificationData = {
    type: 'announcement',
    title: 'New Announcement Posted',
    message: `"${announcement.title}" - ${announcement.content.substring(0, 100)}${announcement.content.length > 100 ? '...' : ''}`,
    relatedItemId: announcement._id,
    priority: 'normal'
  };

  await createClassNotifications(classID, notificationData);
};

// Create notification for assignment
export const createAssignmentNotification = async (classID, assignment) => {
  const notificationData = {
    type: 'assignment',
    title: 'New Assignment Available',
    message: `"${assignment.title}" - ${assignment.description ? assignment.description.substring(0, 100) : 'New assignment posted'}${assignment.description && assignment.description.length > 100 ? '...' : ''}`,
    relatedItemId: assignment._id,
    priority: assignment.priority || 'high'
  };

  await createClassNotifications(classID, notificationData);
};

// Create notification for quiz
export const createQuizNotification = async (classID, quiz) => {
  const notificationData = {
    type: 'quiz',
    title: 'New Quiz Available',
    message: `"${quiz.title}" - ${quiz.description ? quiz.description.substring(0, 100) : 'New quiz posted'}${quiz.description && quiz.description.length > 100 ? '...' : ''}`,
    relatedItemId: quiz._id,
    priority: 'high'
  };

  await createClassNotifications(classID, notificationData);
};

// Create notification for activity (general)
export const createActivityNotification = async (classID, activity) => {
  const notificationData = {
    type: 'activity',
    title: 'New Activity Posted',
    message: `"${activity.title}" - ${activity.description ? activity.description.substring(0, 100) : 'New activity available'}${activity.description && activity.description.length > 100 ? '...' : ''}`,
    relatedItemId: activity._id,
    priority: 'normal'
  };

  await createClassNotifications(classID, notificationData);
};

// Create notification for new message
export const createMessageNotification = async (senderId, receiverId, message) => {
  try {
    // Get sender information
    let sender = await User.findOne({ userID: senderId });
    if (!sender) {
      sender = await User.findOne({ schoolID: senderId });
    }
    if (!sender) {
      sender = await User.findById(senderId);
    }

    if (!sender) {
      console.error(`Sender ${senderId} not found`);
      return;
    }

    // Get receiver information
    let receiver = await User.findOne({ userID: receiverId });
    if (!receiver) {
      receiver = await User.findOne({ schoolID: receiverId });
    }
    if (!receiver) {
      receiver = await User.findById(receiverId);
    }

    if (!receiver) {
      console.error(`Receiver ${receiverId} not found`);
      return;
    }

    const senderName = `${sender.firstname} ${sender.lastname}`;
    const messageContent = message.getDecryptedMessage ? message.getDecryptedMessage() : message.message;
    const truncatedMessage = messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent;

    const notification = new Notification({
      recipientId: receiver._id,
      type: 'message',
      title: 'New Message Received',
      message: `"${truncatedMessage}"`,
      faculty: senderName,
      classID: 'direct_message', // Special identifier for direct messages
      className: 'Direct Message',
      classCode: 'DM',
      relatedItemId: message._id,
      priority: 'normal'
    });

    const savedNotification = await notification.save();
    console.log(`Created message notification for ${receiver.firstname} ${receiver.lastname} from ${senderName}`);
    
    // Send push notification
    await sendPushNotification(savedNotification);
    
    // Emit real-time notification to the specific user
    const io = getIO();
    if (io) {
      io.to(`user_${savedNotification.recipientId}`).emit('newNotification', {
        notification: savedNotification,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error creating message notification:', error);
  }
};

// Send push notification to user
const sendPushNotification = async (notification) => {
  try {
    // Get all active push subscriptions for the user
    const subscriptions = await PushSubscription.find({ 
      userId: notification.recipientId, 
      isActive: true 
    });

    if (subscriptions.length === 0) {
      console.log(`No active push subscriptions found for user ${notification.recipientId}`);
      return;
    }

    // Configure VAPID keys
    const vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY || 'BK32H_uCiym7qRQl36JfVI4FRu6ZuazrdYohqZ5-rm5Ff2sfX0YHw_ubekDj9vVBwWiTSnq1pWoldWQJ1yw3c4Y',
      privateKey: process.env.VAPID_PRIVATE_KEY || 'rr-Ry2WxXgZ9kYawhaIYG9N-2043_-9s0QjQFzENUN8'
    };

    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/juanlms.svg',
      badge: '/juanlms.svg',
      tag: `juanlms-${notification.type}-${notification._id}`,
      requireInteraction: notification.priority === 'urgent',
      data: {
        notificationId: notification._id,
        type: notification.type,
        url: process.env.FRONTEND_URL || 'http://localhost:3000'
      }
    });

    // Send to all active subscriptions
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
        
        console.log(`Push notification sent successfully to ${subscription.endpoint}`);
      } catch (error) {
        console.error('Error sending push notification:', error);
        
        // If the subscription is invalid, deactivate it
        if (error.statusCode === 410 || error.statusCode === 404) {
          subscription.isActive = false;
          await subscription.save();
          console.log(`Deactivated invalid subscription: ${subscription.endpoint}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
  }
}; 