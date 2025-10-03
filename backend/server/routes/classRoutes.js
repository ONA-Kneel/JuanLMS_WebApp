// classRoutes.js
// Handles creation and retrieval of class records for JuanLMS.
// Uses Mongoose for class storage.

import express from 'express';
import Class from '../models/Class.js';
import database from '../connect.cjs';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import StudentAssignment from '../models/StudentAssignment.js';
import Registrant from '../models/Registrant.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage configuration
const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);


async function initializeClassStorage() {
  if (USE_CLOUDINARY) {
    console.log('[CLASSES] Using Cloudinary storage');
    try {
      const { classImageStorage } = await import('../config/cloudinary.js');
      return multer({ storage: classImageStorage });
    } catch (error) {
      console.error('[CLASSES] Cloudinary setup failed, falling back to local storage:', error.message);
    }
  }
  
  // Local storage fallback
  console.log('[CLASSES] Using local storage');
  const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-class-' + file.originalname.replace(/\s+/g, ''));
    }
  });
  return multer({ storage: localStorage });
}

// Initialize upload middleware
const upload = await initializeClassStorage();

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
      // First, try to get the active term directly (most reliable)
      const directActiveTermRes = await fetch(`${req.protocol}://${req.get('host')}/api/terms/active`, {
        headers: { "Authorization": `Bearer ${req.headers.authorization?.split(' ')[1]}` }
      });
      if (directActiveTermRes.ok) {
        const directActiveTerm = await directActiveTermRes.json();
        if (directActiveTerm) {
          currentTerm = directActiveTerm;
          // Derive academic year from term's schoolYear field
          if (directActiveTerm.schoolYear) {
            const [start, end] = String(directActiveTerm.schoolYear).split('-').map(Number);
            if (!Number.isNaN(start) && !Number.isNaN(end)) {
              academicYear = { schoolYearStart: start, schoolYearEnd: end };
            }
          }
        }
      }
      
      // If we still don't have academic year, try to fetch it directly
      if (!academicYear) {
        const yearRes = await fetch(`${req.protocol}://${req.get('host')}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${req.headers.authorization?.split(' ')[1]}` }
        });
        if (yearRes.ok) {
          academicYear = await yearRes.json();
        }
      }
      
      // If we have academic year but no term, try to find term for that year
      if (academicYear && !currentTerm) {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const termRes = await fetch(`${req.protocol}://${req.get('host')}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${req.headers.authorization?.split(' ')[1]}` }
        });
        if (termRes.ok) {
          const terms = await termRes.json();
          currentTerm = terms.find(term => term.status === 'active');
        }
      }
      
      console.log('[CREATE-CLASS] Fetched academic year and term:', {
        academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : null,
        currentTerm: currentTerm ? currentTerm.termName : null
      });
      
      // Final fallback: if we still don't have academic year or term, use current date logic
      if (!academicYear || !currentTerm) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // January is 0
        
        // Academic year typically runs from June to May
        let academicYearStart = currentYear;
        if (currentMonth >= 6) { // June or later
          academicYearStart = currentYear;
        } else { // January to May
          academicYearStart = currentYear - 1;
        }
        
        if (!academicYear) {
          academicYear = { schoolYearStart: academicYearStart, schoolYearEnd: academicYearStart + 1 };
          console.log('[CREATE-CLASS] Using fallback academic year from current date:', `${academicYearStart}-${academicYearStart + 1}`);
        }
        
        if (!currentTerm) {
          // Determine term based on month
          let termName = 'Term 1';
          if (currentMonth >= 6 && currentMonth <= 10) { // June to October
            termName = 'Term 1';
          } else if (currentMonth >= 11 || currentMonth <= 3) { // November to March
            termName = 'Term 2';
          } else { // April to May
            termName = 'Term 3';
          }
          
          currentTerm = { termName: termName };
          console.log('[CREATE-CLASS] Using fallback term from current date:', termName);
        }
      }
    } catch (err) {
      console.log('Could not fetch academic year/term, creating class without them:', err.message);
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
      // Handle both Cloudinary and local storage
      imagePath = req.file.secure_url || req.file.path || `/uploads/${req.file.filename}`;
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

    // Validate and normalize members to include only student identifiers and to exclude faculty
    try {
      const memberIds = Array.isArray(classData.members) ? classData.members.map(v => String(v)) : [];
      const facultyIdentifier = classData.facultyID ? String(classData.facultyID) : String(facultyID || '');
      const uniqueIds = Array.from(new Set(memberIds.filter(Boolean).filter(v => v !== facultyIdentifier)));
      if (uniqueIds.length > 0) {
        // Separate ObjectIds from custom IDs to avoid casting errors
        const objectIdPattern = /^[0-9a-fA-F]{24}$/;
        const objectIds = uniqueIds.filter(id => objectIdPattern.test(id));
        const customIds = uniqueIds.filter(id => !objectIdPattern.test(id));
        
        console.log('[CREATE-CLASS] ObjectIds:', objectIds);
        console.log('[CREATE-CLASS] Custom IDs:', customIds);
        
        const validStudents = await User.find({
          role: 'students',
          $or: [
            // Only include ObjectId query if we have valid ObjectIds
            ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
            // Include custom ID queries
            ...(customIds.length > 0 ? [{ userID: { $in: customIds } }] : []),
            ...(customIds.length > 0 ? [{ schoolID: { $in: customIds } }] : [])
          ]
        }).select('_id userID schoolID');
        
        // Filter to only include students who are active AND approved in the current term
        const activeStudentIds = validStudents.map(student => student._id);
        const studentAssignments = await StudentAssignment.find({
          studentId: { $in: activeStudentIds },
          schoolYear: classData.academicYear,
          termName: classData.termName,
          status: 'active'
        }).select('studentId isApproved');

        // Only include students who are both active and approved
        const approvedStudentIdsSet = new Set(
          studentAssignments
            .filter(assignment => assignment.isApproved === true)
            .map(assignment => String(assignment.studentId))
        );
        
        const filteredActiveStudents = validStudents.filter(student => 
          approvedStudentIdsSet.has(String(student._id))
        );
        
        const allowed = filteredActiveStudents.map(u => String(u._id));
        classData.members = allowed;
        console.log('[CREATE-CLASS] Filtered/normalized members (approved active students only):', classData.members.length);
      } else {
        classData.members = [];
      }
    } catch (normErr) {
      console.warn('[CREATE-CLASS] Failed to fully normalize members, proceeding with provided list. Error:', normErr.message);
      // At minimum, ensure faculty is not inside members
      if (Array.isArray(classData.members)) {
        const facultyIdentifier = classData.facultyID ? String(classData.facultyID) : String(facultyID || '');
        classData.members = classData.members.filter(v => String(v) !== facultyIdentifier);
      }
    }
    
    // Always set academic year and term (either from fetched data or fallback)
    if (academicYear && currentTerm) {
      classData.academicYear = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
      classData.termName = currentTerm.termName;
      console.log('[CREATE-CLASS] Set academic year and term:', {
        academicYear: classData.academicYear,
        termName: classData.termName
      });
    } else {
      console.log('[CREATE-CLASS] ERROR: Still missing academic year or term after all fallbacks');
      // This should never happen with our fallback logic, but just in case
      return res.status(500).json({ error: 'Failed to determine academic year and term for class creation' });
    }
    
    if (section) {
      classData.section = section;
    }
    
    console.log('[CREATE-CLASS] Final classData before save:', classData);
    
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
    const { schoolYear, termName } = req.query;
    
    // Build filter object
    let filter = { isArchived: { $ne: true } };
    
    // Add schoolYear filter if provided
    if (schoolYear) {
      filter.academicYear = schoolYear;
    }
    
    // Add termName filter if provided
    if (termName) {
      filter.termName = termName;
    }
    
    console.log('🔍 Classes filter:', filter);
    
    const classes = await Class.find(filter);
    console.log(`✅ Found ${classes.length} classes matching filter`);
    
    res.json(classes);
  } catch (err) {
    console.error('❌ Error fetching classes:', err);
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
      // Ensure the faculty identifier is not part of the member IDs we look up
      const rawMembers = (classDoc.members || []).map(v => String(v));
      const facultyIdentifier = classDoc.facultyID ? String(classDoc.facultyID) : null;
      const memberIdsExcludingFaculty = facultyIdentifier
        ? rawMembers.filter(v => v !== facultyIdentifier)
        : rawMembers;

      // Try to find students by ObjectId first, then fallback to userID, and enforce role filter
      // Separate ObjectIds from custom IDs to avoid casting errors
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;
      const objectIds = memberIdsExcludingFaculty.filter(id => objectIdPattern.test(id));
      const customIds = memberIdsExcludingFaculty.filter(id => !objectIdPattern.test(id));
      
      console.log(`[GET-MEMBERS] ObjectIds:`, objectIds);
      console.log(`[GET-MEMBERS] Custom IDs:`, customIds);
      
      students = await User.find({ 
        role: 'students',
        $or: [
          // Only include ObjectId query if we have valid ObjectIds
          ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
          // Include custom ID queries
          ...(customIds.length > 0 ? [{ userID: { $in: customIds } }] : []),
          ...(customIds.length > 0 ? [{ schoolID: { $in: customIds } }] : [])
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

    // Load class to know facultyID for exclusion
    const existing = await Class.findOne({ classID });
    if (!existing) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Normalize incoming members: unique, exclude faculty, and keep only students
    const incomingIds = members.map(v => String(v)).filter(Boolean);
    const facultyIdentifier = existing.facultyID ? String(existing.facultyID) : null;
    const uniqueIds = Array.from(new Set(incomingIds)).filter(v => v !== facultyIdentifier);

    let normalizedIds = [];
    if (uniqueIds.length > 0) {
      // Separate ObjectIds from custom IDs to avoid casting errors
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;
      const objectIds = uniqueIds.filter(id => objectIdPattern.test(id));
      const customIds = uniqueIds.filter(id => !objectIdPattern.test(id));
      
      console.log(`[PATCH-MEMBERS] ObjectIds:`, objectIds);
      console.log(`[PATCH-MEMBERS] Custom IDs:`, customIds);
      
      const validStudents = await User.find({
        role: 'students',
        $or: [
          // Only include ObjectId query if we have valid ObjectIds
          ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
          // Include custom ID queries
          ...(customIds.length > 0 ? [{ userID: { $in: customIds } }] : []),
          ...(customIds.length > 0 ? [{ schoolID: { $in: customIds } }] : [])
        ]
      }).select('_id userID schoolID');
      
      console.log(`[PATCH-MEMBERS] Found ${validStudents.length} valid students`);
      
      // Create a mapping from MongoDB _id to the original ID that was sent
      const idMapping = {};
      validStudents.forEach(u => {
        // Find the original ID that was sent for this student
        const originalId = uniqueIds.find(id => {
          const stringId = String(id);
          return stringId === String(u._id) || stringId === String(u.userID) || stringId === String(u.schoolID);
        });
        if (originalId) {
          idMapping[String(u._id)] = String(originalId);
        }
      });
      
      normalizedIds = validStudents.map(u => String(u._id));
      console.log(`[PATCH-MEMBERS] ID mapping:`, idMapping);
    }

    const updatedClass = await Class.findOneAndUpdate(
      { classID },
      { members: normalizedIds },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    console.log(`[PATCH-MEMBERS] Successfully updated class ${classID} with ${members.length} members`);

    // Return the updated class with members, but also include the original IDs that were sent
    const responseData = {
      ...updatedClass.toObject(),
      originalMemberIds: uniqueIds // Include the original IDs that were sent
    };
    
    res.json(responseData);
  } catch (err) {
    console.error('[PATCH-MEMBERS] Error:', err);
    res.status(500).json({ error: 'Failed to update class members' });
  }
});


// Get all class members with registration status (active/pending)
router.get('/:classID/members-with-status', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    
    // Find the class
    const classDoc = await Class.findOne({ classID });
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    console.log(`[GET-MEMBERS-STATUS] Getting members for class ${classID}`);
    console.log(`[GET-MEMBERS-STATUS] Class section: ${classDoc.section}, academic year: ${classDoc.academicYear}, term: ${classDoc.termName}`);
    
    // Get faculty
    const faculty = await User.findOne({ 
      $or: [
        { _id: classDoc.facultyID },
        { userID: classDoc.facultyID }
      ],
      isArchived: { $ne: true } 
    });
    
    // Get all student assignments for this section/term/year
    const studentAssignments = await StudentAssignment.find({
      sectionName: classDoc.section,
      schoolYear: classDoc.academicYear,
      termName: classDoc.termName
    }).populate('studentId');
    
    console.log(`[GET-MEMBERS-STATUS] Found ${studentAssignments.length} student assignments`);
    
    // Log assignment details for debugging
    studentAssignments.forEach((assignment, index) => {
      console.log(`[GET-MEMBERS-STATUS] Assignment ${index + 1}:`, {
        studentName: assignment.studentName || (assignment.studentId ? `${assignment.studentId.firstname} ${assignment.studentId.lastname}` : 'Unknown'),
        status: assignment.status,
        isApproved: assignment.isApproved,
        studentId: assignment.studentId ? 'Linked' : 'Not Linked',
        studentIdExists: !!assignment.studentId,
        studentIdId: assignment.studentId ? assignment.studentId._id : 'N/A',
        isArchived: assignment.studentId ? assignment.studentId.isArchived : 'N/A'
      });
    });
    
    // Process students with their status
    const studentsWithStatus = [];
    
    for (const assignment of studentAssignments) {
      let studentData = null;
      let registrationStatus = 'pending';
      
      if (assignment.studentId) {
        // Student is properly linked to User record
        studentData = {
          _id: assignment.studentId._id,
          userID: assignment.studentId.userID,
          firstname: assignment.studentId.firstname,
          lastname: assignment.studentId.lastname,
          email: assignment.studentId.getDecryptedEmail ? assignment.studentId.getDecryptedEmail() : assignment.studentId.email,
          schoolID: assignment.studentId.getDecryptedSchoolID ? assignment.studentId.getDecryptedSchoolID() : assignment.studentId.schoolID,
          role: assignment.studentId.role
        };
        // Use the actual assignment status from StudentAssignment record
        // Only show as 'active' if student is registered AND has active assignment
        // Check if studentId is properly populated and user is not archived
        const isRegistered = assignment.studentId && assignment.studentId._id && !assignment.studentId.isArchived;
        registrationStatus = (assignment.status === 'active' && isRegistered) ? 'active' : 'pending';
        
        console.log(`[GET-MEMBERS-STATUS] Student ${assignment.studentId.firstname} ${assignment.studentId.lastname}:`, {
          assignmentStatus: assignment.status,
          isRegistered: isRegistered,
          finalStatus: registrationStatus
        });
      } else if (assignment.studentName) {
        // Student only has name, not linked to User record
        // But we should check if they exist in the User table and are approved
        const studentFirstName = assignment.firstName || assignment.studentName.split(' ')[0];
        const studentLastName = assignment.lastName || assignment.studentName.split(' ').slice(-1)[0];
        
        // Check if student is approved in REGISTRANTS table by SCHOOL ID
        const approvedRegistrant = await Registrant.findOne({
          schoolID: assignment.studentSchoolID,
          status: 'approved'
        });
        
        if (approvedRegistrant) {
          // Student is approved in registrants! Now find their User record for system email
          const systemUser = await User.findOne({
            schoolID: approvedRegistrant.schoolID,
            role: 'students',
            isArchived: { $ne: true }
          });
          
          studentData = {
            _id: assignment._id, // Use assignment ID as temporary ID
            userID: approvedRegistrant.schoolID,
            firstname: approvedRegistrant.firstName,
            lastname: approvedRegistrant.lastName,
            email: systemUser ? (systemUser.getDecryptedEmail ? systemUser.getDecryptedEmail() : systemUser.email) : approvedRegistrant.personalEmail,
            schoolID: approvedRegistrant.schoolID,
            role: 'students'
          };
          
          // If student is approved in registrants AND assignment is active, show as ACTIVE
          registrationStatus = (assignment.status === 'active') ? 'active' : 'pending';
          
          console.log(`[GET-MEMBERS-STATUS] Found APPROVED registrant for ${assignment.studentName}:`, {
            schoolID: approvedRegistrant.schoolID,
            firstName: approvedRegistrant.firstName,
            lastName: approvedRegistrant.lastName,
            status: approvedRegistrant.status,
            assignmentStatus: assignment.status,
            finalStatus: registrationStatus
          });
        } else {
          // Student not approved in registrants, use assignment data
          studentData = {
            _id: assignment._id, // Use assignment ID as temporary ID
            userID: assignment.studentSchoolID || 'N/A',
            firstname: studentFirstName,
            lastname: studentLastName,
            email: 'Not registered',
            schoolID: assignment.studentSchoolID || 'N/A',
            role: 'students'
          };
          // Students not approved in registrants should be pending
          registrationStatus = 'pending';
          
          console.log(`[GET-MEMBERS-STATUS] No approved registrant found for ${assignment.studentName}, using assignment data`);
        }
      }
      
      if (studentData) {
        studentsWithStatus.push({
          ...studentData,
          registrationStatus,
          assignmentId: assignment._id,
          assignmentStatus: assignment.status
        });
      }
    }
    
    console.log(`[GET-MEMBERS-STATUS] Returning ${studentsWithStatus.length} students with status`);
    
    // Decrypt faculty data
    const decryptedFaculty = faculty ? {
      _id: faculty._id,
      userID: faculty.userID,
      firstname: faculty.firstname,
      lastname: faculty.lastname,
      email: faculty.getDecryptedEmail ? faculty.getDecryptedEmail() : faculty.email,
      schoolID: faculty.getDecryptedSchoolID ? faculty.getDecryptedSchoolID() : faculty.schoolID,
      role: faculty.role
    } : null;
    
    res.json({
      faculty: decryptedFaculty,
      students: studentsWithStatus,
      totalStudents: studentsWithStatus.length,
      activeStudents: studentsWithStatus.filter(s => s.registrationStatus === 'active').length,
      pendingStudents: studentsWithStatus.filter(s => s.registrationStatus === 'pending').length
    });
    
  } catch (err) {
    console.error('[GET-MEMBERS-STATUS] Error:', err);
    res.status(500).json({ error: 'Failed to fetch class members with status' });
  }
});

// Get all classes for the logged-in user (student or faculty)
router.get('/my-classes', authenticateToken, async (req, res) => {
  try {
    const userID = req.user.userID;
    const userRole = req.user.role;
    const userObjectId = req.user._id;
    
    console.log(`[MY-CLASSES] User ID: ${userID}, Role: ${userRole}, ObjectId: ${userObjectId}`);
    console.log(`[MY-CLASSES] Full user object:`, req.user);
    
    let classes = [];
    if (userRole === 'faculty') {
      // Faculty: classes where facultyID matches
      console.log(`[MY-CLASSES] Processing as faculty user`);
      
      // Find classes where facultyID matches ObjectId or userID
      // Only show confirmed classes in the main faculty classes view
      classes = await Class.find({ 
        $or: [
          { facultyID: userObjectId }, // ObjectId
          { facultyID: userID } // userID fallback
        ],
        isArchived: { $ne: true },
        $and: [
          {
            $or: [
              { needsConfirmation: { $ne: true } },
              { needsConfirmation: { $exists: false } }
            ]
          },
          {
            $or: [
              { isAutoCreated: { $ne: true } },
              { isAutoCreated: { $exists: false } }
            ]
          }
        ]
      });
      console.log(`[MY-CLASSES] Found ${classes.length} classes as faculty`);
      console.log(`[MY-CLASSES] Classes found:`, classes.map(c => ({ 
        classID: c.classID, 
        className: c.className, 
        facultyID: c.facultyID,
        academicYear: c.academicYear,
        termName: c.termName,
        needsConfirmation: c.needsConfirmation,
        isAutoCreated: c.isAutoCreated
      })));
      
    } else if (userRole === 'students') {
      // Student: classes where members includes the student's ObjectId
      console.log(`[MY-CLASSES] Processing as student user`);
      
      // Find classes where the student's ObjectId is in the members array
      // Only show confirmed classes (not auto-created or needing confirmation)
      classes = await Class.find({ 
        members: userObjectId,
        $and: [
          {
            $or: [
              { needsConfirmation: { $ne: true } },
              { needsConfirmation: { $exists: false } }
            ]
          },
          {
            $or: [
              { isAutoCreated: { $ne: true } },
              { isAutoCreated: { $exists: false } }
            ]
          }
        ]
      });
      
      console.log(`[MY-CLASSES] Found ${classes.length} classes as student`);
      console.log(`[MY-CLASSES] Classes found:`, classes.map(c => ({ 
        classID: c.classID, 
        className: c.className, 
        members: c.members,
        facultyID: c.facultyID,
        needsConfirmation: c.needsConfirmation,
        isAutoCreated: c.isAutoCreated
      })));
      
    } else {
      // Other roles: return both sets (union, no duplicates)
      console.log(`[MY-CLASSES] Processing as ${userRole} user - checking both faculty and member roles`);
      
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
      
      console.log(`[MY-CLASSES] Found ${asFaculty.length} classes as faculty, ${asMember.length} as member, ${classes.length} total after deduplication`);
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
    const userObjectId = req.user._id;
    
    // Only allow faculty to access this endpoint
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }
    
    // Get classes where the logged-in faculty is assigned (support both ObjectId and legacy userID string)
    // Only show confirmed classes in the main faculty classes view
    const classes = await Class.find({
      $or: [
        { facultyID: userObjectId },
        { facultyID: userID }
      ],
      isArchived: { $ne: true },
      $and: [
        {
          $or: [
            { needsConfirmation: { $ne: true } },
            { needsConfirmation: { $exists: false } }
          ]
        },
        {
          $or: [
            { isAutoCreated: { $ne: true } },
            { isAutoCreated: { $exists: false } }
          ]
        }
      ]
    });
    res.json(classes);
  } catch (err) {
    console.error('Error fetching faculty classes:', err);
    res.status(500).json({ error: 'Failed to fetch faculty classes.' });
  }
});

// Get classes that need confirmation (auto-created classes)
router.get('/pending-confirmation', authenticateToken, async (req, res) => {
  try {
    const userID = req.user.userID;
    const userObjectId = req.user._id;
    
    // Only allow faculty to access this endpoint
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }
    
    // Get auto-created classes that need confirmation for this faculty
    const classes = await Class.find({
      $or: [
        { facultyID: userObjectId },
        { facultyID: userID }
      ],
      isAutoCreated: true,
      needsConfirmation: true,
      isArchived: { $ne: true }
    });
    
    res.json(classes);
  } catch (err) {
    console.error('Error fetching pending confirmation classes:', err);
    res.status(500).json({ error: 'Failed to fetch pending confirmation classes.' });
  }
});

// Get all faculty classes (including unconfirmed) - for admin or special views
router.get('/faculty-all-classes', authenticateToken, async (req, res) => {
  try {
    const userID = req.user.userID;
    const userObjectId = req.user._id;
    
    // Only allow faculty to access this endpoint
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }
    
    // Get all classes for this faculty (including unconfirmed)
    const classes = await Class.find({
      $or: [
        { facultyID: userObjectId },
        { facultyID: userID }
      ],
      isArchived: { $ne: true }
    });
    
    res.json(classes);
  } catch (err) {
    console.error('Error fetching all faculty classes:', err);
    res.status(500).json({ error: 'Failed to fetch all faculty classes.' });
  }
});

// Confirm/update an auto-created class
router.patch('/:classID/confirm', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { classID } = req.params;
    const { classDesc } = req.body;
    const userID = req.user.userID;
    const userObjectId = req.user._id;
    
    // Find the class and verify faculty ownership
    const classDoc = await Class.findOne({
      classID,
      $or: [
        { facultyID: userObjectId },
        { facultyID: userID }
      ],
      isAutoCreated: true,
      needsConfirmation: true
    });
    
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found or not available for confirmation' });
    }
    
    // Update the class
    const updateData = {
      needsConfirmation: false,
      isAutoCreated: false // Mark as confirmed
    };
    
    if (classDesc) {
      updateData.classDesc = classDesc;
    }
    
    // Handle image upload
    if (req.file) {
      // Handle both Cloudinary and local storage
      updateData.image = req.file.secure_url || req.file.path || `/uploads/${req.file.filename}`;
    }
    
    const updatedClass = await Class.findOneAndUpdate(
      { classID },
      updateData,
      { new: true }
    );
    
    // Update student assignments to reflect that students are now active in this confirmed class
    try {
      console.log(`[CONFIRM-CLASS] Updating student assignments for class ${classID}`);
      console.log(`[CONFIRM-CLASS] Class details:`, {
        section: classDoc.section,
        academicYear: classDoc.academicYear,
        termName: classDoc.termName,
        members: classDoc.members
      });
      
      // Update student assignments for students in this class
      const studentAssignmentUpdate = await StudentAssignment.updateMany(
        {
          sectionName: classDoc.section,
          schoolYear: classDoc.academicYear,
          termName: classDoc.termName,
          studentId: { $in: classDoc.members }
        },
        {
          $set: { 
            status: 'active',
            isApproved: true // Add this field to track approval status
          }
        }
      );
      
      console.log(`[CONFIRM-CLASS] Updated ${studentAssignmentUpdate.modifiedCount} student assignments to active status`);
      
      // Also update any student assignments that don't have studentId but match the section/year/term
      const studentAssignmentUpdateByName = await StudentAssignment.updateMany(
        {
          sectionName: classDoc.section,
          schoolYear: classDoc.academicYear,
          termName: classDoc.termName,
          studentId: { $exists: false }
        },
        {
          $set: { 
            status: 'active',
            isApproved: true
          }
        }
      );
      
      console.log(`[CONFIRM-CLASS] Updated ${studentAssignmentUpdateByName.modifiedCount} student assignments by name to active status`);
      
    } catch (studentUpdateError) {
      console.error('[CONFIRM-CLASS] Error updating student assignments:', studentUpdateError);
      // Don't fail the class confirmation if student assignment update fails
    }
    
    res.json(updatedClass);
  } catch (err) {
    console.error('Error confirming class:', err);
    res.status(500).json({ error: 'Failed to confirm class.' });
  }
});

// Utility endpoint to analyze class members and identify conflicts (admin only)
router.get('/:classID/analyze-members', authenticateToken, async (req, res) => {
  try {
    const { classID } = req.params;
    
    // Only admin can access this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied. Admin only.' 
      });
    }
    
    const classDoc = await Class.findOne({ classID });
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    console.log(`[ANALYZE-MEMBERS] Analyzing class ${classID}:`, {
      className: classDoc.className,
      facultyID: classDoc.facultyID,
      members: classDoc.members
    });
    
    // Get faculty details
    let faculty = null;
    if (classDoc.facultyID) {
      faculty = await User.findOne({ 
        $or: [
          { _id: classDoc.facultyID },
          { userID: classDoc.facultyID }
        ]
      });
    }
    
    // Get student details
    let students = [];
    if (classDoc.members && classDoc.members.length > 0) {
      // Separate ObjectIds from custom IDs to avoid casting errors
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;
      const objectIds = classDoc.members.filter(id => objectIdPattern.test(String(id)));
      const customIds = classDoc.members.filter(id => !objectIdPattern.test(String(id)));
      
      console.log(`[ANALYZE-MEMBERS] ObjectIds:`, objectIds);
      console.log(`[ANALYZE-MEMBERS] Custom IDs:`, customIds);
      
      students = await User.find({ 
        $or: [
          // Only include ObjectId query if we have valid ObjectIds
          ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
          // Include custom ID queries
          ...(customIds.length > 0 ? [{ userID: { $in: customIds } }] : []),
          ...(customIds.length > 0 ? [{ schoolID: { $in: customIds } }] : [])
        ]
      });
    }
    
    // Check for conflicts
    const conflicts = [];
    if (faculty && students.length > 0) {
      for (const student of students) {
        if (faculty._id.toString() === student._id.toString() || 
            faculty.userID === student.userID) {
          conflicts.push({
            type: 'DUPLICATE_USER',
            message: `User ${faculty.firstname} ${faculty.lastname} appears as both faculty and student`,
            faculty: {
              _id: faculty._id,
              userID: faculty.userID,
              role: faculty.role,
              schoolID: faculty.getDecryptedSchoolID ? faculty.getDecryptedSchoolID() : faculty.schoolID
            },
            student: {
              _id: student._id,
              userID: student.userID,
              role: student.role,
              schoolID: student.getDecryptedSchoolID ? student.getDecryptedSchoolID() : student.schoolID
            }
          });
        }
      }
    }
    
    // Check for role inconsistencies
    if (faculty && faculty.role !== 'faculty') {
      conflicts.push({
        type: 'WRONG_FACULTY_ROLE',
        message: `Faculty user has wrong role: ${faculty.role}`,
        user: {
          _id: faculty._id,
          userID: faculty.userID,
          role: faculty.role,
          schoolID: faculty.getDecryptedSchoolID ? faculty.getDecryptedSchoolID() : faculty.schoolID
        }
      });
    }
    
    for (const student of students) {
      if (student.role !== 'students') {
        conflicts.push({
          type: 'WRONG_STUDENT_ROLE',
          message: `Student user has wrong role: ${student.role}`,
          user: {
            _id: student._id,
            userID: student.userID,
            role: student.role,
            schoolID: student.getDecryptedSchoolID ? student.getDecryptedSchoolID() : student.schoolID
          }
        });
      }
    }
    
    res.json({
      classID: classID,
      className: classDoc.className,
      faculty: faculty ? {
        _id: faculty._id,
        userID: faculty.userID,
        firstname: faculty.firstname,
        lastname: faculty.lastname,
        role: faculty.role,
        schoolID: faculty.getDecryptedSchoolID ? faculty.getDecryptedSchoolID() : faculty.schoolID,
        email: faculty.getDecryptedEmail ? faculty.getDecryptedEmail() : faculty.email
      } : null,
      students: students.map(student => ({
        _id: student._id,
        userID: student.userID,
        firstname: student.firstname,
        lastname: student.lastname,
        role: student.role,
        schoolID: student.getDecryptedSchoolID ? student.getDecryptedSchoolID() : student.schoolID,
        email: student.getDecryptedEmail ? student.getDecryptedEmail() : student.email
      })),
      conflicts: conflicts,
      hasConflicts: conflicts.length > 0
    });
    
  } catch (err) {
    console.error('[ANALYZE-MEMBERS] Error:', err);
    res.status(500).json({ error: 'Failed to analyze class members.' });
  }
});

export default router; 