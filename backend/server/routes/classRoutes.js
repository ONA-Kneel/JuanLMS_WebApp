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

// --- GET /sections - Get available sections for class creation ---
router.get('/sections', authenticateToken, async (req, res) => {
  try {
    // Get current academic year and term
    let academicYear = null;
    let currentTerm = null;
    
    try {
      // Fetch active academic year
      const yearRes = await fetch(`${req.protocol}://${req.get('host')}/api/schoolyears/active`, {
        headers: { "Authorization": `Bearer ${req.headers.authorization?.split(' ')[1]}` }
      });
      if (yearRes.ok) {
        academicYear = await yearRes.json();
      }
      
      // Fetch active term for the year
      if (academicYear) {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const termRes = await fetch(`${req.protocol}://${req.get('host')}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${req.headers.authorization?.split(' ')[1]}` }
        });
        if (termRes.ok) {
          const terms = await termRes.json();
          currentTerm = terms.find(term => term.status === 'active');
        }
      }
    } catch (err) {
      console.log('Could not fetch academic year/term');
      return res.status(500).json({ error: 'Failed to fetch academic year/term' });
    }

    if (!academicYear || !currentTerm) {
      return res.status(400).json({ error: 'No active academic year/term found' });
    }

    // Fetch sections for the current term
    const sectionsRes = await fetch(`${req.protocol}://${req.get('host')}/api/terms/${currentTerm._id}/sections`, {
      headers: { "Authorization": `Bearer ${req.headers.authorization?.split(' ')[1]}` }
    });

    if (sectionsRes.ok) {
      const sections = await sectionsRes.json();
      res.json({ 
        sections, 
        academicYear: `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`,
        currentTerm: currentTerm.termName 
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch sections' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// --- POST / - Create a new class with image upload ---
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { classID, className, classCode, classDesc, members, facultyID, section } = req.body;
    let membersArr = members;
    if (typeof members === 'string') {
      try { membersArr = JSON.parse(members); } catch { membersArr = [members]; }
    }
    // Validate required fields
    if (!classID || !className || !classCode || !classDesc || !membersArr || !Array.isArray(membersArr) || !facultyID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get current academic year and term
    let academicYear = null;
    let currentTerm = null;
    
    try {
      // Fetch active academic year
      const yearRes = await fetch(`${req.protocol}://${req.get('host')}/api/schoolyears/active`, {
        headers: { "Authorization": `Bearer ${req.headers.authorization?.split(' ')[1]}` }
      });
      if (yearRes.ok) {
        academicYear = await yearRes.json();
      }
      
      // Fetch active term for the year
      if (academicYear) {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const termRes = await fetch(`${req.protocol}://${req.get('host')}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${req.headers.authorization?.split(' ')[1]}` }
        });
        if (termRes.ok) {
          const terms = await termRes.json();
          currentTerm = terms.find(term => term.status === 'active');
        }
      }
    } catch (err) {
      console.log('Could not fetch academic year/term, creating class without them');
    }

    // Validate that section matches an actual section from academic settings
    if (section && currentTerm) {
      try {
        const sectionsRes = await fetch(`${req.protocol}://${req.get('host')}/api/terms/${currentTerm._id}/sections`, {
          headers: { "Authorization": `Bearer ${req.headers.authorization?.split(' ')[1]}` }
        });
        
        if (sectionsRes.ok) {
          const sections = await sectionsRes.json();
          const validSection = sections.find(s => s.sectionName === section);
          
          if (!validSection) {
            return res.status(400).json({ 
              error: `Invalid section. Must be one of the available sections: ${sections.map(s => s.sectionName).join(', ')}` 
            });
          }
          
          console.log(`Validated section "${section}" matches: ${validSection.sectionName} (${validSection.trackName} - ${validSection.strandName})`);
        }
      } catch (err) {
        console.log('Could not validate section, proceeding with class creation');
      }
    }
    
    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }
    
    // Create new class with academic year, term, and section if available
    const classData = { 
      classID, 
      className, 
      classCode, 
      classDesc, 
      members: membersArr, 
      facultyID, 
      image: imagePath 
    };
    
    console.log('[CREATE-CLASS] Creating class with data:', {
      classID,
      className,
      classCode,
      members: membersArr,
      facultyID,
      section
    });
    
    // Convert facultyID to ObjectId if it's not already
    if (facultyID && typeof facultyID === 'string' && !facultyID.match(/^[0-9a-fA-F]{24}$/)) {
      // It's not an ObjectId, try to find the faculty by userID
      const faculty = await User.findOne({ userID: facultyID });
      if (faculty) {
        classData.facultyID = faculty._id;
        console.log('[CREATE-CLASS] Converted facultyID from userID to ObjectId:', facultyID, '->', faculty._id);
      }
    }
    
    if (academicYear && currentTerm) {
      classData.academicYear = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
      classData.termName = currentTerm.termName;
    }
    
    if (section) {
      classData.section = section;
    }
    
    const newClass = new Class(classData);
    await newClass.save();
    
    console.log('[CREATE-CLASS] Class created successfully:', {
      classID: newClass.classID,
      members: newClass.members,
      facultyID: newClass.facultyID
    });
    
    // Create audit log for class creation
    const db = database.getDb();
    await db.collection('AuditLogs').insertOne({
      userId: new ObjectId(req.user._id),
      userName: `${req.user.firstname} ${req.user.lastname}`,
      userRole: req.user.role,
      action: `${req.user.role.toUpperCase()}_ADD_CLASS`,
      details: `Created new class "${className}" (${classCode})${section ? ` - Section: ${section}` : ''}`,
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
    
    console.log(`[GET-MEMBERS] Class ${classID} members:`, classDoc.members);
    
    // Use Mongoose User model to fetch and decrypt users
    const faculty = await User.find({ 
      $or: [
        { _id: classDoc.facultyID }, // ObjectId
        { userID: classDoc.facultyID } // userID fallback
      ],
      isArchived: { $ne: true } 
    });
    
    // Handle both ObjectId and userID in members array
    let students = [];
    if (classDoc.members && classDoc.members.length > 0) {
      // Try to find students by ObjectId first, then fallback to userID
      students = await User.find({ 
        $or: [
          { _id: { $in: classDoc.members } }, // ObjectId
          { userID: { $in: classDoc.members } } // userID fallback
        ],
        isArchived: { $ne: true } 
      });
      
      console.log(`[GET-MEMBERS] Found ${students.length} students for class ${classID}`);
    }
    
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
      { $addToSet: { members: student._id } }, // Use ObjectId instead of userID
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

    // Try to find the student to get their ObjectId
    const student = await User.findOne({ 
      $or: [
        { _id: studentID },
        { userID: studentID }
      ]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updatedClass = await Class.findOneAndUpdate(
      { classID },
      { $pull: { members: student._id } }, // Use ObjectId
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
      { facultyID: faculty._id }, // Use ObjectId instead of userID
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

    // Try to find the faculty to get their ObjectId
    const faculty = await User.findOne({ 
      $or: [
        { _id: facultyID },
        { userID: facultyID }
      ]
    });

    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    const updatedClass = await Class.findOneAndUpdate(
      { classID, facultyID: faculty._id }, // Use ObjectId
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

// Bulk update class members (PATCH)
router.patch('/:classID/members', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    const { members } = req.body;

    if (!Array.isArray(members)) {
      return res.status(400).json({ error: 'Members must be an array' });
    }

    console.log(`[PATCH-MEMBERS] Updating class ${classID} with members:`, members);

    const updatedClass = await Class.findOneAndUpdate(
      { classID },
      { members: members },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    console.log(`[PATCH-MEMBERS] Successfully updated class ${classID} with ${members.length} members`);

    // Return the updated class with members
    res.json(updatedClass);
  } catch (err) {
    console.error('[PATCH-MEMBERS] Error:', err);
    res.status(500).json({ error: 'Failed to update class members' });
  }
});


// Get all classes for the logged-in user (student or faculty)
router.get('/my-classes', authenticateToken, async (req, res) => {
  try {
    const userID = req.user.userID;
    console.log(`[MY-CLASSES] User ID: ${userID}, Role: ${req.user.role}`);
    
    let classes = [];
    if (req.user.role === 'faculty') {
      // Faculty: classes where facultyID matches
      const facultyObjectId = req.user._id;
      console.log(`[MY-CLASSES] Faculty ObjectId: ${facultyObjectId}`);
      
      // Find classes where facultyID matches ObjectId or userID
      classes = await Class.find({ 
        $or: [
          { facultyID: facultyObjectId }, // ObjectId
          { facultyID: userID } // userID fallback
        ]
      });
      console.log(`[MY-CLASSES] Found ${classes.length} classes as faculty`);
    } else if (req.user.role === 'students') {
      // Student: classes where members includes the student's ObjectId
      const studentObjectId = req.user._id;
      console.log(`[MY-CLASSES] Student ObjectId: ${studentObjectId}`);
      
      // Find classes where the student's ObjectId is in the members array
      classes = await Class.find({ members: studentObjectId });
      
      console.log(`[MY-CLASSES] Found ${classes.length} classes as student`);
      console.log(`[MY-CLASSES] Classes found:`, classes.map(c => ({ 
        classID: c.classID, 
        className: c.className, 
        members: c.members,
        facultyID: c.facultyID 
      })));
      
    } else {
      // Other roles: return both sets (union, no duplicates)
      const userObjectId = req.user._id;
      const asFaculty = await Class.find({ 
        $or: [
          { facultyID: userObjectId }, // ObjectId
          { facultyID: userID } // userID fallback
        ]
      });
      const asMember = await Class.find({ 
        $or: [
          { members: userObjectId }, // ObjectId
          { members: userID } // userID fallback
        ]
      });
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
    console.error('[MY-CLASSES] Error:', err);
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