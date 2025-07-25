// classRoutes.js
// Handles creation and retrieval of class records for JuanLMS.
// Uses Mongoose for class storage.

import express from 'express';
import Class from '../models/Class.js';
import database from '../connect.cjs';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer setup for class images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-class-' + file.originalname.replace(/\s+/g, ''));
  }
});
const upload = multer({ storage });

const router = express.Router();

// --- POST / - Create a new class with image upload ---
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { classID, className, classCode, classDesc, members, facultyID } = req.body;
    let membersArr = members;
    if (typeof members === 'string') {
      try { membersArr = JSON.parse(members); } catch { membersArr = [members]; }
    }
    // Validate required fields
    if (!classID || !className || !classCode || !classDesc || !membersArr || !Array.isArray(membersArr) || !facultyID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }
    // Create new class
    const newClass = new Class({ classID, className, classCode, classDesc, members: membersArr, facultyID, image: imagePath });
    await newClass.save();
    // Create audit log for class creation
    const db = database.getDb();
    await db.collection('AuditLogs').insertOne({
      userId: new ObjectId(req.user._id),
      userName: `${req.user.firstname} ${req.user.lastname}`,
      userRole: req.user.role,
      action: `${req.user.role.toUpperCase()}_ADD_CLASS`,
      details: `Created new class \"${className}\" (${classCode})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      timestamp: new Date()
    });
    res.status(201).json({ success: true, class: newClass });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// --- GET / - Get all classes ---
router.get('/', authenticateToken, async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// --- GET /:id - Get a specific class ---
// router.get('/:id', authenticateToken, async (req, res) => {
//   try {
//     const classData = await Class.findById(req.params.id);
//     if (!classData) {
//       return res.status(404).json({ error: 'Class not found' });
//     }
//     res.json(classData);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to fetch class' });
//   }
// });

// --- GET /:classID/members - Get all members (faculty and students) of a class ---
router.get('/:classID/members', async (req, res) => {
  try {
    const { classID } = req.params;
    const db = req.app.locals.db || database.getDb();
    // Find the class by classID
    const classDoc = await db.collection('Classes').findOne({ classID });
    if (!classDoc) return res.status(404).json({ error: 'Class not found' });
    // Use Mongoose User model to fetch and decrypt users
    const faculty = await User.find({ userID: classDoc.facultyID, isArchived: { $ne: true } });
    const students = classDoc.members && classDoc.members.length > 0
      ? await User.find({ userID: { $in: classDoc.members }, isArchived: { $ne: true } })
      : [];
    // Decrypt fields
    const decryptedFaculty = faculty.map(user => ({
      ...user.toObject(),
      email: user.getDecryptedEmail ? user.getDecryptedEmail() : user.email,
      schoolID: user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID,
      personalemail: user.getDecryptedPersonalEmail ? user.getDecryptedPersonalEmail() : user.personalemail,
      middlename: user.getDecryptedMiddlename ? user.getDecryptedMiddlename() : user.middlename,
      firstname: user.getDecryptedFirstname ? user.getDecryptedFirstname() : user.firstname,
      lastname: user.getDecryptedLastname ? user.getDecryptedLastname() : user.lastname,
      profilePic: user.getDecryptedProfilePic ? user.getDecryptedProfilePic() : user.profilePic,
      password: undefined,
    }));
    const decryptedStudents = students.map(user => ({
      ...user.toObject(),
      email: user.getDecryptedEmail ? user.getDecryptedEmail() : user.email,
      schoolID: user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID,
      personalemail: user.getDecryptedPersonalEmail ? user.getDecryptedPersonalEmail() : user.personalemail,
      middlename: user.getDecryptedMiddlename ? user.getDecryptedMiddlename() : user.middlename,
      firstname: user.getDecryptedFirstname ? user.getDecryptedFirstname() : user.firstname,
      lastname: user.getDecryptedLastname ? user.getDecryptedLastname() : user.lastname,
      profilePic: user.getDecryptedProfilePic ? user.getDecryptedProfilePic() : user.profilePic,
      password: undefined,
    }));
    res.json({ faculty: decryptedFaculty, students: decryptedStudents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch class members' });
  }
});

router.post('/:classID/members/students', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    const { userIdentifier } = req.body;

    if (!userIdentifier) return res.status(400).json({ error: 'Missing student identifier' });

    const student = await User.findOne({ $or: [{ userID: userIdentifier }, { email: userIdentifier }] });
    if (!student || student.role !== 'students') return res.status(404).json({ error: 'Student not found' });

    const updatedClass = await Class.findOneAndUpdate(
      { classID },
      { $addToSet: { members: student.userID } }, // prevent duplicates
      { new: true }
    );

    if (!updatedClass) return res.status(404).json({ error: 'Class not found' });

    res.json(student); // send back student object for frontend list
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

router.delete('/:classID/members/students/:studentID', authenticateToken, async (req, res) => {
  try {
    const { classID, studentID } = req.params;

    const updatedClass = await Class.findOneAndUpdate(
      { classID },
      { $pull: { members: studentID } },
      { new: true }
    );

    if (!updatedClass) return res.status(404).json({ error: 'Class not found' });

    res.json({ success: true, message: 'Student removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove student' });
  }
});

router.post('/:classID/members/faculty', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    const { userIdentifier } = req.body;

    if (!userIdentifier) return res.status(400).json({ error: 'Missing faculty identifier' });

    const faculty = await User.findOne({ $or: [{ userID: userIdentifier }, { email: userIdentifier }] });
    if (!faculty || faculty.role !== 'faculty') return res.status(404).json({ error: 'Faculty not found' });

    const updatedClass = await Class.findOneAndUpdate(
      { classID },
      { facultyID: faculty.userID },
      { new: true }
    );

    if (!updatedClass) return res.status(404).json({ error: 'Class not found' });

    res.json(faculty);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add faculty' });
  }
});

router.delete('/:classID/members/faculty/:facultyID', authenticateToken, async (req, res) => {
  try {
    const { classID, facultyID } = req.params;

    const updatedClass = await Class.findOneAndUpdate(
      { classID, facultyID },
      { $unset: { facultyID: "" } },
      { new: true }
    );

    if (!updatedClass) return res.status(404).json({ error: 'Class not found or faculty mismatch' });

    res.json({ success: true, message: 'Faculty unassigned' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove faculty' });
  }
});


// Get all classes for the logged-in user (student or faculty)
router.get('/my-classes', authenticateToken, async (req, res) => {
  try {
    const userID = req.user.userID;
    let classes = [];
    if (req.user.role === 'faculty') {
      // Faculty: classes where facultyID matches
      classes = await Class.find({ facultyID: userID });
    } else if (req.user.role === 'students') {
      // Student: classes where members includes userID
      classes = await Class.find({ members: userID });
    } else {
      // Other roles: return both sets (union, no duplicates)
      const asFaculty = await Class.find({ facultyID: userID });
      const asMember = await Class.find({ members: userID });
      const all = [...asFaculty, ...asMember];
      // Remove duplicates by classID
      const seen = new Set();
      classes = all.filter(cls => {
        if (seen.has(cls.classID)) return false;
        seen.add(cls.classID);
        return true;
      });
    }
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes.' });
  }
});

// Get only faculty's assigned classes (for Faculty_Meeting component)
router.get('/faculty-classes', authenticateToken, async (req, res) => {
  try {
    const userID = req.user.userID;
    
    // Only allow faculty to access this endpoint
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }
    
    // Get classes where the logged-in faculty is assigned
    const classes = await Class.find({ facultyID: userID });
    res.json(classes);
  } catch (err) {
    console.error('Error fetching faculty classes:', err);
    res.status(500).json({ error: 'Failed to fetch faculty classes.' });
  }
});

export default router; 