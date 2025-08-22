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
    
    if (academicYear && currentTerm) {
      classData.academicYear = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
      classData.termName = currentTerm.termName;
    }
    
    if (section) {
      classData.section = section;
    }
    
    const newClass = new Class(classData);
    await newClass.save();
    
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
router.get('/:classID/members', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    
    console.log('🔍 [Backend] GET /:classID/members called with classID:', classID);
    
    // Use Mongoose Class model instead of raw MongoDB collection
    const classDoc = await Class.findOne({ classID });
    console.log('🔍 [Backend] Class lookup result:', classDoc ? 'Found' : 'Not found');
    
    if (!classDoc) {
      console.log('🔍 [Backend] Class not found for classID:', classID);
      return res.status(404).json({ error: 'Class not found' });
    }
    
    console.log('🔍 [Backend] Class document:', {
      classID: classDoc.classID,
      className: classDoc.className,
      facultyID: classDoc.facultyID,
      members: classDoc.members,
      membersLength: classDoc.members ? classDoc.members.length : 0
    });
    
    // Use Mongoose User model to fetch and decrypt users
    const faculty = await User.find({ userID: classDoc.facultyID, isArchived: { $ne: true } });
    console.log('🔍 [Backend] Faculty lookup result:', faculty.length, 'faculty found');
    console.log('🔍 [Backend] Faculty lookup query:', { userID: classDoc.facultyID });
    
    const students = classDoc.members && classDoc.members.length > 0
      ? await User.find({ userID: { $in: classDoc.members }, isArchived: { $ne: true } })
      : [];
    
    console.log('🔍 [Backend] Students lookup result:', students.length, 'students found');
    console.log('🔍 [Backend] Student userIDs found:', students.map(s => s.userID));
    
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
    
    console.log('🔍 [Backend] Sending response with:', {
      facultyCount: decryptedFaculty.length,
      studentsCount: decryptedStudents.length
    });
    
    res.json({ faculty: decryptedFaculty, students: decryptedStudents });
  } catch (err) {
    console.error('🔍 [Backend] Error in GET /:classID/members:', err);
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

// --- PATCH /:classID/members - Update class members ---
router.patch('/:classID/members', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    const { members, facultyID } = req.body;
    
    console.log('🔍 [Backend] PATCH /:classID/members called with:', { classID, members, facultyID });
    
    const updateData = {};
    if (members !== undefined) {
      updateData.members = members;
    }
    if (facultyID !== undefined) {
      updateData.facultyID = facultyID;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const updatedClass = await Class.findOneAndUpdate(
      { classID },
      updateData,
      { new: true }
    );
    
    if (!updatedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    console.log('🔍 [Backend] Class updated successfully:', {
      classID: updatedClass.classID,
      facultyID: updatedClass.facultyID,
      members: updatedClass.members
    });
    
    res.json({ 
      success: true, 
      message: 'Class members updated successfully',
      class: updatedClass
    });
  } catch (err) {
    console.error('🔍 [Backend] Error in PATCH /:classID/members:', err);
    res.status(500).json({ error: 'Failed to update class members' });
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

// --- GET /debug/current-user - Debug endpoint to check current user data ---
router.get('/debug/current-user', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 [Backend] Debug current user endpoint called');
    console.log('🔍 [Backend] req.user:', req.user);
    
    // Get the current user's full data
    const currentUser = await User.findById(req.user._id);
    console.log('🔍 [Backend] Current user from database:', {
      _id: currentUser?._id,
      userID: currentUser?.userID,
      schoolID: currentUser?.schoolID,
      firstname: currentUser?.firstname,
      lastname: currentUser?.lastname,
      role: currentUser?.role
    });
    
    res.json({
      success: true,
      reqUser: req.user,
      dbUser: currentUser ? {
        _id: currentUser._id,
        userID: currentUser.userID,
        schoolID: currentUser.schoolID,
        firstname: currentUser.firstname,
        lastname: currentUser.lastname,
        role: currentUser.role
      } : null
    });
  } catch (err) {
    console.error('🔍 [Backend] Error in debug current user endpoint:', err);
    res.status(500).json({ error: 'Failed to fetch current user data' });
  }
});

// --- GET /debug/classes - Debug endpoint to check class data ---
router.get('/debug/classes', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 [Backend] Debug classes endpoint called');
    
    // Get all classes
    const allClasses = await Class.find({});
    console.log('🔍 [Backend] Total classes found:', allClasses.length);
    
    // Log each class structure
    allClasses.forEach((cls, index) => {
      console.log(`🔍 [Backend] Class ${index + 1}:`, {
        classID: cls.classID,
        className: cls.className,
        facultyID: cls.facultyID,
        members: cls.members,
        membersLength: cls.members ? cls.members.length : 0,
        section: cls.section,
        academicYear: cls.academicYear,
        termName: cls.termName
      });
    });
    
    res.json({
      success: true,
      totalClasses: allClasses.length,
      classes: allClasses.map(cls => ({
        classID: cls.classID,
        className: cls.className,
        facultyID: cls.facultyID,
        members: cls.members,
        membersLength: cls.members ? cls.members.length : 0,
        section: cls.section,
        academicYear: cls.academicYear,
        termName: cls.termName
      }))
    });
  } catch (err) {
    console.error('🔍 [Backend] Error in debug classes endpoint:', err);
    res.status(500).json({ error: 'Failed to fetch class data' });
  }
});

// --- GET /debug/users - Debug endpoint to check user data ---
router.get('/debug/users', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 [Backend] Debug users endpoint called');
    
    // Get all users
    const allUsers = await User.find({});
    console.log('🔍 [Backend] Total users found:', allUsers.length);
    
    // Count by role
    const roleCounts = {};
    allUsers.forEach(user => {
      const role = user.role || 'unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
    
    console.log('🔍 [Backend] Users by role:', roleCounts);
    
    // Log first few users of each role
    Object.keys(roleCounts).forEach(role => {
      const usersOfRole = allUsers.filter(u => u.role === role).slice(0, 3);
      console.log(`🔍 [Backend] Sample ${role} users:`, usersOfRole.map(u => ({
        _id: u._id,
        userID: u.userID,
        schoolID: u.schoolID,
        firstname: u.firstname,
        lastname: u.lastname
      })));
    });
    
    res.json({
      success: true,
      totalUsers: allUsers.length,
      roleCounts,
      sampleUsers: Object.keys(roleCounts).reduce((acc, role) => {
        const usersOfRole = allUsers.filter(u => u.role === role).slice(0, 3);
        acc[role] = usersOfRole.map(u => ({
          _id: u._id,
          userID: u.userID,
          schoolID: u.schoolID,
          firstname: u.firstname,
          lastname: u.lastname
        }));
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('🔍 [Backend] Error in debug users endpoint:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// --- GET /debug/class/:classID - Debug endpoint to check specific class ---
router.get('/debug/class/:classID', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    console.log('🔍 [Backend] Debug specific class endpoint called with classID:', classID);
    
    // Get the specific class
    const classDoc = await Class.findOne({ classID });
    if (!classDoc) {
      console.log('🔍 [Backend] Class not found for classID:', classID);
      return res.status(404).json({ error: 'Class not found' });
    }
    
    console.log('🔍 [Backend] Class found:', {
      classID: classDoc.classID,
      className: classDoc.className,
      facultyID: classDoc.facultyID,
      members: classDoc.members,
      membersLength: classDoc.members ? classDoc.members.length : 0
    });
    
    // Try to find the faculty
    const faculty = await User.find({ userID: classDoc.facultyID, isArchived: { $ne: true } });
    console.log('🔍 [Backend] Faculty lookup result:', faculty.length, 'faculty found');
    console.log('🔍 [Backend] Faculty lookup query:', { userID: classDoc.facultyID });
    
    // Try to find faculty by other fields
    const facultyBySchoolID = await User.find({ schoolID: classDoc.facultyID, isArchived: { $ne: true } });
    console.log('🔍 [Backend] Faculty lookup by schoolID result:', facultyBySchoolID.length, 'faculty found');
    
    const facultyByEmail = await User.find({ email: classDoc.facultyID, isArchived: { $ne: true } });
    console.log('🔍 [Backend] Faculty lookup by email result:', facultyByEmail.length, 'faculty found');
    
    // Get all faculty users to see what's available
    const allFaculty = await User.find({ role: 'faculty', isArchived: { $ne: true } });
    console.log('🔍 [Backend] All faculty users:', allFaculty.map(f => ({
      _id: f._id,
      userID: f.userID,
      schoolID: f.schoolID,
      firstname: f.firstname,
      lastname: f.lastname
    })));
    
    res.json({
      success: true,
      class: {
        classID: classDoc.classID,
        className: classDoc.className,
        facultyID: classDoc.facultyID,
        members: classDoc.members,
        membersLength: classDoc.members ? classDoc.members.length : 0
      },
      facultyLookup: {
        byUserID: faculty.length,
        bySchoolID: facultyBySchoolID.length,
        byEmail: facultyByEmail.length
      },
      allFaculty: allFaculty.map(f => ({
        _id: f._id,
        userID: f.userID,
        schoolID: f.schoolID,
        firstname: f.firstname,
        lastname: f.lastname
      }))
    });
  } catch (err) {
    console.error('🔍 [Backend] Error in debug specific class endpoint:', err);
    res.status(500).json({ error: 'Failed to fetch class data' });
  }
});

export default router; 