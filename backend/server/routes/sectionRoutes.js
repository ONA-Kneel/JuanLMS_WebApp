import express from 'express';
import Section from '../models/Section.js';
import Term from '../models/Term.js';
import StudentAssignment from '../models/StudentAssignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';

const router = express.Router();

console.log('🚀 SECTION ROUTES LOADED - LOGGING IS ACTIVE!');

// Middleware to log all requests to sections
router.use((req, res, next) => {
  console.log(`📡 SECTION ROUTE HIT: ${req.method} ${req.path}`);
  console.log('Request body:', req.body);
  next();
});

// Get all sections
router.get('/', async (req, res) => {
  try {
    const { schoolYear, termName, quarterName } = req.query;
    const filter = {};
    
    // If schoolYear and termName are provided, filter by them
    if (schoolYear) filter.schoolYear = schoolYear;
    if (termName) filter.termName = termName;
    if (quarterName) filter.quarterName = quarterName;
    
    const sections = await Section.find(filter).sort({ sectionName: 1 });
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all sections for a specific track and strand
router.get('/track/:trackName/strand/:strandName', async (req, res) => {
  try {
    const { trackName, strandName } = req.params;
    const { schoolYear, termName, quarterName } = req.query;
    const filter = { trackName, strandName };
    if (schoolYear) filter.schoolYear = schoolYear;
    if (termName) filter.termName = termName;
    if (quarterName) filter.quarterName = quarterName;
    const sections = await Section.find(filter);
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all sections for a specific term by term ID (more precise)
router.get('/termId/:termId', async (req, res) => {
  try {
    const { termId } = req.params;
    const { quarterName } = req.query;
    
    // First get the term details to get schoolYear and termName
    const term = await Term.findById(termId);
    
    if (!term) {
      return res.status(404).json({ message: 'Term not found' });
    }
    
    // Get sections for this specific school year and term, regardless of status
    const filter = { schoolYear: term.schoolYear, termName: term.termName };
    if (quarterName) filter.quarterName = quarterName;
    const sections = await Section.find(filter).sort({ sectionName: 1 });
    
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to generate section code
const generateSectionCode = (sectionName) => {
  console.log('generateSectionCode called with:', sectionName);
  
  if (!sectionName || typeof sectionName !== 'string') {
    console.log('Invalid section name, returning default');
    return 'SEC' + Math.floor(Math.random() * 1000);
  }
  
  // Clean the section name
  const cleanName = sectionName.trim();
  if (cleanName.length === 0) {
    console.log('Empty section name, returning default');
    return 'SEC' + Math.floor(Math.random() * 1000);
  }
  
  // Extract first letter of each word and make it uppercase
  const words = cleanName.split(' ').filter(word => word.length > 0);
  let code = '';
  
  for (const word of words) {
    if (word.length > 0) {
      code += word.charAt(0).toUpperCase();
    }
  }
  
  console.log('Initial code from words:', code);
  
  // If code is too short, add more characters from the section name
  if (code.length < 2) {
    const cleanNameNoSpaces = cleanName.replace(/\s+/g, ''); // Remove spaces
    for (let i = 1; i < cleanNameNoSpaces.length && code.length < 3; i++) {
      code += cleanNameNoSpaces.charAt(i).toUpperCase();
    }
  }
  
  console.log('Code after adding more characters:', code);
  
  // Ensure we have at least 2 characters
  if (code.length < 2) {
    code = cleanName.substring(0, Math.min(2, cleanName.length)).toUpperCase();
  }
  
  // Final fallback
  if (!code || code.length === 0) {
    code = 'SEC' + Math.floor(Math.random() * 1000);
  }
  
  console.log('Final generated code:', code);
  
  // Test the generated code
  if (!code || code.trim() === '') {
    console.error('CRITICAL: Generated code is empty!');
    code = 'SEC' + Math.floor(Math.random() * 1000);
    console.log('Emergency fallback code:', code);
  }
  
  return code;
};

// Create a new section
router.post('/', async (req, res) => {
  console.log('🔥🔥🔥 SECTION POST ROUTE HIT! 🔥🔥🔥');
  console.log('=== SECTION CREATION REQUEST STARTED ===');
  console.log('Full request body:', req.body);
  
  const { sectionName, trackName, strandName, gradeLevel, schoolYear, termName, quarterName } = req.body;
  
  console.log('Extracted fields:', { sectionName, trackName, strandName, gradeLevel, schoolYear, termName, quarterName });

  // Validate required fields
  const missingFields = [];
  if (!sectionName || sectionName.trim() === '') missingFields.push('sectionName');
  if (!trackName || trackName.trim() === '') missingFields.push('trackName');
  if (!strandName || strandName.trim() === '') missingFields.push('strandName');
  if (!gradeLevel || gradeLevel.trim() === '') missingFields.push('gradeLevel');

  if (missingFields.length > 0) {
    console.log('❌ MISSING REQUIRED FIELDS:', missingFields);
    return res.status(400).json({ 
      message: `Missing required fields: ${missingFields.join(', ')}`,
      missingFields: missingFields
    });
  }

  if (!['Grade 11', 'Grade 12'].includes(gradeLevel)) {
    console.log('❌ INVALID GRADE LEVEL:', gradeLevel);
    return res.status(400).json({ message: 'Grade Level must be "Grade 11" or "Grade 12"' });
  }
  
  console.log('✅ VALIDATION PASSED - All required fields present');

  try {
    console.log('🔍 CHECKING TERM INFORMATION...');
    // Use provided schoolYear and termName, or fall back to current active term
    let targetSchoolYear = schoolYear;
    let targetTermName = termName;
    let targetQuarterName = quarterName;
    
    console.log('Target values:', { targetSchoolYear, targetTermName, targetQuarterName });
    
    if (!targetSchoolYear || !targetTermName) {
      console.log('⚠️ Missing schoolYear or termName, looking for active term...');
      const currentTerm = await Term.findOne({ status: 'active' });
      if (!currentTerm) {
        console.log('❌ NO ACTIVE TERM FOUND');
        return res.status(400).json({ message: 'No active term found and no school year/term provided' });
      }
      targetSchoolYear = currentTerm.schoolYear;
      targetTermName = currentTerm.termName;
      console.log('✅ Found active term:', { targetSchoolYear, targetTermName });
    }

    // Check for existing section with same name in the same track, strand, school year, and term
    console.log('🔍 CHECKING FOR EXISTING SECTION...');
    const existingSection = await Section.findOne({ 
      sectionName: new RegExp(`^${sectionName}$`, 'i'),
      trackName,
      strandName,
      schoolYear: targetSchoolYear,
      termName: targetTermName
    });
    if (existingSection) {
      console.log('❌ SECTION ALREADY EXISTS:', existingSection);
      return res.status(409).json({ message: 'Section already exists in this track, strand, school year, and term.' });
    }
    console.log('✅ No existing section found, proceeding with creation...');

    // Generate unique section code
    console.log('=== STARTING SECTION CODE GENERATION ===');
    console.log('Section name received:', sectionName);
    
    let sectionCode;
    try {
      sectionCode = generateSectionCode(sectionName);
      console.log('Generated section code for', sectionName, ':', sectionCode);
      
      // Ensure section code is not empty
      if (!sectionCode || sectionCode.trim() === '') {
        sectionCode = 'SEC' + Math.floor(Math.random() * 1000);
        console.log('Generated fallback section code:', sectionCode);
      }
    } catch (codeError) {
      console.error('Error generating section code:', codeError);
      sectionCode = 'SEC' + Math.floor(Math.random() * 1000);
      console.log('Generated fallback section code due to error:', sectionCode);
    }
    
    console.log('=== FINAL SECTION CODE ===', sectionCode);
    
    let counter = 1;
    
    // Ensure section code is unique
    while (await Section.findOne({ sectionCode })) {
      sectionCode = generateSectionCode(sectionName) + counter.toString();
      counter++;
      console.log('Section code conflict, trying:', sectionCode);
    }

    // Final validation - ensure sectionCode is never empty
    if (!sectionCode || sectionCode.trim() === '') {
      sectionCode = 'SEC' + Math.floor(Math.random() * 1000);
      console.log('⚠️ Section code was empty, generated fallback:', sectionCode);
    }
    
    console.log('🏗️ CREATING SECTION OBJECT...');
    const newSection = new Section({ 
      sectionName, 
      sectionCode,
      trackName, 
      strandName, 
      gradeLevel,
      schoolYear: targetSchoolYear,
      termName: targetTermName,
      quarterName: targetQuarterName
    });
    
    console.log('📝 SECTION OBJECT CREATED:', {
      sectionName,
      sectionCode,
      trackName,
      strandName,
      gradeLevel,
      schoolYear: targetSchoolYear,
      termName: targetTermName,
      quarterName: targetQuarterName
    });
    
    try {
      console.log('💾 ATTEMPTING TO SAVE SECTION TO DATABASE...');
      await newSection.save();
      console.log('✅ SECTION SAVED SUCCESSFULLY! ID:', newSection._id);
      res.status(201).json(newSection);
    } catch (saveError) {
      console.error('❌ DATABASE SAVE ERROR:', saveError);
      console.error('Error name:', saveError.name);
      console.error('Error message:', saveError.message);
      console.error('Error code:', saveError.code);
      console.error('Error keyPattern:', saveError.keyPattern);
      console.error('Error keyValue:', saveError.keyValue);
      
      if (saveError.code === 11000) {
        return res.status(400).json({ 
          message: 'Section code already exists. Please try again.',
          error: 'DUPLICATE_CODE'
        });
      }
      throw saveError;
    }
  } catch (error) {
    console.error('❌❌❌ SECTION CREATION FAILED ❌❌❌');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    
    res.status(400).json({ 
      message: error.message,
      error: error.name,
      details: error.keyPattern || error.keyValue
    });
  }
});

// Update a section
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { sectionName, trackName, strandName, gradeLevel } = req.body;

  if (!sectionName || !trackName || !strandName || !gradeLevel) {
    return res.status(400).json({ message: 'Section name, track name, strand name, and grade level are required' });
  }
  if (!['Grade 11', 'Grade 12'].includes(gradeLevel)) {
    return res.status(400).json({ message: 'Grade Level must be "Grade 11" or "Grade 12"' });
  }

  try {
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Get the current active term
    const currentTerm = await Term.findOne({ status: 'active' });
    if (!currentTerm) {
      return res.status(400).json({ message: 'No active term found' });
    }

    // Check for existing section with same name in the same track, strand, school year, and term, excluding current
    const existingSection = await Section.findOne({ 
      sectionName: new RegExp(`^${sectionName}$`, 'i'),
      trackName,
      strandName,
      schoolYear: currentTerm.schoolYear,
      termName: currentTerm.termName,
      _id: { $ne: id }
    });
    if (existingSection) {
      return res.status(409).json({ message: 'Section name must be unique within the same track, strand, school year, and term.' });
    }

    // Store original values for cascading updates
    const originalSectionName = section.sectionName;
    const originalTrackName = section.trackName;
    const originalStrandName = section.strandName;
    const originalGradeLevel = section.gradeLevel;
    
    section.sectionName = sectionName;
    section.trackName = trackName;
    section.strandName = strandName;
    section.gradeLevel = gradeLevel;
    section.schoolYear = currentTerm.schoolYear;
    section.termName = currentTerm.termName;
    
    // Regenerate section code if section name changed
    if (originalSectionName !== sectionName) {
      let sectionCode = generateSectionCode(sectionName);
      let counter = 1;
      
      // Ensure section code is unique
      while (await Section.findOne({ sectionCode, _id: { $ne: id } })) {
        sectionCode = generateSectionCode(sectionName) + counter.toString();
        counter++;
      }
      section.sectionCode = sectionCode;
    }

    await section.save();

    // Cascade update to all related entities if any values changed
    if (originalSectionName !== sectionName || originalTrackName !== trackName || 
        originalStrandName !== strandName || originalGradeLevel !== gradeLevel) {
      console.log(`Cascading section update from "${originalTrackName}/${originalStrandName}/${originalSectionName}" to "${trackName}/${strandName}/${sectionName}"`);
      
      await Promise.all([
        // Update student assignments
        StudentAssignment.updateMany(
          { 
            trackName: originalTrackName,
            strandName: originalStrandName,
            sectionName: originalSectionName,
            gradeLevel: originalGradeLevel,
            schoolYear: currentTerm.schoolYear, 
            termName: currentTerm.termName 
          },
          { $set: { 
            trackName: trackName, 
            strandName: strandName, 
            sectionName: sectionName, 
            gradeLevel: gradeLevel 
          } }
        ),
        
        // Update faculty assignments
        FacultyAssignment.updateMany(
          { 
            trackName: originalTrackName,
            strandName: originalStrandName,
            sectionName: originalSectionName,
            gradeLevel: originalGradeLevel,
            schoolYear: currentTerm.schoolYear, 
            termName: currentTerm.termName 
          },
          { $set: { 
            trackName: trackName, 
            strandName: strandName, 
            sectionName: sectionName, 
            gradeLevel: gradeLevel 
          } }
        )
      ]);
      
      console.log(`Successfully cascaded section update to all related entities`);
    }

    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Check section dependencies before deletion
router.get('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    const section = await Section.findById(id);
    
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Check all dependencies
    const [studentAssignments, facultyAssignments] = await Promise.all([
      StudentAssignment.find({ 
        trackName: section.trackName,
        strandName: section.strandName,
        sectionName: section.sectionName, 
        schoolYear: section.schoolYear, 
        termName: section.termName 
      }),
      FacultyAssignment.find({ 
        trackName: section.trackName,
        strandName: section.strandName,
        sectionName: section.sectionName, 
        schoolYear: section.schoolYear, 
        termName: section.termName 
      })
    ]);

    const dependencies = {
      section: section,
      studentAssignments: studentAssignments,
      facultyAssignments: facultyAssignments,
      totalConnections: studentAssignments.length + facultyAssignments.length
    };

    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a section and all its dependencies
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmCascade } = req.query;
    
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // If cascade confirmation is not provided, check dependencies first
    if (!confirmCascade) {
      const dependencies = await Promise.all([
        StudentAssignment.countDocuments({ 
          trackName: section.trackName,
          strandName: section.strandName,
          sectionName: section.sectionName, 
          schoolYear: section.schoolYear, 
          termName: section.termName 
        }),
        FacultyAssignment.countDocuments({ 
          trackName: section.trackName,
          strandName: section.strandName,
          sectionName: section.sectionName, 
          schoolYear: section.schoolYear, 
          termName: section.termName 
        })
      ]);

      const totalDependencies = dependencies.reduce((sum, count) => sum + count, 0);
      
      if (totalDependencies > 0) {
        return res.status(409).json({ 
          message: `Cannot delete section: It has ${totalDependencies} connected records. Use confirmCascade=true to delete all connected data.`,
          dependencyCount: totalDependencies
        });
      }
    }

    // Proceed with cascading deletion
    console.log(`Cascading deletion of section: ${section.trackName}/${section.strandName}/${section.sectionName}`);
    
    await Promise.all([
      // Delete all related entities
      StudentAssignment.deleteMany({ 
        trackName: section.trackName,
        strandName: section.strandName,
        sectionName: section.sectionName, 
        schoolYear: section.schoolYear, 
        termName: section.termName 
      }),
      FacultyAssignment.deleteMany({ 
        trackName: section.trackName,
        strandName: section.strandName,
        sectionName: section.sectionName, 
        schoolYear: section.schoolYear, 
        termName: section.termName 
      })
    ]);

    // Finally delete the section
    await Section.findByIdAndDelete(id);
    
    console.log(`Successfully deleted section and all connected data`);
    res.status(200).json({ message: 'Section and all connected data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update existing sections to have section codes (migration endpoint)
router.post('/migrate-section-codes', async (req, res) => {
  try {
    const sections = await Section.find({ sectionCode: { $exists: false } });
    let updatedCount = 0;
    
    for (const section of sections) {
      let sectionCode = generateSectionCode(section.sectionName);
      let counter = 1;
      
      // Ensure section code is unique
      while (await Section.findOne({ sectionCode, _id: { $ne: section._id } })) {
        sectionCode = generateSectionCode(section.sectionName) + counter.toString();
        counter++;
      }
      
      section.sectionCode = sectionCode;
      await section.save();
      updatedCount++;
    }
    
    res.json({ 
      message: `Updated ${updatedCount} sections with section codes`,
      updatedCount 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update sections by quarter and school year
router.patch('/quarter/:quarterName/schoolyear/:schoolYear', async (req, res) => {
  try {
    const { quarterName, schoolYear } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const result = await Section.updateMany(
      { 
        quarterName: quarterName,
        schoolYear: schoolYear
      },
      { $set: { status: status } }
    );

    console.log(`Updated ${result.modifiedCount} sections to status: ${status} for quarter: ${quarterName}, school year: ${schoolYear}`);
    res.json({ 
      message: `Updated ${result.modifiedCount} sections to status: ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 