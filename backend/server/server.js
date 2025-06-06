// server.js

import dotenv from 'dotenv';
import connect from "./connect.cjs";
import express from "express";
import cors from "cors";
import messageRoutes from "./routes/messages.js";
import multer from "multer";
import fs from "fs";
import mongoose from "mongoose";
import database from "./connect.cjs";
import eventRoutes from "./routes/eventRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import auditTrailRoutes from "./routes/auditTrailroutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import schoolYearRoutes from "./routes/schoolYearRoutes.js";
import programRoutes from "./routes/programRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import sectionRoutes from "./routes/sectionRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";

dotenv.config({ path: './config.env' });

const { ObjectId } = mongoose.Types;
const app = express();
const PORT = 5000;

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
    if (!ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid user ID" });

    const db = database.getDb();
    const result = await db.collection("Users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { profilePic: filename } }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ error: "User not found" });

    res.json({
      message: "Profile image uploaded and linked successfully",
      imageFilename: filename,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to upload profile image" });
  }
});

// ✅ Routes
app.use('/', userRoutes);
app.use('/messages', messageRoutes);
app.use('/uploads', express.static('uploads'));
app.use("/events", eventRoutes);
app.use("/classes", classRoutes);
app.use("/", auditTrailRoutes);
app.use("/lessons", lessonRoutes);
app.use('/uploads/lessons', express.static('uploads/lessons'));
app.use('/schoolyears', schoolYearRoutes);
app.use('/programs', programRoutes);
app.use('/courses', courseRoutes);
app.use('/sections', sectionRoutes);
app.use("/announcements", announcementRoutes);
app.use("/assignments", assignmentRoutes);

// Start server
app.listen(PORT, () => {
  connect.connectToServer();
  console.log(`Server is running on port: ${PORT}`);
});
