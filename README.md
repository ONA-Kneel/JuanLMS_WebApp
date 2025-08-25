# Juan LMS - Learning Management System

A comprehensive Learning Management System built with React, Node.js, Express, MongoDB, and Socket.io for real-time communication.

## 🚀 Features

### Core LMS Features
- **User Management**: Multi-role system (Admin, Faculty, Student, Principal, VPE, Parent)
- **Class Management**: Create, manage, and join classes
- **Assignment System**: Create and submit assignments with file uploads
- **Grading System**: Traditional and modern grading approaches
- **Real-time Communication**: Chat system with Socket.io
- **File Management**: Upload and manage lesson materials, assignments, and submissions
- **Calendar & Events**: Schedule management and event tracking
- **Progress Tracking**: Monitor student progress and performance
- **Audit Trail**: Comprehensive logging of system activities

### Technical Features
- **Real-time Updates**: Live notifications and chat
- **File Upload**: Support for multiple file types (PDF, images, documents)
- **Responsive Design**: Modern UI with Tailwind CSS
- **Secure Authentication**: JWT-based authentication with role-based access control
- **Database**: MongoDB with Mongoose ODM
- **API**: RESTful API with Express.js

## 🏗️ Architecture

```
JuanLMS_WebApp/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── component/       # React components organized by user role
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service functions
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── backend/                 # Node.js backend server
│   ├── server/             # Main Express server
│   │   ├── routes/         # API route handlers
│   │   ├── models/         # MongoDB models
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Backend utilities
│   └── socket/             # Socket.io server (integrated)
└── uploads/                # File storage directory
```

## 🛠️ Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **MongoDB**: Atlas cluster or local MongoDB instance
- **Git**: For version control

## 📦 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd JuanLMS_WebApp
```

### 2. Install Dependencies
```bash
# Install all dependencies (root, backend, and frontend)
npm run install-all
```

### 3. Environment Configuration
Create or update the environment file at `backend/server/config.env`:

```env
# MongoDB Connection
ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT Configuration
JWT_SECRET=yourSuperSecretKey123

# Server Configuration
PORT=5000

# Email Configuration (Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password

# Brevo API Key (for email services)
BREVO_API_KEY=your-brevo-api-key

# Encryption Key
ENCRYPTION_KEY=your-encryption-key
```

## 🚀 Running the Application

### Development Mode (Recommended)
```bash
# Run both backend and frontend concurrently
npm run dev
```

This will start:
- **Backend Server**: https://juanlms-webapp-server.onrender.com
- **Frontend App**: http://localhost:5173
- **Socket.io Server**: Integrated with backend on port 5000

### Production Mode
```bash
# Build the frontend
npm run build

# Start the production server
npm start
```

### Individual Services
```bash
# Backend only
npm run server

# Frontend only
npm run frontend
```

## 🔧 API Endpoints

### Authentication
- `POST /` - User login
- `POST /register` - User registration
- `POST /forgot-password` - Password reset

### User Management
- `GET /user-counts` - Get user counts by role
- `POST /users/:id/upload-profile` - Upload profile picture

### Classes
- `GET /classes` - Get all classes
- `POST /classes` - Create new class
- `GET /classes/:id` - Get class details

### Assignments
- `GET /assignments` - Get all assignments
- `POST /assignments` - Create new assignment
- `GET /assignments/:id` - Get assignment details

### Messages & Chat
- `GET /messages` - Get messages
- `POST /messages` - Send message
- `GET /group-chats` - Get group chats
- `POST /group-chats` - Create group chat

### File Uploads
- `POST /single` - Upload single file
- `GET /uploads/*` - Serve uploaded files

## 🎯 User Roles & Access

### Admin
- Full system access
- User management
- System configuration
- Academic settings

### Faculty
- Class management
- Assignment creation
- Grade management
- Student progress tracking

### Student
- Class enrollment
- Assignment submission
- Grade viewing
- Progress tracking

### Principal
- Faculty oversight
- Academic reports
- Audit trail access

### VPE (Vice President of Education)
- Academic policy management
- System-wide oversight

### Parent
- Child progress monitoring
- Grade viewing
- Communication with faculty

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions by user role
- **Input Validation**: Comprehensive request validation
- **File Upload Security**: Secure file handling and storage
- **Audit Logging**: Complete activity tracking

## 📱 Real-time Features

- **Live Chat**: Instant messaging between users
- **Group Chats**: Collaborative group discussions
- **Real-time Notifications**: Live updates and alerts
- **Online Status**: User presence indicators

## 🗄️ Database Models

- **User**: User accounts and profiles
- **Class**: Course and class information
- **Assignment**: Assignment details and submissions
- **Message**: Chat messages and conversations
- **AuditLog**: System activity logging
- **Grade**: Student grading records

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process using port 5000
   npx kill-port 5000
   ```

2. **MongoDB Connection Error**
   - Verify ATLAS_URI in config.env
   - Check network connectivity
   - Ensure MongoDB Atlas IP whitelist includes your IP

3. **Frontend Build Errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Socket.io Connection Issues**
   - Verify CORS configuration
   - Check frontend socket connection URL
   - Ensure backend server is running

### Debug Mode
The backend includes debug middleware that logs all requests. Check console output for detailed request information.

## 📈 Performance Optimization

- **File Upload Limits**: Configured for optimal performance
- **Database Indexing**: Optimized MongoDB queries
- **Caching**: Implemented where appropriate
- **Compression**: Enabled for static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Contact the development team

---

**Juan LMS** - Empowering Education Through Technology 