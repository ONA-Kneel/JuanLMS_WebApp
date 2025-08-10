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
import notificationRoutes from './routes/notificationRoutes.js';
import gradingRoutes from './routes/gradingRoutes.js';
import traditionalGradeRoutes from './routes/traditionalGradeRoutes.js';
import studentReportRoutes from './routes/studentReportRoutes.js';


dotenv.config({ path: './config.env' });

const { ObjectId } = mongoose.Types;
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = 5000;

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
    socket.on("sendGroupMessage", ({ senderId, groupId, text, fileUrl }) => {
        // Broadcast to all users in the group (except sender)
        socket.to(groupId).emit("getGroupMessage", {
            senderId,
            groupId,
            text,
            fileUrl
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
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect(process.env.ATLAS_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Error connecting to MongoDB:", error));

mongoose.connection.on('connected', () => console.log("MongoDB connected successfully"));
mongoose.connection.on('error', (err) => console.error("MongoDB connection error:", err));

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

// Start server with socket.io
server.listen(PORT, () => {
  connect.connectToServer();
  console.log(`Server is running on port: ${PORT}`);
  console.log(`Socket.io server is running on port: ${PORT}`);
});
