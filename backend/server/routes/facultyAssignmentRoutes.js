import express from 'express';
import FacultyAssignment from '../models/FacultyAssignment.js';
import User from '../models/User.js'; // To populate faculty details
import { authenticateToken } from '../middleware/authMiddleware.js';
import Term from '../models/Term.js';
import Class from '../models/Class.js';
import StudentAssignment from '../models/StudentAssignment.js';

// Utility to escape user-provided strings for use in regex
const escapeRegex = (str) => String(str || '')
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Test if StudentAssignment import is working
console.log('[FACULTY-ASSIGNMENT] StudentAssignment model loaded:', !!StudentAssignment);

// Auto-create class when faculty assignment is created
const autoCreateClass = async (facultyAssignment) => {
  try {
    console.log('[AUTO-CREATE-CLASS] Starting auto-creation for assignment:', facultyAssignment._id);
    console.log('[AUTO-CREATE-CLASS] Assignment details:', {
      subjectName: facultyAssignment.subjectName,
      sectionName: facultyAssignment.sectionName,
      facultyId: facultyAssignment.facultyId,
      schoolYear: facultyAssignment.schoolYear,
      termName: facultyAssignment.termName
    });
    
    // Normalize/prepare values for matching and saving
    const facultyIdStr = String(facultyAssignment.facultyId || '').trim();
    const subjectName = String(facultyAssignment.subjectName || '').trim();
    const sectionName = String(facultyAssignment.sectionName || '').trim();
    const academicYear = String(facultyAssignment.schoolYear || '').trim();
    const termName = String(facultyAssignment.termName || '').trim();

    // Generate unique classID
    const randomNum = Math.floor(100 + Math.random() * 900);
    const classID = `C${randomNum}`;

    // Generate unique class code with timestamp to ensure uniqueness
    const subjectCode = subjectName.substring(0, 3).toUpperCase();
    const sectionCode = sectionName.substring(0, 2).toUpperCase();
    const yearCode = academicYear.split('-')[0].slice(-2);
    const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
    const classCode = `${subjectCode}-${sectionCode}-${yearCode}-${timestamp}`;
    
    console.log(`[AUTO-CREATE-CLASS] Generated classID: ${classID}, classCode: ${classCode}`);
    
    // Check if class already exists for this faculty assignment (same term & schoolYear)
    const existingClass = await Class.findOne({
      facultyID: facultyIdStr,
      className: { $regex: new RegExp(`^${escapeRegex(subjectName)}$`, 'i') },
      section: { $regex: new RegExp(`^${escapeRegex(sectionName)}$`, 'i') },
      academicYear: academicYear,
      termName: termName
    });
    
    if (existingClass) {
      console.log(`[AUTO-CREATE-CLASS] ⚠️ Class already exists for this assignment: ${existingClass.classID}`);
      return existingClass;
    }
    
          // Get students assigned to this section for this term (include both active and pending)
          console.log(`[AUTO-CREATE-CLASS] Looking for students in section: ${sectionName}, term: ${facultyAssignment.termId}, year: ${academicYear}`);

          // Test StudentAssignment query
          console.log('[AUTO-CREATE-CLASS] Testing StudentAssignment query...');
          console.log('[AUTO-CREATE-CLASS] Query parameters:', {
            sectionName: sectionName,
            termId: facultyAssignment.termId,
            schoolYear: academicYear,
            status: { $in: ['active', 'pending'] }
          });

    const studentAssignments = await StudentAssignment.find({
      sectionName: facultyAssignment.sectionName,
      termId: facultyAssignment.termId,
      schoolYear: facultyAssignment.schoolYear,
      status: { $in: ['active', 'pending'] } // Include both active and pending students
    }).populate('studentId');
    
          console.log(`[AUTO-CREATE-CLASS] Found ${studentAssignments.length} student assignments`);
    
    // Debug: Show details of found assignments
    if (studentAssignments.length > 0) {
      console.log('[AUTO-CREATE-CLASS] Student assignment details:');
      studentAssignments.forEach((assignment, index) => {
        console.log(`  ${index + 1}. Section: ${assignment.sectionName}, Status: ${assignment.status}, Student: ${assignment.studentId ? assignment.studentId.userID : 'NOT LINKED'}`);
      });
    } else {
      console.log('[AUTO-CREATE-CLASS] ❌ No student assignments found! This means no students are assigned to this section.');
      console.log('[AUTO-CREATE-CLASS] Query was looking for:');
      console.log(`  - Section: ${sectionName}`);
      console.log(`  - Term ID: ${facultyAssignment.termId}`);
      console.log(`  - School Year: ${academicYear}`);
      console.log(`  - Status: active or pending`);
    }
    
    // Extract student schoolIDs from assignments (prioritize schoolID over ObjectId)
    const studentSchoolIds = studentAssignments
      .filter(assignment => assignment.studentSchoolID) // Only include assignments with schoolID
      .map(assignment => assignment.studentSchoolID);
    
    // Also get ObjectIds for assignments that have linked students
    const studentIds = studentAssignments
      .filter(assignment => assignment.studentId) // Only include linked students
      .map(assignment => assignment.studentId._id);
    
    // Remove fuzzy name-based matching to avoid accidental cross-matches
    const studentsByName = [];
    
    // First, try to find students by schoolID (PRIORITY METHOD)
    let finalStudentIds = [];
    
    if (studentSchoolIds.length > 0) {
      console.log(`[AUTO-CREATE-CLASS] Found ${studentSchoolIds.length} students by schoolID:`, studentSchoolIds);
      
      // Find User records by schoolID
      const usersBySchoolId = await User.find({
        role: 'students',
        schoolID: { $in: studentSchoolIds },
        isTemporary: { $ne: true },
        userID: { $not: /^TEMP-/ }
      });
      
      console.log(`[AUTO-CREATE-CLASS] Found ${usersBySchoolId.length} User records for students by schoolID`);
      
      // Add schoolIDs to the final list instead of ObjectIds - decrypt schoolID first
      const schoolIdUserIds = usersBySchoolId.map(user => {
        const schoolID = user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID;
        return schoolID || user.userID;
      });
      finalStudentIds.push(...schoolIdUserIds);
      
      // Debug: Show what users were found by schoolID
      if (usersBySchoolId.length > 0) {
        console.log('[AUTO-CREATE-CLASS] Matched users by schoolID:');
        usersBySchoolId.forEach(user => {
          const schoolID = user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID;
          console.log(`  - ${user.userID} (${schoolID}): ${user.firstname} ${user.lastname}`);
        });
      }
    }
    
    // Also add students found by ObjectId (fallback) - convert to schoolIDs
    if (studentIds.length > 0) {
      console.log(`[AUTO-CREATE-CLASS] Converting ${studentIds.length} ObjectIds to schoolIDs`);
      
      // Find users by ObjectId and get their schoolIDs
      const usersById = await User.find({
        _id: { $in: studentIds },
        role: 'students',
        isTemporary: { $ne: true },
        userID: { $not: /^TEMP-/ }
      });
      
      const schoolIdsFromObjectIds = usersById.map(user => {
        const schoolID = user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID;
        return schoolID || user.userID;
      });
      finalStudentIds.push(...schoolIdsFromObjectIds);
    }
    
    // Handle students found by name (last resort)
    // Enforce section restriction hard: do not add anyone outside assignment list
    
    // Remove duplicate student IDs
    // Ensure no TEMP IDs leak through
    const uniqueStudentIds = [...new Set(finalStudentIds
      .map(id => String(id))
      .filter(id => !id.startsWith('TEMP-'))
    )];
    console.log(`[AUTO-CREATE-CLASS] Found ${finalStudentIds.length} students, ${uniqueStudentIds.length} unique students for section ${facultyAssignment.sectionName}`);
    
    // Create the class
    const classData = {
      classID,
      className: subjectName,
      classCode,
      classDesc: `${subjectName} - ${sectionName} (${facultyAssignment.gradeLevel})`,
      members: uniqueStudentIds,
      facultyID: facultyIdStr,
      section: sectionName,
      academicYear: academicYear,
      termName: termName,
      isArchived: false,
      isAutoCreated: true, // Flag to indicate this was auto-created
      needsConfirmation: true // Flag to indicate faculty needs to confirm
    };
    
    console.log(`[AUTO-CREATE-CLASS] Creating class with data:`, classData);
    
    const newClass = new Class(classData);
    const savedClass = await newClass.save();
    
    console.log(`[AUTO-CREATE-CLASS] ✅ Successfully created class ${classID} for ${facultyAssignment.subjectName} - ${facultyAssignment.sectionName}`);
    
    return savedClass;
  } catch (error) {
    console.error('[AUTO-CREATE-CLASS] ❌ Error creating class:', error);
    console.error('[AUTO-CREATE-CLASS] Error message:', error.message);
    console.error('[AUTO-CREATE-CLASS] Error stack:', error.stack);
    throw error;
  }
};

// Validation function to check for faculty assignment conflicts
const validateFacultyAssignment = async (facultyId, subjectName, sectionName, schoolYear, termName, quarterName, excludeAssignmentId = null) => {
  try {
    // Check if the same faculty is already assigned to the same subject-section combination within the same quarter
    const existingAssignment = await FacultyAssignment.findOne({
      subjectName: subjectName,
      sectionName: sectionName,
      schoolYear: schoolYear,
      termName: termName,
      quarterName: quarterName,
      status: 'active',
      facultyId: facultyId, // Same faculty
      ...(excludeAssignmentId && { _id: { $ne: excludeAssignmentId } }) // Exclude current assignment when updating
    }).populate('facultyId', 'firstname lastname');

    if (existingAssignment) {
      return {
        isValid: false,
        conflict: {
          facultyId: existingAssignment.facultyId._id,
          facultyName: `${existingAssignment.facultyId.firstname} ${existingAssignment.facultyId.lastname}`,
          subjectName: existingAssignment.subjectName,
          sectionName: existingAssignment.sectionName
        }
      };
    }

    return { isValid: true, conflict: null };
  } catch (error) {
    console.error('Error validating faculty assignment:', error);
    return { isValid: true, conflict: null }; // Allow assignment if validation fails
  }
};

const router = express.Router();

// Get all faculty assignments (can be filtered by termId)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { termId, quarterName } = req.query;
    let query = {};
    if (termId) {
      query.termId = termId;
    }
    if (quarterName) {
      query.quarterName = quarterName;
    }
    const assignments = await FacultyAssignment.find(query).populate('facultyId');

    // Transform data to include faculty names directly and flatten assignments
    const transformedAssignments = [];
    assignments.forEach(assignment => {
      if (assignment.facultyId) { // Ensure facultyId is populated
        transformedAssignments.push({
          _id: assignment._id, // ID of the assignment document
          facultyId: assignment.facultyId._id,
          facultyName: `${assignment.facultyId.firstname} ${assignment.facultyId.lastname}`,
          facultySchoolID: assignment.facultyId.getDecryptedSchoolID ? assignment.facultyId.getDecryptedSchoolID() : assignment.facultyId.schoolID,
          trackName: assignment.trackName,
          strandName: assignment.strandName,
          sectionName: assignment.sectionName,
          subjectName: assignment.subjectName,
          gradeLevel: assignment.gradeLevel,
          termId: assignment.termId,
          schoolYear: assignment.schoolYear,
          termName: assignment.termName,
          quarterName: assignment.quarterName,
          status: assignment.status // Include the status field
        });
      }
    });

    res.status(200).json(transformedAssignments);
  } catch (error) {
    console.error("Error fetching faculty assignments:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all faculty assignments for a term
router.get('/term/:termId', authenticateToken, async (req, res) => {
  try {
    const filter = { termId: req.params.termId, status: 'active' };
    const { quarterName } = req.query;
    if (quarterName) filter.quarterName = quarterName;
    const assignments = await FacultyAssignment.find(filter)
      .populate('facultyId', 'firstName lastName email')
      .select('-schoolYear -termName'); // Exclude hidden fields from response
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new faculty assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { facultyId, facultyName, trackName, strandName, sectionName, subjectName, gradeLevel, termId, quarterName } = req.body;

    // Get term details to get schoolYear and termName
    const term = await Term.findById(termId);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    let actualFacultyId = facultyId;
    if (!actualFacultyId && facultyName) {
      console.log('Looking for faculty by name:', facultyName);
      let faculty = await User.findOne({
        $or: [
          { $expr: { $eq: [{ $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, facultyName.toLowerCase()] } },
          { firstname: { $regex: new RegExp(facultyName.split(' ')[0], 'i') }, lastname: { $regex: new RegExp(facultyName.split(' ').slice(-1)[0], 'i') } },
          { $expr: { $regexMatch: { input: { $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, regex: facultyName.toLowerCase() } } },
          { firstname: { $regex: new RegExp(facultyName, 'i') } },
          { lastname: { $regex: new RegExp(facultyName, 'i') } }
        ],
        role: 'faculty'
      });

      if (!faculty) {
        console.log('Faculty not found with regex, trying more flexible search...');
        const nameParts = facultyName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          faculty = await User.findOne({
            $and: [
              { role: 'faculty' },
              {
                $or: [
                  { firstname: { $regex: new RegExp(nameParts[0], 'i') } },
                  { firstname: { $regex: new RegExp(nameParts[nameParts.length - 1], 'i') } },
                  { lastname: { $regex: new RegExp(nameParts[0], 'i') } },
                  { lastname: { $regex: new RegExp(nameParts[nameParts.length - 1], 'i') } }
                ]
              }
            ]
          });
        }
      }

      if (!faculty) {
        console.log('All faculty search attempts failed');
        return res.status(400).json({ message: `Faculty '${facultyName}' not found` });
      }
      console.log('Found faculty:', faculty.firstname, faculty.lastname);
      actualFacultyId = faculty._id;
    }

    if (!actualFacultyId) {
      return res.status(400).json({ message: 'facultyId or facultyName is required' });
    }

    // Validate assignment conflicts
    const validation = await validateFacultyAssignment(
      actualFacultyId, 
      subjectName, 
      sectionName, 
      term.schoolYear, 
      term.termName,
      quarterName
    );

    if (!validation.isValid) {
      return res.status(400).json({ 
        message: `This faculty is already assigned to Subject "${subjectName}" in Section "${sectionName}". A faculty cannot be assigned to the same subject in the same section.`,
        conflict: validation.conflict
      });
    }

    const assignment = new FacultyAssignment({
      facultyId: actualFacultyId,
      trackName,
      strandName,
      sectionName,
      subjectName,
      gradeLevel,
      termId,
      schoolYear: term.schoolYear,
      termName: term.termName,
      quarterName
    });

    const newAssignment = await assignment.save();
    
    // Auto-create class for this faculty assignment
    try {
      console.log(`[FACULTY-ASSIGNMENT] Attempting to auto-create class for assignment ${newAssignment._id}`);
      const createdClass = await autoCreateClass(newAssignment);
      console.log(`[FACULTY-ASSIGNMENT] ✅ Auto-created class ${createdClass.classID} for assignment ${newAssignment._id}`);
    } catch (classError) {
      console.error('[FACULTY-ASSIGNMENT] ❌ Failed to auto-create class:', classError);
      console.error('[FACULTY-ASSIGNMENT] Error details:', classError.message);
      console.error('[FACULTY-ASSIGNMENT] Stack trace:', classError.stack);
      // Don't fail the assignment creation if class creation fails
    }
    
    // Exclude hidden fields from response
    const response = newAssignment.toObject();
    delete response.schoolYear;
    delete response.termName;
    res.status(201).json(response);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'This faculty assignment already exists' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Bulk create faculty assignments
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const assignments = req.body;
    const createdAssignments = [];
    const errors = [];

    for (const assignmentData of assignments) {
      const { facultyId, facultyName, trackName, strandName, sectionName, subjectName, gradeLevel, termId, quarterName } = assignmentData;

      try {
        const term = await Term.findById(termId);
        if (!term) {
          errors.push({ assignment: assignmentData, message: 'Term not found' });
          continue;
        }

        let actualFacultyId = facultyId;
        if (!actualFacultyId && facultyName) {
          console.log('Looking for faculty by name:', facultyName);
          let faculty = await User.findOne({
            $or: [
              { $expr: { $eq: [{ $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, facultyName.toLowerCase()] } },
              { firstname: { $regex: new RegExp(facultyName.split(' ')[0], 'i') }, lastname: { $regex: new RegExp(facultyName.split(' ').slice(-1)[0], 'i') } },
              { $expr: { $regexMatch: { input: { $toLower: { $concat: ["$firstname", " ", "$lastname"] } }, regex: facultyName.toLowerCase() } } },
              { firstname: { $regex: new RegExp(facultyName, 'i') } },
              { lastname: { $regex: new RegExp(facultyName, 'i') } }
            ],
            role: 'faculty'
          });

          if (!faculty) {
            console.log('Faculty not found with regex, trying more flexible search...');
            const nameParts = facultyName.trim().split(/\s+/);
            if (nameParts.length >= 2) {
              faculty = await User.findOne({
                $and: [
                  { role: 'faculty' },
                  {
                    $or: [
                      { firstname: { $regex: new RegExp(nameParts[0], 'i') } },
                      { firstname: { $regex: new RegExp(nameParts[nameParts.length - 1], 'i') } },
                      { lastname: { $regex: new RegExp(nameParts[0], 'i') } },
                      { lastname: { $regex: new RegExp(nameParts[nameParts.length - 1], 'i') } }
                    ]
                  }
                ]
              });
            }
          }

          if (!faculty) {
            console.log('All faculty search attempts failed');
            errors.push({ assignment: assignmentData, message: `Faculty '${facultyName}' not found` });
            continue;
          }
          console.log('Found faculty:', faculty.firstname, faculty.lastname);
          actualFacultyId = faculty._id;
        }

        if (!actualFacultyId) {
          errors.push({ assignment: assignmentData, message: 'facultyId or facultyName is required' });
          continue;
        }

        // Validate assignment conflicts for bulk creation
        const validation = await validateFacultyAssignment(
          actualFacultyId, 
          subjectName, 
          sectionName, 
          term.schoolYear, 
          term.termName,
          quarterName
        );

        if (!validation.isValid) {
          errors.push({ 
            assignment: assignmentData, 
            message: `This faculty is already assigned to Subject "${subjectName}" in Section "${sectionName}". A faculty cannot be assigned to the same subject in the same section.`,
            conflict: validation.conflict
          });
          continue;
        }

        const newAssignment = new FacultyAssignment({
          facultyId: actualFacultyId,
          trackName,
          strandName,
          sectionName,
          subjectName,
          gradeLevel,
          termId,
          schoolYear: term.schoolYear,
          termName: term.termName,
          quarterName
        });

        const savedAssignment = await newAssignment.save();
        
        // Auto-create class for this faculty assignment
        try {
          const createdClass = await autoCreateClass(savedAssignment);
          console.log(`[FACULTY-ASSIGNMENT-BULK] Auto-created class ${createdClass.classID} for assignment ${savedAssignment._id}`);
        } catch (classError) {
          console.error('[FACULTY-ASSIGNMENT-BULK] Failed to auto-create class:', classError);
          // Don't fail the assignment creation if class creation fails
        }
        
        createdAssignments.push(savedAssignment);
      } catch (err) {
        if (err.code === 11000) {
          errors.push({ assignment: assignmentData, message: 'This faculty assignment already exists' });
        } else {
          errors.push({ assignment: assignmentData, message: err.message });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(207).json({
        message: 'Some assignments could not be created',
        created: createdAssignments,
        errors: errors
      });
    } else {
      res.status(201).json({
        message: 'All faculty assignments created successfully',
        created: createdAssignments
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a faculty assignment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Delete request received for assignment ID:', req.params.id);
    const assignment = await FacultyAssignment.findById(req.params.id);
    if (!assignment) {
      console.log('Assignment not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Assignment not found' });
    }

    console.log('Found assignment:', assignment);

    // Also delete any auto-created class(es) linked to this assignment (same faculty/subject/section/term/year)
    try {
      const facultyIdStr = String(assignment.facultyId || '').trim();
      const subjectName = String(assignment.subjectName || '').trim();
      const sectionName = String(assignment.sectionName || '').trim();
      const academicYear = String(assignment.schoolYear || '').trim();
      const termName = String(assignment.termName || '').trim();

      const match = {
        isAutoCreated: true,
        facultyID: facultyIdStr,
        academicYear: academicYear,
        termName: termName,
        className: { $regex: new RegExp(`^${escapeRegex(subjectName)}$`, 'i') },
        section: { $regex: new RegExp(`^${escapeRegex(sectionName)}$`, 'i') }
      };

      const classesToDelete = await Class.find(match);
      let deletedClassesCount = 0;
      if (classesToDelete && classesToDelete.length > 0) {
        const delRes = await Class.deleteMany({ _id: { $in: classesToDelete.map(c => c._id) } });
        deletedClassesCount = delRes.deletedCount || 0;
        console.log(`[FACULTY-ASSIGNMENT] Deleted ${deletedClassesCount} auto-created class(es) for assignment ${assignment._id}`);
      }

      await assignment.deleteOne();
      console.log('Assignment deleted successfully');
      return res.json({ message: 'Assignment deleted', autoClassesDeleted: deletedClassesCount });
    } catch (classDelErr) {
      console.error('Failed to delete related auto-created class(es):', classDelErr);
      // Proceed with assignment deletion even if class deletion fails
      await assignment.deleteOne();
      return res.json({ message: 'Assignment deleted (auto-created class deletion failed)', autoClassesDeleted: 0 });
    }
  } catch (err) {
    console.error('Error deleting assignment:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete auto-created class associated with a faculty assignment
router.delete('/:id/auto-class', authenticateToken, async (req, res) => {
  try {
    // Restrict to admin or principal
    if (!req.user || !req.user.role || (req.user.role !== 'admin' && req.user.role !== 'principal')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const assignment = await FacultyAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const facultyIdStr = String(assignment.facultyId || '').trim();
    const subjectName = String(assignment.subjectName || '').trim();
    const sectionName = String(assignment.sectionName || '').trim();
    const academicYear = String(assignment.schoolYear || '').trim();
    const termName = String(assignment.termName || '').trim();

    const match = {
      isAutoCreated: true,
      facultyID: facultyIdStr,
      academicYear: academicYear,
      termName: termName,
      className: { $regex: new RegExp(`^${escapeRegex(subjectName)}$`, 'i') },
      section: { $regex: new RegExp(`^${escapeRegex(sectionName)}$`, 'i') }
    };

    const classes = await Class.find(match);
    if (!classes || classes.length === 0) {
      return res.status(404).json({ message: 'No auto-created class found for this assignment' });
    }

    const result = await Class.deleteMany({ _id: { $in: classes.map(c => c._id) } });
    return res.json({ message: 'Auto-created class(es) deleted', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error deleting auto-created class for assignment:', err);
    return res.status(500).json({ message: err.message });
  }
});

// Unarchive a faculty assignment (must come before the general PATCH route)
router.patch('/:id/unarchive', authenticateToken, async (req, res) => {
  try {
    const assignment = await FacultyAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'archived') {
      return res.status(400).json({ message: 'Assignment is not archived' });
    }

    assignment.status = 'active';
    const updatedAssignment = await assignment.save();
    
    // Transform response to match the format used in GET requests
    const response = updatedAssignment.toObject();
    delete response.schoolYear;
    delete response.termName;
    
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH route for updating faculty assignment
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { trackName, strandName, sectionName, subjectName, gradeLevel, termId, quarterName } = req.body;
    const assignment = await FacultyAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    // Get term details to get schoolYear and termName if termId is provided or original termId
    const currentTermId = termId || assignment.termId;
    const term = await Term.findById(currentTermId);
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }

    // Always validate conflicts on edit - hard gate
    const newSubjectName = subjectName || assignment.subjectName;
    const newSectionName = sectionName || assignment.sectionName;
    
    const validation = await validateFacultyAssignment(
      assignment.facultyId,
      newSubjectName,
      newSectionName,
      term.schoolYear,
      term.termName,
      quarterName,
      req.params.id // Exclude current assignment
    );

    if (!validation.isValid) {
      return res.status(400).json({ 
        message: `This faculty is already assigned to Subject "${newSubjectName}" in Section "${newSectionName}". A faculty cannot be assigned to the same subject in the same section. Please change the subject or section, or delete the conflicting assignment.`,
        conflict: validation.conflict
      });
    }

    assignment.trackName = trackName || assignment.trackName;
    assignment.strandName = strandName || assignment.strandName;
    assignment.sectionName = newSectionName;
    assignment.subjectName = newSubjectName;
    assignment.gradeLevel = gradeLevel || assignment.gradeLevel;
    assignment.termId = currentTermId;
    assignment.schoolYear = term.schoolYear;
    assignment.termName = term.termName;
    if (quarterName !== undefined) {
      assignment.quarterName = quarterName;
    }
    const updatedAssignment = await assignment.save();
    const response = updatedAssignment.toObject();
    delete response.schoolYear;
    delete response.termName;
    res.json(response);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'This faculty assignment already exists' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Update faculty assignments by quarter and school year
router.patch('/quarter/:quarterName/schoolyear/:schoolYear', async (req, res) => {
  try {
    const { quarterName, schoolYear } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const result = await FacultyAssignment.updateMany(
      { 
        quarterName: quarterName,
        schoolYear: schoolYear
      },
      { $set: { status: status } }
    );

    console.log(`Updated ${result.modifiedCount} faculty assignments to status: ${status} for quarter: ${quarterName}, school year: ${schoolYear}`);
    res.json({ 
      message: `Updated ${result.modifiedCount} faculty assignments to status: ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 