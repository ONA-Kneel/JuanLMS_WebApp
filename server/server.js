import dotenv from 'dotenv';
dotenv.config({ path: './config.env' }); // ✅ Load config.env

//server.js

import connect from "./connect.cjs";
import express from "express";
import cors from "cors";
import users from "./routes/userRoutes.js";
import multer from "multer";
import fs from "fs";
import ImageModel from "./model/image.model.js";
import mongoose from "mongoose";
import database from "./connect.cjs"

const { ObjectId } = mongoose.Types;  // Import ObjectId from mongoose.Types


const app = express();
const PORT = 5000;

app.use(cors());
app.use('/uploads', express.static('uploads'));  // Add this below app.use(cors())
app.use(express.json());

// Mongoose connection
mongoose.connect('mongodb://localhost:27017/JuanLMS')
  .then(() => console.log("Mongoose connected"))
  .catch(err => console.error("Mongoose connection error:", err));

// Make sure uploads folder exists!
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

const upload = multer({storage: storage });

// POST /single route (file upload)
// Your route:
app.post('/single', upload.single('image'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
  
      // Optional: Save filename to MongoDB (your user schema?)
      // Example if you have a User model:
      // await User.findByIdAndUpdate(userId, { profileImage: file.filename });
  
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
  
      // Ensure the user ID is valid
      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
  
      // Update the user's profile picture in the database
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
  
  

// User routes (after)
app.use(users);

app.listen(PORT, () => {
  connect.connectToServer();
  console.log(`Server is running on port: ${PORT}`);
});
