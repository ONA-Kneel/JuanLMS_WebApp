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

    // Options and dynamic columns
    const addRawHps = Boolean(options.addRawHps); // adds Raw and HPS numeric columns
    const addPercentFormula = Boolean(options.addPercentFormula); // adds a Percent column with formula Raw/HPS
    const customFormula = typeof options.formula === 'string' ? options.formula : null; // e.g. 'A{row}/B{row}'

    // Build headers dynamically
    const headers = ['Student Name'];
    if (addRawHps) {
      headers.push('Raw');
      headers.push('HPS');
    }
    headers.push('Grade');
    headers.push('Feedback');
    if (addPercentFormula) headers.push('Percent');
    if (customFormula) headers.push('Computed');

    // Prepare data rows (values only; formulas applied after sheet creation)
    const data = [
      headers,
      ...students.map(student => {
        const row = [];
        // Student Name
        row.push(`${student.firstname} ${student.lastname}`);
        // Raw/HPS (optional)
        if (addRawHps) {
          row.push(''); // Raw
          row.push(''); // HPS
        }
        // Grade and Feedback
        row.push(''); // Grade
        row.push(''); // Feedback
        // Percent (placeholder)
        if (addPercentFormula) row.push('');
        // Computed (placeholder)
        if (customFormula) row.push('');
        return row;
      })
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const cols = [];
    // Student Name
    cols.push({ width: 25 });
    // Raw/HPS
    if (addRawHps) {
      cols.push({ width: 10 }); // Raw
      cols.push({ width: 10 }); // HPS
    }
    // Grade
    cols.push({ width: 10 });
    // Feedback
    cols.push({ width: 30 });
    // Percent
    if (addPercentFormula) cols.push({ width: 12 });
    // Computed
    if (customFormula) cols.push({ width: 14 });
    worksheet['!cols'] = cols;

    // Apply formulas after sheet creation
    const headerRowIndex = 1; // 1-based in Excel
    const firstDataRowIndex = headerRowIndex + 1; // 2
    const totalRows = students.length;

    // Helper to find column index by header label (0-based)
    const findColumnIndex = (label) => {
      const headerRow = headers;
      return headerRow.findIndex(h => h === label);
    };

    // Fill Percent formulas if requested and Raw/HPS present
    if (addPercentFormula && addRawHps) {
      const percentCol = findColumnIndex('Percent');
      const rawCol = findColumnIndex('Raw');
      const hpsCol = findColumnIndex('HPS');
      if (percentCol !== -1 && rawCol !== -1 && hpsCol !== -1) {
        for (let i = 0; i < totalRows; i++) {
          const excelRow = firstDataRowIndex + i; // 2..n
          // Convert 0-based col index to Excel letter
          const colLetter = (idx) => XLSX.utils.encode_col(idx);
          const percentCellRef = `${colLetter(percentCol)}${excelRow}`;
          const rawRef = `${colLetter(rawCol)}${excelRow}`;
          const hpsRef = `${colLetter(hpsCol)}${excelRow}`;
          worksheet[percentCellRef] = { t: 'n', f: `IFERROR(${rawRef}/${hpsRef},0)` };
        }
      }
    }

    // Fill custom formula if provided (supports {row} placeholder)
    if (customFormula) {
      const computedCol = findColumnIndex('Computed');
      if (computedCol !== -1) {
        for (let i = 0; i < totalRows; i++) {
          const excelRow = firstDataRowIndex + i;
          const colLetter = (idx) => XLSX.utils.encode_col(idx);
          const cellRef = `${colLetter(computedCol)}${excelRow}`;
          const f = customFormula.replace(/\{row\}/g, String(excelRow));
          worksheet[cellRef] = { t: 'n', f };
        }
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grades');

    // Add Info sheet with metadata (academic year, term, quarter)
    const infoRows = [
      ['JuanLMS Grading Export Info'],
      ['Academic Year', options.academicYear || ''],
      ['Term', options.termName || ''],
      ['Quarter', options.quarter || ''],
      ['Generated At', new Date().toISOString()]
    ];
    const infoSheet = XLSX.utils.aoa_to_sheet(infoRows);
    infoSheet['!cols'] = [{ width: 20 }, { width: 30 }];
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Info');

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

/**
 * Generate a quarter-scoped class list with WW/PT Raw/HPS/PS/WS and grades.
 * Input studentsData: [{ studentName, wwRaw, wwHps, ptRaw, ptHps }]
 * Options: { academicYear, termName, quarter, wwWeight=0.4, ptWeight=0.6 }
 */
export function generateQuarterSummaryClassList(studentsData, options = {}) {
  try {
    const workbook = XLSX.utils.book_new();

    const wwWeight = options.wwWeight != null ? Number(options.wwWeight) : 0.4;
    const ptWeight = options.ptWeight != null ? Number(options.ptWeight) : 0.6;

    const headers = [
      'Student Name',
      'WW Raw', 'WW HPS', 'WW PS', 'WW WS',
      'PT Raw', 'PT HPS', 'PT PS', 'PT WS',
      'Initial Grade', 'Quarterly Exam', 'Final Grade'
    ];

    const data = [
      headers,
      ...studentsData.map(s => [
        s.studentName || '',
        Number(s.wwRaw || 0), Number(s.wwHps || 0), '', '',
        Number(s.ptRaw || 0), Number(s.ptHps || 0), '', '',
        '', '', ''
      ])
    ];

    const sheet = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    sheet['!cols'] = [
      { width: 28 },
      { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
      { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
      { width: 14 }, { width: 14 }, { width: 12 }
    ];

    // Apply per-row formulas
    const firstDataRow = 2; // row 1 is headers
    for (let i = 0; i < studentsData.length; i++) {
      const r = firstDataRow + i; // Excel row number
      const c = (idx) => XLSX.utils.encode_col(idx);

      // Indices of columns
      const col = {
        wwRaw: 1, wwHps: 2, wwPs: 3, wwWs: 4,
        ptRaw: 5, ptHps: 6, ptPs: 7, ptWs: 8,
        initial: 9, qExam: 10, final: 11
      };

      // PS = IFERROR(RAW/HPS*100,0)
      sheet[`${c(col.wwPs)}${r}`] = { t: 'n', f: `IFERROR(${c(col.wwRaw)}${r}/${c(col.wwHps)}${r}*100,0)` };
      sheet[`${c(col.ptPs)}${r}`] = { t: 'n', f: `IFERROR(${c(col.ptRaw)}${r}/${c(col.ptHps)}${r}*100,0)` };

      // WS = PS * weight
      sheet[`${c(col.wwWs)}${r}`] = { t: 'n', f: `${c(col.wwPs)}${r}*${wwWeight}` };
      sheet[`${c(col.ptWs)}${r}`] = { t: 'n', f: `${c(col.ptPs)}${r}*${ptWeight}` };

      // Initial Grade = ROUND(WS_WW + WS_PT, 0)
      sheet[`${c(col.initial)}${r}`] = { t: 'n', f: `ROUND(${c(col.wwWs)}${r}+${c(col.ptWs)}${r},0)` };

      // Quarterly Exam intentionally left blank for manual input

      // Final Grade for now mirrors Initial (professor may later adjust using exam)
      sheet[`${c(col.final)}${r}`] = { t: 'n', f: `${c(col.initial)}${r}` };
    }

    XLSX.utils.book_append_sheet(workbook, sheet, 'Quarter Grades');

    // Info sheet
    const infoRows = [
      ['JuanLMS Quarter Export'],
      ['Academic Year', options.academicYear || ''],
      ['Term', options.termName || ''],
      ['Quarter', options.quarter || ''],
      ['Weights', `WW=${wwWeight*100}% PT=${ptWeight*100}%`],
      ['Generated At', new Date().toISOString()]
    ];
    const infoSheet = XLSX.utils.aoa_to_sheet(infoRows);
    infoSheet['!cols'] = [{ width: 18 }, { width: 32 }];
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Info');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  } catch (err) {
    throw new Error(`Error generating quarter summary: ${err.message}`);
  }
}