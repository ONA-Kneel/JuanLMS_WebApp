// server.js

import dotenv from 'dotenv';
import connect from "./connect.cjs";
import express from "express";
import cors from "cors";
import { createServer } from 'http';
import { Server } from 'socket.io';
import messageRoutes from "./routes/messages.js";
import groupChatRoutes from "./routes/groupChats.js";
import groupMessageRoutes from "./routes/groupMessages.js";
import multer from "multer";
import fs from "fs";
import mongoose from "mongoose";
import database from "./connect.cjs";
import eventRoutes from "./routes/eventRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import auditTrailRoutes from "./routes/auditTrailroutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import User from "./models/User.js";
import ticketsRouter from './routes/tickets.js';
import schoolYearRoutes from "./routes/schoolYearRoutes.js";
import termRoutes from './routes/termRoutes.js';
import trackRoutes from './routes/trackRoutes.js';
import strandRoutes from './routes/strandRoutes.js';
import sectionRoutes from './routes/sectionRoutes.js';
import facultyAssignmentRoutes from "./routes/facultyAssignmentRoutes.js";
import studentAssignmentRoutes from "./routes/studentAssignmentRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import registrantRoutes from "./routes/registrantRoutes.js";
import classDateRoutes  from './routes/classDateRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import notificationRoutes from "./routes/notificationRoutes.js";
import gradingRoutes from './routes/gradingRoutes.js';
import traditionalGradeRoutes from './routes/traditionalGradeRoutes.js';
import studentReportRoutes from './routes/studentReportRoutes.js';
import generalAnnouncementRoutes from './routes/generalAnnouncementRoutes.js';


dotenv.config({ path: './config.env' });

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'ATLAS_URI'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Set default environment if not specified
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('⚠️  NODE_ENV not set, defaulting to development');
}

console.log('✅ Environment variables validated successfully');

const { ObjectId } = mongoose.Types;
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://juan-lms.vercel.app', 'https://juanlms.vercel.app']
      : ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Socket.io connection handling
let activeUsers = [];
let userGroups = {}; // Track which groups each user is in

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    
    socket.on("addUser", (userId) => {
        socket.userId = userId; // Store userId on socket for later use
        if (!activeUsers.some(user => user.userId === userId)) {
            activeUsers.push({ 
                userId, 
                socketId: socket.id 
            });
        }
        console.log("Active Users: ", activeUsers);
        io.emit("getUsers", activeUsers);
    });

    socket.on("sendMessage", ({ senderId, receiverId, text, fileUrl }) => {
        const receiver = activeUsers.find(user => user.userId === receiverId);
        if (receiver) {
            io.to(receiver.socketId).emit("getMessage", {
                senderId,
                text,
                fileUrl
            });
        }
    });

    // Join a group chat room
    socket.on("joinGroup", ({ userId, groupId }) => {
        socket.join(groupId);
        if (!userGroups[userId]) {
            userGroups[userId] = [];
        }
        if (!userGroups[userId].includes(groupId)) {
            userGroups[userId].push(groupId);
        }
        console.log(`User ${userId} joined group ${groupId}`);
    });

    // Leave a group chat room
    socket.on("leaveGroup", ({ userId, groupId }) => {
        socket.leave(groupId);
        if (userGroups[userId]) {
            userGroups[userId] = userGroups[userId].filter(id => id !== groupId);
        }
        console.log(`User ${userId} left group ${groupId}`);
    });

    // Send message to group chat
    socket.on("sendGroupMessage", ({ senderId, groupId, text, fileUrl, senderName }) => {
        // Broadcast to all users in the group (except sender)
        socket.to(groupId).emit("getGroupMessage", {
            senderId,
            groupId,
            text,
            fileUrl,
            senderName
        });
    });

    // Handle group creation
    socket.on("createGroup", (groupData) => {
        // Join the group room for the creator
        socket.join(groupData._id);
        if (!userGroups[socket.userId]) {
            userGroups[socket.userId] = [];
        }
        if (!userGroups[socket.userId].includes(groupData._id)) {
            userGroups[socket.userId].push(groupData._id);
        }
        
        // Emit groupCreated event to the creator
        socket.emit("groupCreated", groupData);
        console.log(`Group created: ${groupData._id}`);
    });

    socket.on("disconnect", () => {
        const user = activeUsers.find(user => user.socketId === socket.id);
        if (user) {
            activeUsers = activeUsers.filter(user => user.socketId !== socket.id);
            // Clean up user groups
            delete userGroups[user.userId];
            io.emit("getUsers", activeUsers);
        }
        console.log("User disconnected:", socket.id);
    });
});

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.FRONTEND_URL || 'https://juan-lms.vercel.app',
        'https://juan-lms.vercel.app',
        'https://juanlms.vercel.app'
      ]
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept']
};

// Log CORS configuration
console.log('🔧 CORS Configuration:');
console.log('   Environment:', process.env.NODE_ENV);
console.log('   Frontend URL:', process.env.FRONTEND_URL);
console.log('   CORS Origins:', corsOptions.origin);

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Handle preflight requests for CORS
app.options('*', cors(corsOptions));

// Additional CORS headers middleware
app.use((req, res, next) => {
  // Log CORS-related headers for debugging
  console.log(`[CORS] ${req.method} ${req.path}`);
  console.log(`[CORS] Origin: ${req.headers.origin}`);
  console.log(`[CORS] User-Agent: ${req.headers['user-agent']}`);
  
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('[CORS] Handling preflight request');
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint for deployment (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'JuanLMS API Server',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      docs: 'API documentation available'
    }
  });
});

// Render-specific health check (responds immediately)
app.get('/render-health', (req, res) => {
  res.status(200).send('OK');
});

// CORS test endpoint
app.get('/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// MongoDB connection
const mongoOptions = {
  serverSelectionTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 10000, // 10 seconds
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  w: 'majority'
};

let mongoRetryCount = 0;
const maxRetries = 3;

const connectToMongo = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI, mongoOptions);
    console.log("✅ Connected to MongoDB successfully");
    console.log(`📊 Database: ${process.env.ATLAS_URI.split('/').pop().split('?')[0]}`);
    mongoRetryCount = 0; // Reset retry count on success
  } catch (error) {
    mongoRetryCount++;
    console.error(`❌ MongoDB connection attempt ${mongoRetryCount} failed:`, error.message);
    
    if (mongoRetryCount < maxRetries) {
      console.log(`🔄 Retrying MongoDB connection in 5 seconds... (${mongoRetryCount}/${maxRetries})`);
      setTimeout(connectToMongo, 5000);
    } else {
      console.error("❌ Max MongoDB connection retries reached. Server will start without DB connection.");
      console.log("🔄 Database operations will be retried on first request.");
    }
  }
};

// Start MongoDB connection
connectToMongo();

mongoose.connection.on('connected', () => console.log("🔄 MongoDB connection established"));
mongoose.connection.on('error', (err) => {
  console.error("❌ MongoDB connection error:", err.message);
  if (err.name === 'MongoNetworkError') {
    console.error("🌐 Network error - check your internet connection and MongoDB Atlas settings");
  }
});
mongoose.connection.on('disconnected', () => console.log("🔌 MongoDB disconnected"));

// File upload config
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.path}`);
  console.log('[DEBUG] Headers:', req.headers);
  next();
});

// File upload routes
app.post('/single', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.status(200).json({ image: req.file.filename });
});

app.post("/users/:id/upload-profile", upload.single("image"), async (req, res) => {
  try {
    const userId = req.params.id;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filename = req.file.filename;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid user ID" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.profilePic = filename;
    await user.save();

    res.json({
      message: "Profile image uploaded and linked successfully",
      imageFilename: filename,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to upload profile image" });
  }
});

app.get('/user-counts', async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    const facultyCount = await User.countDocuments({ role: 'faculty' });
    const studentCount = await User.countDocuments({ role: 'students' });

    res.json({
      admin: adminCount,
      faculty: facultyCount,
      student: studentCount,
    });
  } catch (err) {
    console.error("Failed to fetch user counts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Routes
app.use('/', userRoutes);
app.use('/messages', messageRoutes);
app.use('/group-chats', groupChatRoutes);
app.use('/group-messages', groupMessageRoutes);
app.use('/uploads', express.static('uploads'));
app.use("/events", eventRoutes);
app.use("/classes", classRoutes);
app.use("/", auditTrailRoutes);
app.use("/lessons", lessonRoutes);
app.use('/uploads/lessons', express.static('uploads/lessons'));
app.use('/uploads/quiz-images', express.static('uploads/quiz-images'));
app.use("/announcements", announcementRoutes);
app.use("/assignments", assignmentRoutes);
app.use('/api/tickets', ticketsRouter);
app.use('/api/schoolyears', schoolYearRoutes);
app.use('/api/terms', termRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/strands', strandRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/classes', classRoutes);
app.use("/api/faculty-assignments", facultyAssignmentRoutes);
app.use("/api/student-assignments", studentAssignmentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use('/api/registrants', registrantRoutes);
app.use('/api/class-dates', classDateRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/traditional-grades', traditionalGradeRoutes);
app.use('/api', studentReportRoutes);
app.use('/api/general-announcements', generalAnnouncementRoutes);

// Start server with socket.io
const startServer = () => {
  try {
    const serverInstance = server.listen(PORT, () => {
      connect.connectToServer();
      console.log(`🚀 Server is running on port: ${PORT}`);
      console.log(`🔌 Socket.io server is running on port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📅 Started at: ${new Date().toISOString()}`);
      console.log(`✅ Health check available at: http://localhost:${PORT}/health`);
      console.log(`✅ CORS test available at: http://localhost:${PORT}/cors-test`);
      console.log(`🌐 Server URL: ${process.env.NODE_ENV === 'production' ? 'https://juanlms-webapp-server.onrender.com' : `http://localhost:${PORT}`}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      // Close socket.io connections gracefully
      io.close(() => {
        console.log('✅ Socket.io server closed');
        
        // Close HTTP server
        serverInstance.close(() => {
          console.log('✅ HTTP server closed');
          
          // Close MongoDB connection
          if (mongoose.connection.readyState === 1) {
            mongoose.connection.close()
              .then(() => {
                console.log('✅ MongoDB connection closed');
                process.exit(0);
              })
              .catch((error) => {
                console.error('❌ Error closing MongoDB connection:', error);
                process.exit(1);
              });
          } else {
            process.exit(0);
          }
        });
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
