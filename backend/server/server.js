// server.js

import dotenv from 'dotenv';
import connect from "./connect.cjs";
import express from "express";
import cors from "cors";
import { createServer } from 'http';
import { Server } from 'socket.io';
import net from 'node:net';
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
import quarterRoutes from './routes/quarterRoutes.js';
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
import notificationRoutes from './routes/notificationRoutes.js';
import gradingRoutes from './routes/gradingRoutes.js';
import traditionalGradeRoutes from './routes/traditionalGradeRoutes.js';
import semestralGradeRoutes from './routes/semestralGradeRoutes.js';
import studentReportRoutes from './routes/studentReportRoutes.js';
import generalAnnouncementRoutes from './routes/generalAnnouncementRoutes.js';
import gradeUploadRoutes from './routes/gradeUploadRoutes.js';
import principalRoutes from './routes/principalRoutes.js';
import aiAnalyticsRoutes from './routes/aiAnalyticsRoutes.js';
import vpeReportsRoutes from './routes/vpeReportsRoutes.js';
import zohoRoutes from './routes/zohoRoutes.js';


dotenv.config({ path: './config.env' });

const { ObjectId } = mongoose.Types;
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  // Increase timeout for file uploads
  pingTimeout: 60000,
  pingInterval: 25000
});

// Set server timeout for long file uploads
server.timeout = 300000; // 5 minutes
server.keepAliveTimeout = 300000; // 5 minutes
server.headersTimeout = 300000; // 5 minutes

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const userId = socket.handshake.auth.userId;
  
  if (!token || !userId) {
    return next(new Error('Authentication error'));
  }
  
  socket.userId = userId;
  socket.token = token;
  next();
});

// Export io instance for use in routes
export const getIO = () => io;

const PREFERRED_PORT = Number(process.env.PORT) || 5000;

async function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen({ port, host: '0.0.0.0' });
  });
}

async function findAvailablePort(startPort, maxAttempts = 20) {
  let candidate = startPort;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFree(candidate);
    if (free) return candidate;
    candidate += 1;
  }
  return startPort; // fallback to preferred if none found (will error as before)
}

// Socket.io connection handling
let activeUsers = [];
let userGroups = {}; // Track which groups each user is in

io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);
    console.log("✅ Socket transport:", socket.conn.transport.name);
    console.log("✅ Socket ready state:", socket.conn.readyState);
    
    socket.on("addUser", (userId) => {
        socket.userId = userId; // Store userId on socket for later use
        // Allow multiple sockets per user; avoid duplicate socketIds
        if (!activeUsers.some(entry => entry.socketId === socket.id)) {
            activeUsers.push({ userId, socketId: socket.id });
        }
        console.log("Active Users: ", activeUsers);
        io.emit("getUsers", activeUsers);
    });

    // Join class room for real-time updates
    socket.on("joinClass", (classId) => {
        socket.join(`class_${classId}`);
    });

    // Leave class room
    socket.on("leaveClass", (classId) => {
        socket.leave(`class_${classId}`);
    });

    // Join user room for personal notifications
    socket.on("joinUserRoom", (userId) => {
        socket.join(`user_${userId}`);
    });

    // Leave user room
    socket.on("leaveUserRoom", (userId) => {
        socket.leave(`user_${userId}`);
    });

    socket.on("sendMessage", ({ chatId, senderId, receiverId, message, text, fileUrl, timestamp }) => {
        console.log("Received sendMessage:", { chatId, senderId, receiverId, message, text, fileUrl, timestamp });

        const normalizedText = typeof message === 'string' && message.length > 0 ? message : (text || "");
        const payload = {
            senderId,
            receiverId,
            text: normalizedText,
            fileUrl,
            timestamp: timestamp || new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        // Find all receiver sockets in active users
        const receiverSockets = activeUsers.filter(user => user.userId === receiverId);
        if (receiverSockets.length > 0) {
            console.log("Sending message to receiver sockets:", receiverSockets.map(u => u.socketId));
            // Emit both legacy and current events for compatibility to all receiver sockets
            receiverSockets.forEach(({ socketId }) => {
                io.to(socketId).emit("getMessage", payload);
                io.to(socketId).emit("receiveMessage", { ...payload, message: normalizedText });
            });
        } else {
            console.log("Receiver not found in active users:", receiverId);
        }

        // Also emit to the sender for confirmation (optional)
        io.to(socket.id).emit("messageSent", payload);
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
    socket.on("sendGroupMessage", ({ senderId, groupId, text, fileUrl, senderName, senderFirstname, senderLastname, senderProfilePic }) => {
        console.log("Received sendGroupMessage:", { senderId, groupId, text, fileUrl, senderName, senderFirstname, senderLastname, senderProfilePic });

        const payload = {
            senderId,
            groupId,
            text,
            fileUrl,
            senderName,
            senderFirstname,
            senderLastname,
            senderProfilePic,
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString()
        };

        // Broadcast to all users in the group (including sender for consistency)
        io.to(groupId).emit("getGroupMessage", payload);
        // Also emit legacy event name for any older clients
        io.to(groupId).emit("receiveGroupMessage", { ...payload, message: text });

        console.log("Broadcasted group message to room:", groupId);
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

    // Handle joinChat for direct messaging
    socket.on("joinChat", (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.userId} joined chat room: ${chatId}`);
    });

    // Handle test events from mobile app
    socket.on("test", (data) => {
        console.log("Received test event:", data);
        socket.emit("testResponse", { message: "Test response from server", timestamp: new Date().toISOString() });
    });

    socket.on("disconnect", () => {
        // Remove this socket from active users; keep others for same user
        const user = activeUsers.find(entry => entry.socketId === socket.id);
        if (user) {
            activeUsers = activeUsers.filter(entry => entry.socketId !== socket.id);
            // If no more sockets for this user, optionally clean up user groups
            const stillConnected = activeUsers.some(entry => entry.userId === user.userId);
            if (!stillConnected) {
                delete userGroups[user.userId];
            }
            io.emit("getUsers", activeUsers);
        }
        console.log("User disconnected:", socket.id);
    });
});

// Middleware
app.use(cors({
  origin: "*",
  credentials: true
}));

// Increase body parser limits for file uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect(process.env.ATLAS_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Error connecting to MongoDB:", error));

mongoose.connection.on('connected', () => console.log("MongoDB connected successfully"));
mongoose.connection.on('error', (err) => console.error("MongoDB connection error:", err));

// Storage configuration
const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);


async function initializeServerStorage() {
  if (USE_CLOUDINARY) {
    console.log('[SERVER] Using Cloudinary storage');
    try {
      const { profileStorage } = await import('./config/cloudinary.js');
      return multer({ 
        storage: profileStorage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        fileFilter: (req, file, cb) => {
          // Check if file is an image
          if (file.mimetype.startsWith('image/')) {
            cb(null, true);
          } else {
            cb(new Error('Only image files are allowed for profile pictures. Please upload a valid image format (JPG, JPEG, PNG).'), false);
          }
        }
      });
    } catch (error) {
      console.error('[SERVER] Cloudinary setup failed, falling back to local storage:', error.message);
    }
  }
  
  // Local storage fallback
  console.log('[SERVER] Using local storage');
  const uploadDir = './uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  
  const localStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
  });
  
  return multer({ 
    storage: localStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      // Check if file is an image
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for profile pictures. Please upload a valid image format (JPG, JPEG, PNG).'), false);
      }
    }
  });
}

// Initialize upload middleware
const upload = await initializeServerStorage();

// Debug middleware to log all requests (with duplicate prevention)
const requestLog = new Set();
app.use((req, res, next) => {
  const requestKey = `${req.method}:${req.path}:${Date.now()}`;
  if (requestLog.has(requestKey)) {
    console.log(`[DUPLICATE REQUEST DETECTED] ${req.method} ${req.path}`);
    return res.status(429).json({ error: 'Duplicate request detected' });
  }
  requestLog.add(requestKey);
  
  // Clean up old entries (keep only last 1000)
  if (requestLog.size > 1000) {
    const entries = Array.from(requestLog);
    requestLog.clear();
    entries.slice(-500).forEach(entry => requestLog.add(entry));
  }
  
  console.log(`[DEBUG] ${req.method} ${req.path}`);
  next();
});

// File upload routes
app.post('/single', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  // Handle both Cloudinary and local storage
  const filename = req.file.filename || path.basename(req.file.secure_url || req.file.path);
  res.status(200).json({ image: filename });
});

app.post("/users/:id/upload-profile", upload.single("image"), async (req, res) => {
  try {
    const userId = req.params.id;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Handle both Cloudinary and local storage
    const profilePicUrl = req.file.secure_url || req.file.path || req.file.filename;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid user ID" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Update only the profilePic field using findByIdAndUpdate to avoid validation issues
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { profilePic: profilePicUrl },
      { new: true, runValidators: false } // Skip validation to avoid contactNo requirement
    );

    res.json({
      message: "Profile image uploaded and linked successfully",
      imageFilename: profilePicUrl,
      user: {
        _id: updatedUser._id,
        firstname: updatedUser.firstname,
        lastname: updatedUser.lastname,
        profilePic: updatedUser.profilePic,
      },
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});


// ✅ Routes - ORGANIZED AND DEDUPLICATED
// Core user and authentication routes
app.use('/', userRoutes);
app.use('/', zohoRoutes);

// Communication routes
app.use('/messages', messageRoutes);
app.use('/group-chats', groupChatRoutes);
app.use('/group-messages', groupMessageRoutes);

// Static file serving
app.use('/uploads', express.static('uploads'));
app.use('/uploads/lessons', express.static('uploads/lessons'));
app.use('/uploads/quiz-images', express.static('uploads/quiz-images'));

// Core application routes
app.use("/events", eventRoutes);
app.use("/classes", classRoutes);
app.use("/api/classes", classRoutes);
app.use("/", auditTrailRoutes);
app.use("/lessons", lessonRoutes);
app.use("/announcements", announcementRoutes);
app.use("/assignments", assignmentRoutes);

// API routes
app.use('/api/tickets', ticketsRouter);
app.use('/api/schoolyears', schoolYearRoutes);
app.use('/api/terms', termRoutes);
app.use('/api/quarters', quarterRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/strands', strandRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/meetings', meetingRoutes);
app.use("/api/faculty-assignments", facultyAssignmentRoutes);
app.use("/api/student-assignments", studentAssignmentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use('/api/registrants', registrantRoutes);
app.use('/api/class-dates', classDateRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/traditional-grades', traditionalGradeRoutes);
app.use('/api/semestral-grades', semestralGradeRoutes);
app.use('/api', studentReportRoutes);
app.use('/api/general-announcements', generalAnnouncementRoutes);
app.use('/api/grades', gradeUploadRoutes);
app.use('/api/principal', principalRoutes);
app.use('/api/ai-analytics', aiAnalyticsRoutes);
app.use('/api/vpe-reports', vpeReportsRoutes);

// Error handling middleware for multer fileFilter errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Please upload a smaller image.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  // Handle fileFilter errors
  if (error.message && error.message.includes('Only image files are allowed')) {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
});

// Start server with socket.io
const PORT = await findAvailablePort(PREFERRED_PORT);
if (PORT !== PREFERRED_PORT) {
  console.warn(`[SERVER] Preferred port ${PREFERRED_PORT} is in use. Using ${PORT} instead.`);
}

server.listen(PORT, () => {
  connect.connectToServer();
  console.log(`Server is running on port: ${PORT}`);
  console.log(`Socket.io server is running on port: ${PORT}`);
});