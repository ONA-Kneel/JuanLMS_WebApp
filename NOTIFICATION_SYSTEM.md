# Notification System Implementation

## Overview
The notification system automatically creates notifications for students when faculty post announcements, assignments, or quizzes in their classes.

## Backend Components

### 1. Notification Model (`backend/server/models/Notification.js`)
- Stores notification data including recipient, type, title, message, faculty, classID, etc.
- Includes priority levels (low, normal, high, urgent)
- Has read/unread status tracking
- Indexed for efficient queries

### 2. Notification Routes (`backend/server/routes/notificationRoutes.js`)
- `GET /notifications/:userId` - Get notifications for a user
- `PATCH /notifications/:notificationId/read` - Mark notification as read
- `PATCH /notifications/:userId/read-all` - Mark all notifications as read
- `POST /notifications/` - Create notification (internal use)
- `DELETE /notifications/:notificationId` - Delete notification

### 3. Notification Service (`backend/server/services/notificationService.js`)
- `createClassNotifications()` - Creates notifications for all students in a class
- `createAnnouncementNotification()` - Creates notifications for new announcements
- `createAssignmentNotification()` - Creates notifications for new assignments
- `createQuizNotification()` - Creates notifications for new quizzes
- `createActivityNotification()` - Creates notifications for general activities

## Frontend Components

### 1. Notification Hook (`frontend/src/hooks/useNotifications.js`)
- Manages notification state and API calls
- Handles fetching, marking as read, and real-time updates
- Includes toast notifications for new notifications

### 2. Notification Center (`frontend/src/component/NotificationCenter.jsx`)
- Displays notifications in a dropdown panel
- Shows unread count badge
- Allows marking individual or all notifications as read
- Shows time ago for each notification

### 3. Profile Menu Integration (`frontend/src/component/ProfileMenu.jsx`)
- Bell icon with unread count badge
- Toggles notification center visibility
- Integrated with user profile functionality

## How It Works

### When Faculty Posts Content:
1. Faculty creates announcement/assignment/quiz through existing routes
2. Backend routes call notification service functions
3. Service finds all students in the class
4. Creates notifications for each student (excluding faculty)
5. Notifications are stored in database

### When Students View Notifications:
1. Frontend fetches notifications on component mount
2. Polls for new notifications every 30 seconds
3. Shows unread count badge on bell icon
4. Displays notifications in dropdown panel
5. Allows marking as read individually or all at once

## Integration Points

### Announcements:
- Route: `POST /announcements/`
- Calls: `createAnnouncementNotification()`

### Assignments:
- Route: `POST /assignments/`
- Calls: `createAssignmentNotification()`

### Quizzes:
- Route: `POST /quizzes/`
- Calls: `createQuizNotification()`

## Features

### Notification Types:
- **Announcement**: New announcements posted by faculty
- **Assignment**: New assignments available for submission
- **Quiz**: New quizzes available for taking
- **Activity**: General activities posted by faculty

### Priority Levels:
- **Low**: General information
- **Normal**: Standard notifications
- **High**: Important assignments/quizzes
- **Urgent**: Critical deadlines or important announcements

### UI Features:
- Real-time unread count badge
- Toast notifications for new items
- Time ago display (e.g., "2h ago")
- Faculty name display
- Class-specific notifications
- Mark as read functionality

## Database Schema

```javascript
{
  recipientId: ObjectId,    // Student who receives notification
  type: String,             // 'announcement', 'assignment', 'quiz', 'activity'
  title: String,            // Notification title
  message: String,          // Notification message
  faculty: String,          // Faculty name who created the content
  classID: String,          // Class where content was posted
  relatedItemId: ObjectId,  // ID of the related announcement/assignment/quiz
  priority: String,         // 'low', 'normal', 'high', 'urgent'
  read: Boolean,            // Whether notification has been read
  timestamp: Date           // When notification was created
}
```

## Testing

To test the notification system:

1. Start both backend and frontend servers
2. Login as a faculty member
3. Create an announcement, assignment, or quiz in a class
4. Login as a student in that class
5. Check the notification bell for new notifications
6. Verify the notification content and functionality

## Future Enhancements

- Email notifications
- Push notifications
- Notification preferences
- Notification categories
- Bulk notification management
- Notification history
- Real-time WebSocket updates 