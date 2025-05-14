// server.js

import dotenv from 'dotenv';
import connect from "./connect.cjs";
import express from "express";
import cors from "cors";
import users from "./routes/userRoutes.js";
import messageRoutes from "./routes/messages.js";
import multer from "multer";
import fs from "fs";
import mongoose from "mongoose";
import database from "./connect.cjs";
import eventRoutes from "./routes/eventRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import auditTrailRoutes from "./routes/auditTrailroutes.js";

dotenv.config({ path: './config.env' });

const { ObjectId } = mongoose.Types;
const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// API Routes
app.use('/api/users', users);
app.use('/api/messages', messageRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/classes', classRoutes);
app.use('/api', auditTrailRoutes);

// Start server
app.listen(PORT, () => {
  connect.connectToServer();
  console.log(`Server is running on port: ${PORT}`);
});
