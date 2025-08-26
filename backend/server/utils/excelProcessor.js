import * as XLSX from 'xlsx';
import StudentAssignment from '../models/StudentAssignment.js';
import User from '../models/User.js';

/**
 * Process Excel file for grading data - Enhanced to handle blank sheets and various formats
 */
export async function processGradingExcel(fileBuffer, options) {
  try {
    console.log('Starting Excel processing with options:', options);
    
    // Read the Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    console.log('Excel file read, sheet name:', sheetName);

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('Data converted to JSON, rows:', data.length);

    if (data.length === 0) {
      console.log('Excel file is empty');
      return {
        success: false,
        errors: ['Excel file is empty or contains no data'],
        warnings: [],
        grades: []
      };
    }

    // NEW: Enhanced column validation
    const columnValidationResult = validateExcelColumns(data);
    if (!columnValidationResult.isValid) {
      return {
        success: false,
        errors: columnValidationResult.errors,
        warnings: columnValidationResult.warnings || [],
        grades: []
      };
    }

    // Handle different header formats
    const header = data[0] || [];
    let headerMapping = {};

    console.log('Headers found:', header);

    // Try to find headers in the first row
    for (let i = 0; i < header.length; i++) {
      const headerValue = header[i] ? header[i].toString().trim().toLowerCase() : '';
      
      if (headerValue.includes('student') || headerValue.includes('name')) {
        headerMapping.studentName = i;
      } else if (headerValue.includes('grade') || headerValue.includes('score') || headerValue.includes('mark')) {
        headerMapping.grade = i;
      } else if (headerValue.includes('feedback') || headerValue.includes('comment') || headerValue.includes('remark')) {
        headerMapping.feedback = i;
      }
    }

    // If no headers found, assume first 3 columns are Student Name, Grade, Feedback
    if (Object.keys(headerMapping).length === 0) {
      headerMapping = {
        studentName: 0,
        grade: 1,
        feedback: 2
      };
    }

    console.log('Header mapping:', headerMapping);

    // Process data rows
    const grades = [];
    const errors = [];
    const warnings = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue; // Skip empty rows

      const studentName = row[headerMapping.studentName] ? row[headerMapping.studentName].toString().trim() : '';
      const gradeValue = row[headerMapping.grade];
      const feedback = row[headerMapping.feedback] ? row[headerMapping.feedback].toString().trim() : '';

      console.log(`Processing row ${i + 1}:`, { studentName, gradeValue, feedback });

      // Skip rows without student names
      if (!studentName) {
        console.log(`Skipping row ${i + 1}: No student name`);
        continue;
      }

      // Validate grade
      let grade = null;
      if (gradeValue !== null && gradeValue !== undefined && gradeValue !== '') {
        grade = parseFloat(gradeValue);
        if (isNaN(grade) || grade < 0 || grade > 100) {
          errors.push(`Row ${i + 1}: Invalid grade value "${gradeValue}". Must be between 0-100.`);
          console.log(`Invalid grade in row ${i + 1}:`, gradeValue);
          continue;
        }
      } else {
        warnings.push(`Row ${i + 1}: No grade provided for ${studentName}`);
        console.log(`No grade provided for ${studentName} in row ${i + 1}`);
        continue;
      }

      // Find student in database - more flexible matching
      let student = null;
      
      try {
        // First, let's get all students to see what we're working with
        const allStudents = await User.find({ role: 'student' }).select('firstname lastname');
        console.log('Available students:', allStudents.map(s => `${s.firstname} ${s.lastname}`));
        
        // Try multiple matching strategies
        const nameParts = studentName.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        // Strategy 1: Exact full name match
        student = await User.findOne({
          $or: [
            { 
              firstname: { $regex: new RegExp(`^${firstName}$`, 'i') },
              lastname: { $regex: new RegExp(`^${lastName}$`, 'i') }
            },
            {
              firstname: { $regex: new RegExp(`^${studentName}$`, 'i') }
            },
            {
              lastname: { $regex: new RegExp(`^${studentName}$`, 'i') }
            }
          ],
          role: 'student'
        });

        // Strategy 2: Partial name matching if exact match fails
        if (!student) {
          student = await User.findOne({
            $or: [
              { 
                firstname: { $regex: new RegExp(firstName, 'i') },
                lastname: { $regex: new RegExp(lastName, 'i') }
              },
              {
                firstname: { $regex: new RegExp(studentName, 'i') }
              },
              {
                lastname: { $regex: new RegExp(studentName, 'i') }
              },
              {
                $expr: {
                  $regexMatch: {
                    input: { $concat: ["$firstname", " ", "$lastname"] },
                    regex: studentName,
                    options: "i"
                  }
                }
              }
            ],
            role: 'student'
          });
        }

        // Strategy 3: Reverse name matching (lastname firstname)
        if (!student && nameParts.length >= 2) {
          student = await User.findOne({
            $or: [
              { 
                firstname: { $regex: new RegExp(lastName, 'i') },
                lastname: { $regex: new RegExp(firstName, 'i') }
              }
            ],
            role: 'student'
          });
        }

        if (!student) {
          const availableStudents = allStudents.map(s => `${s.firstname} ${s.lastname}`).join(', ');
          errors.push(`Row ${i + 1}: Student "${studentName}" not found in database. Available students in this section: ${availableStudents}`);
          console.log(`Student not found: ${studentName}`);
          console.log('Available students:', availableStudents);
          continue;
        }

        console.log(`Found student:`, student.firstname, student.lastname);

        // Check if student is enrolled in the section
        const studentAssignment = await StudentAssignment.findOne({
          studentId: student._id,
          sectionName: options.sectionName,
          trackName: options.trackName,
          strandName: options.strandName,
          gradeLevel: options.gradeLevel,
          schoolYear: options.schoolYear,
          termName: options.termName
        });

        if (!studentAssignment) {
          // Get all student assignments for this section to show what's available
          const sectionAssignments = await StudentAssignment.find({
            sectionName: options.sectionName,
            trackName: options.trackName,
            strandName: options.strandName,
            gradeLevel: options.gradeLevel,
            schoolYear: options.schoolYear,
            termName: options.termName
          }).populate('studentId', 'firstname lastname');
          
          const enrolledStudents = sectionAssignments.map(sa => `${sa.studentId.firstname} ${sa.studentId.lastname}`).join(', ');
          
          errors.push(`Row ${i + 1}: Student "${studentName}" is not enrolled in section "${options.sectionName}". Enrolled students: ${enrolledStudents}`);
          console.log(`Student not enrolled in section: ${studentName} - ${options.sectionName}`);
          console.log('Enrolled students:', enrolledStudents);
          continue;
        }

        grades.push({
          studentId: student._id,
          studentName: studentName,
          grade: grade,
          feedback: feedback
        });

        console.log(`Successfully processed grade for ${studentName}: ${grade}`);
      } catch (error) {
        console.error(`Error processing student ${studentName}:`, error);
        errors.push(`Row ${i + 1}: Error processing student "${studentName}": ${error.message}`);
      }
    }

    console.log('Processing complete:', { grades: grades.length, errors: errors.length, warnings: warnings.length });

    return {
      success: errors.length === 0,
      grades: grades,
      errors: errors,
      warnings: warnings,
      totalRows: data.length - 1,
      processedRows: grades.length
    };

  } catch (error) {
    console.error('Error in processGradingExcel:', error);
    throw new Error(`Error processing Excel file: ${error.message}`);
  }
}

/**
 * NEW: Enhanced column validation function
 * @param {Array} data - Excel data as array of arrays
 * @returns {Object} Validation result with specific column error messages
 */
function validateExcelColumns(data) {
  try {
    console.log('🔍 [BACKEND] Starting column validation...');
    console.log('🔍 [BACKEND] Data rows:', data.length);
    
    if (!data || data.length < 3) {
      console.log('❌ [BACKEND] Insufficient data rows');
      return {
        isValid: false,
        errors: ['Excel file must have at least 3 rows (headers + data)'],
        warnings: []
      };
    }

    const errors = [];
    const warnings = [];

    const norm = (v) => (v == null ? '' : String(v))
      .replace(/[’‘‛‚`´]/g, "'")
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
    const cellContains = (cell, target) => norm(cell).includes(norm(target));
    const rowHas = (row, target) => (row || []).some(c => cellContains(c, target));
    const rowHasAny = (row, targets) => targets.some(t => rowHas(row, t));

    // Expected JuanLMS structure rows (using 1-based labeling in messages)
    const row8 = data[7] || [];
    const row9 = data[8] || [];
    const row10 = data[9] || [];

    console.log('🔍 [BACKEND] Row 8 (index 7):', row8);
    console.log('🔍 [BACKEND] Row 9 (index 8):', row9);
    console.log('🔍 [BACKEND] Row 10 (index 9):', row10);

    // Validate Row 8 - Column titles
    if (row8.length === 0) {
      errors.push('Row 8 is missing or empty. This row should contain column titles.');
    } else {
      const studentNoAliases = ['STUDENT NO.', 'STUDENT NO', 'STUDENT NUMBER'];
      const studentNameAliases = ["STUDENT'S NAME", 'STUDENT NAME'];
      if (!rowHasAny(row8, studentNoAliases)) {
        errors.push('Missing required header in Row 8: Student No.');
      }
      if (!rowHasAny(row8, studentNameAliases)) {
        errors.push("Missing required header in Row 8: STUDENT'S NAME");
      }
    }

    // Validate Row 9 - Group headers (allow anywhere; tolerate merged cells)
    if (row9.length === 0) {
      errors.push('Row 9 is missing or empty. This row should contain group headers.');
    } else {
      const requiredRow9Labels = ['WRITTEN WORKS 40%', 'PERFORMANCE TASKS 60%', 'INITIAL GRADE', 'QUARTERLY GRADE'];
      requiredRow9Labels.forEach(label => {
        if (!rowHas(row9, label)) {
          errors.push(`Missing required header in Row 9: ${label}`);
        }
      });
    }

    // Validate Row 10 - Sub-headers (appear at least once)
    if (row10.length === 0) {
      errors.push('Row 10 is missing or empty. This row should contain sub-headers.');
    } else {
      const requiredRow10Labels = ['RAW', 'HPS', 'PS', 'WS'];
      requiredRow10Labels.forEach(label => {
        if (!rowHas(row10, label)) {
          errors.push(`Missing required sub-header in Row 10: ${label}`);
        }
      });
    }

    // Column count soft checks -> warnings only
    const colCount = (row8 || []).length;
    if (colCount > 25) {
      warnings.push(`File contains ${colCount} columns. Extra columns beyond column Y may be ignored.`);
    }

    console.log('🔍 [BACKEND] Column validation complete. Errors found:', errors.length);
    if (errors.length > 0) {
      console.log('❌ [BACKEND] Column validation errors:', errors);
    } else {
      console.log('✅ [BACKEND] All required columns are present');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    console.error('❌ [BACKEND] Error in column validation:', error);
    return {
      isValid: false,
      errors: [`Error validating columns: ${error.message}`],
      warnings: []
    };
  }
}

/**
 * Generate Excel template for grading - Enhanced to handle blank sheets
 * @param {Array} students - Array of student objects
 * @param {Object} options - Template options
 * @returns {Buffer} Excel file buffer
 */
export function generateGradingTemplate(students, options = {}) {
  try {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();

    // Prepare data
    const data = [
      ['Student Name', 'Grade', 'Feedback'],
      ...students.map(student => [
        `${student.firstname} ${student.lastname}`,
        '',
        ''
      ])
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { width: 25 }, // Student Name
      { width: 10 }, // Grade
      { width: 30 }  // Feedback
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grades');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return buffer;

  } catch (error) {
    throw new Error(`Error generating Excel template: ${error.message}`);
  }
}

/**
 * Validate Excel file structure without processing grades
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Object} Validation result
 */
export function validateExcelStructure(fileBuffer) {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return {
        isValid: false,
        error: 'No worksheet found in Excel file'
      };
    }

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      return {
        isValid: false,
        error: 'Excel file is empty'
      };
    }

    return {
      isValid: true,
      rowCount: data.length,
      columnCount: data[0] ? data[0].length : 0
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Invalid Excel file: ${error.message}`
    };
  }
} 