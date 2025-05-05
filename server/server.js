import dotenv from 'dotenv';
import connect from "./connect.cjs";
import express from "express";
import cors from "cors";
import users from "./routes/userRoutes.js";
import messageRoutes from "./routes/messages.js";   // ✅ <-- ADD THIS LINE
import multer from "multer";
import fs from "fs";
import ImageModel from "./model/image.model.js";
import mongoose from "mongoose";
import database from "./connect.cjs"

dotenv.config({ path: './config.env' });

const { ObjectId } = mongoose.Types;

const app = express();
const PORT = 5000;

app.use(cors());
app.use('/uploads', express.static('uploads'));
app.use(express.json());


mongoose.connect('mongodb://localhost:27017/JuanLMS');


const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

// File upload route
app.post('/single', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.status(200).json({ image: file.filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post("/users/:id/upload-profile", upload.single("image"), async (req, res) => {
  try {
    const userId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filename = req.file.filename;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const db = database.getDb();
    const result = await db.collection("Users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { profilePic: filename } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile image uploaded and linked successfully",
      imageFilename: filename,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to upload profile image" });
  }
});

// User routes
app.use(users);

// ✅ ADD THIS LINE to attach /messages routes
app.use(messageRoutes);

app.listen(PORT, () => {
  connect.connectToServer();
  console.log(`Server is running on port: ${PORT}`);
});
