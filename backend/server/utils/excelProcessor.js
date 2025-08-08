import * as XLSX from 'xlsx';
import StudentAssignment from '../models/StudentAssignment.js';
import User from '../models/User.js';

/**
 * Process Excel file for grading data
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {Object} options - Processing options
 * @param {string} options.sectionName - Section name
 * @param {string} options.trackName - Track name
 * @param {string} options.strandName - Strand name
 * @param {string} options.gradeLevel - Grade level
 * @param {string} options.schoolYear - School year
 * @param {string} options.termName - Term name
 * @returns {Object} Processed data with grades and validation results
 */
export async function processGradingExcel(fileBuffer, options) {
  try {
    // Read the Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row');
    }

    // Validate header
    const header = data[0];
    const expectedHeaders = ['Student Name', 'Grade', 'Feedback'];

    for (let i = 0; i < expectedHeaders.length; i++) {
      if (!header[i] || header[i].toString().trim() !== expectedHeaders[i]) {
        throw new Error(`Invalid header format. Expected: ${expectedHeaders.join(', ')}`);
      }
    }

    // Process data rows
    const grades = [];
    const errors = [];
    const warnings = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[0].toString().trim()) continue; // Skip empty rows

      const studentName = row[0].toString().trim();
      const gradeValue = row[1];
      const feedback = row[2] ? row[2].toString().trim() : '';

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

      // Find student in database
      const student = await User.findOne({
        firstname: { $regex: new RegExp(studentName.split(' ')[0], 'i') },
        lastname: { $regex: new RegExp(studentName.split(' ').slice(1).join(' '), 'i') },
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
 * Generate Excel template for grading
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