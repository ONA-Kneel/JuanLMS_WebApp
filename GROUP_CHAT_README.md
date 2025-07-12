# Group Chat Feature Implementation

## Overview
This implementation adds comprehensive group chat functionality to the JuanLMS system, allowing users to create, join, and participate in group chats with up to 50 participants.

## Features

### Core Functionality
- **Create Group Chats**: Users can create new group chats with custom names and descriptions
- **Join Group Chats**: Users can join existing group chats using group IDs
- **Real-time Messaging**: Instant message delivery using Socket.IO
- **File Attachments**: Support for file uploads in group messages
- **Participant Management**: Up to 50 participants per group
- **Admin Controls**: Group creators and admins can manage participants

### User Roles Support
- **Admin**: Full access to group chat features
- **Faculty**: Full access to group chat features
- **Student**: Full access to group chat features
- **Principal**: Full access to group chat features

## Backend Implementation

### Models
1. **GroupChat.js** - Manages group chat metadata
   - Group name, description, creator
   - Participant and admin lists
   - Encryption for sensitive data
   - Methods for participant management

2. **GroupMessage.js** - Handles group chat messages
   - Message content and file attachments
   - Sender and group identification
   - Encryption for message data

### Routes
1. **groupChats.js** - Group management endpoints
   - `POST /` - Create new group chat
   - `GET /user/:userId` - Get user's group chats
   - `GET /:groupId` - Get specific group details
   - `POST /:groupId/join` - Join a group
   - `POST /:groupId/leave` - Leave a group
   - `POST /:groupId/add-admin` - Add group admin
   - `POST /:groupId/remove-admin` - Remove group admin
   - `DELETE /:groupId` - Delete group (creator only)

2. **groupMessages.js** - Message handling endpoints
   - `POST /` - Send group message
   - `GET /:groupId` - Get group messages
   - `DELETE /:messageId` - Delete message (sender/admin only)

### Socket.IO Integration
- **Real-time messaging**: Instant message delivery
- **Group rooms**: Users join/leave group-specific rooms
- **File support**: File URLs included in real-time messages

## Frontend Implementation

### Components
1. **GroupChat.jsx** - Main group chat component
   - Universal component used by all user roles
   - Handles group creation, joining, and messaging
   - Real-time message updates
   - File upload support

2. **Role-specific wrappers**:
   - `Admin_GroupChats.jsx`
   - `Faculty_GroupChats.jsx`
   - `Student_GroupChats.jsx`
   - `Principal_GroupChats.jsx`

### Features
- **Group List**: Shows all user's group chats
- **Create Group Modal**: Form to create new groups
- **Join Group Modal**: Form to join existing groups
- **Real-time Chat Interface**: Live messaging with file support
- **Participant Management**: Add/remove participants
- **Admin Controls**: Manage group admins

## Security Features

### Data Encryption
- All sensitive data encrypted before database storage
- Message content, user IDs, and file URLs encrypted
- Decryption methods for secure data retrieval

### Access Control
- Users can only access groups they're participants in
- Message deletion restricted to sender or group admins
- Group deletion restricted to group creator
- Admin management with proper permissions

## API Endpoints

### Group Management
```
POST /group-chats
GET /group-chats/user/:userId
GET /group-chats/:groupId
POST /group-chats/:groupId/join
POST /group-chats/:groupId/leave
POST /group-chats/:groupId/add-admin
POST /group-chats/:groupId/remove-admin
DELETE /group-chats/:groupId
```

### Message Management
```
POST /group-messages
GET /group-messages/:groupId?userId=:userId
DELETE /group-messages/:messageId
```

## Socket Events

### Client to Server
- `addUser` - Register user for real-time updates
- `joinGroup` - Join group chat room
- `leaveGroup` - Leave group chat room
- `sendGroupMessage` - Send message to group

### Server to Client
- `getGroupMessage` - Receive new group message
- `getUsers` - Get list of active users

## Usage Instructions

### Creating a Group Chat
1. Navigate to "GROUP CHATS" in the sidebar
2. Click "Create Group" button
3. Enter group name and description
4. Select participants (up to 50)
5. Click "Create Group"

### Joining a Group Chat
1. Navigate to "GROUP CHATS" in the sidebar
2. Click "Join Group" button
3. Enter the group ID
4. Click "Join Group"

### Sending Messages
1. Select a group from the left panel
2. Type message in the input field
3. Optionally attach a file using the upload button
4. Press Enter or click "Send"

### Managing Group
- **Leave Group**: Click "Leave Group" button in group header
- **Add Admin**: Group admins can promote participants to admin
- **Remove Admin**: Group creator can demote admins
- **Delete Group**: Group creator can delete the entire group

## File Structure

```
backend/
├── server/
│   ├── models/
│   │   ├── GroupChat.js
│   │   └── GroupMessage.js
│   ├── routes/
│   │   ├── groupChats.js
│   │   └── groupMessages.js
│   └── server.js (updated with new routes)
└── socket/
    └── index.cjs (updated with group chat events)

frontend/
└── src/
    └── component/
        ├── GroupChat.jsx
        ├── Admin/
        │   └── Admin_GroupChats.jsx
        ├── Faculty/
        │   └── Faculty_GroupChats.jsx
        ├── Student/
        │   └── Student_GroupChats.jsx
        └── Principal/
            └── Principal_GroupChats.jsx
```

## Navigation Updates

All navbar components have been updated to include "GROUP CHATS" links:
- Admin: `/admin_group_chats`
- Faculty: `/faculty_group_chats`
- Student: `/student_group_chats`
- Principal: `/principal_group_chats`

## Technical Requirements

### Backend Dependencies
- Express.js
- Socket.IO
- Multer (file uploads)
- Mongoose (MongoDB)
- Encryption utilities

### Frontend Dependencies
- React
- Socket.IO Client
- Axios (HTTP requests)
- React Router

## Testing

To test the group chat functionality:

1. **Start the backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Start the socket server**:
   ```bash
   cd backend/socket
   node index.cjs
   ```

3. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Test with multiple users**:
   - Login with different user accounts
   - Create a group chat
   - Join the group with other users
   - Send messages and files
   - Test real-time functionality

## Future Enhancements

Potential improvements for the group chat feature:
- Message reactions and emojis
- Message editing and replies
- Group chat categories/tags
- Message search functionality
- Read receipts
- Message pinning
- Group chat notifications
- Voice and video calls integration 