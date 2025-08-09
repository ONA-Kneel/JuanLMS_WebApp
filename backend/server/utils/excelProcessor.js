import * as XLSX from 'xlsx';
import StudentAssignment from '../models/StudentAssignment.js';
import User from '../models/User.js';

/**
 * Process Excel file for grading data - Enhanced to handle blank sheets and various formats
 */
export async function processGradingExcel(fileBuffer, options) {
  try {
    // Read the Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      return {
        success: false,
        errors: ['Excel file is empty or contains no data'],
        warnings: [],
        grades: []
      };
    }

    // Handle different header formats
    const header = data[0] || [];
    let headerMapping = {};

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

      // Skip rows without student names
      if (!studentName) {
        continue;
      }

      // Validate grade
      let grade = null;
      if (gradeValue !== null && gradeValue !== undefined && gradeValue !== '') {
        grade = parseFloat(gradeValue);
        if (isNaN(grade) || grade < 0 || grade > 100) {
          errors.push(`Row ${i + 1}: Invalid grade value "${gradeValue}". Must be between 0-100.`);
          continue;
        }
      } else {
        warnings.push(`Row ${i + 1}: No grade provided for ${studentName}`);
        continue;
      }

      // Find student in database - more flexible matching
      let student = null;
      
      // Try exact name match first
      student = await User.findOne({
        $or: [
          { 
            firstname: { $regex: new RegExp(`^${studentName.split(' ')[0]}$`, 'i') },
            lastname: { $regex: new RegExp(studentName.split(' ').slice(1).join(' '), 'i') }
          },
          {
            firstname: { $regex: new RegExp(studentName, 'i') }
          },
          {
            lastname: { $regex: new RegExp(studentName, 'i') }
          }
        ],
        role: 'student'
      });

      if (!student) {
        errors.push(`Row ${i + 1}: Student "${studentName}" not found in database`);
        continue;
      }

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
        errors.push(`Row ${i + 1}: Student "${studentName}" is not enrolled in section "${options.sectionName}"`);
        continue;
      }

      grades.push({
        studentId: student._id,
        studentName: studentName,
        grade: grade,
        feedback: feedback
      });
    }

    return {
      success: errors.length === 0,
      grades: grades,
      errors: errors,
      warnings: warnings,
      totalRows: data.length - 1,
      processedRows: grades.length
    };

  } catch (error) {
    throw new Error(`Error processing Excel file: ${error.message}`);
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