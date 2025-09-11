import React, { useState, useEffect } from 'react';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import ValidationModal from './ValidationModal';
import * as XLSX from 'xlsx';
import { useQuarter } from '../context/QuarterContext.jsx';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function GradingSystem({ onStageTemporaryGrades }) {
  // Get quarter context
  const { globalQuarter, globalTerm, globalAcademicYear } = useQuarter();
  
  console.log('🎯 GradingSystem quarter context:', {
    globalQuarter,
    globalTerm,
    globalAcademicYear
  });
  
  const [facultyClasses, setFacultyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [sections, setSections] = useState([]);
  const [allSections, setAllSections] = useState([]); // Store all sections
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationType, setValidationType] = useState('error');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmUpload, setShowConfirmUpload] = useState(false);
  const [confirmUploadMessage, setConfirmUploadMessage] = useState('');
  const [pendingValidatedFile, setPendingValidatedFile] = useState(null);
  const [pendingValidatedSummary, setPendingValidatedSummary] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [rosterPreview, setRosterPreview] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Consolidated getQuarterLabels function - used throughout the component
  const getQuarterLabels = (semester) => {
    const term = semester || currentTerm?.termName || '1st';
    if (term.toLowerCase().includes('1') || term.toLowerCase().includes('1st') || term.toLowerCase().includes('first')) {
      return {
        firstQuarter: "first_quarter",
        secondQuarter: "second_quarter",
        firstQuarterDisplay: "first quarter",
        secondQuarterDisplay: "second quarter"
      };
    } else {
      return {
        firstQuarter: "third_quarter",
        secondQuarter: "fourth_quarter", 
        firstQuarterDisplay: "third quarter",
        secondQuarterDisplay: "fourth quarter"
      };
    }
  };

  // Fetch academic year and term
  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          setAcademicYear(year);
        }
        } catch (err) {
            // Failed to fetch academic year
        }
    }
    fetchAcademicYear();
  }, []);

  useEffect(() => {
    async function fetchActiveTermForYear() {
      if (!academicYear) return;
      try {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          const active = terms.find(term => term.status === 'active');
          setCurrentTerm(active || null);
        } else {
          setCurrentTerm(null);
        }
      } catch {
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  // Fetch sections for the current term
  useEffect(() => {
    async function fetchSections() {
      if (!currentTerm || !academicYear) return;
      try {
        const token = localStorage.getItem("token");
        
        let sectionsData = [];
        
        // Try term-specific endpoint first
        const response = await fetch(`${API_BASE}/api/terms/${currentTerm._id}/sections`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          sectionsData = await response.json();
        } else {
          // Term-specific endpoint failed, trying fallback
          
          // Try general sections endpoint
          const fallbackResponse = await fetch(`${API_BASE}/api/sections`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (fallbackResponse.ok) {
            const allSectionsData = await fallbackResponse.json();
            
            // Filter sections by term and school year
            sectionsData = allSectionsData.filter(section => 
              section.termName === currentTerm.termName &&
              section.schoolYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
              section.status === 'active'
            );
          } else {
            // General sections endpoint also failed
            
            // Try track/strand approach
            try {
              const tracksResponse = await fetch(`${API_BASE}/api/tracks`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (tracksResponse.ok) {
                const tracks = await tracksResponse.json();
                
                for (const track of tracks) {
                  const strandsResponse = await fetch(`${API_BASE}/api/strands/track/${track.trackName}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  
                  if (strandsResponse.ok) {
                    const strands = await strandsResponse.json();
                    
                    for (const strand of strands) {
                      const sectionsResponse = await fetch(`${API_BASE}/api/sections/track/${track.trackName}/strand/${strand.strandName}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      
                      if (sectionsResponse.ok) {
                        const trackStrandSections = await sectionsResponse.json();
                        sectionsData.push(...trackStrandSections.filter(s => s.status === 'active'));
                      }
                    }
                  }
                }
              }
            } catch (error) {
              // Track/strand approach failed
            }
            
            // If still no sections, try to get all sections and find close matches
            if (sectionsData.length === 0) {
              try {
                const allSectionsResponse = await fetch(`${API_BASE}/api/sections`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                if (allSectionsResponse.ok) {
                  const allSectionsData = await allSectionsResponse.json();
                  
                  // Find sections with similar term names or school years
                  const closeMatches = allSectionsData.filter(section => 
                    (section.termName && section.termName.toLowerCase().includes(currentTerm.termName.toLowerCase())) ||
                    (section.schoolYear && section.schoolYear.includes(academicYear.schoolYearStart.toString()))
                  );
                  
                  if (closeMatches.length > 0) {
                    sectionsData = closeMatches.filter(s => s.status === 'active');
                  }
                }
              } catch (error) {
                // Getting all sections failed
              }
            }
            
            // Final fallback: show all active sections
            if (sectionsData.length === 0) {
              try {
                const fallbackResponse = await fetch(`${API_BASE}/api/sections`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                if (fallbackResponse.ok) {
                  const allSectionsData = await fallbackResponse.json();
                  sectionsData = allSectionsData.filter(s => s.status === 'active');
                }
              } catch (error) {
                // Final fallback failed
              }
            }
          }
        }
        
        
        setAllSections(sectionsData);
        setSections(sectionsData);
      } catch (error) {
        // Failed to fetch sections
      }
    }
    fetchSections();
  }, [currentTerm, academicYear]);

  // Filter sections when class is selected
  useEffect(() => {
    if (selectedClass !== '' && facultyClasses[selectedClass]) {
      const selectedClassObj = facultyClasses[selectedClass];
      
      // Check if the class has a section assigned
      const classSection = selectedClassObj.section;
      
      if (classSection) {
        // Filter sections to show only the assigned section
        const filteredSections = allSections.filter(section => 
          section.sectionName === classSection
        );
        setSections(filteredSections);
      } else {
        // Class has no section assigned
        setSections([]);
      }
    } else {
      setSections([]);
    }
  }, [selectedClass, allSections, facultyClasses]);

  const fetchFacultyClasses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Use the same working endpoint as Faculty_Grades.jsx
      const response = await fetch(`${API_BASE}/classes/my-classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        let filteredClasses = [];
        
        if (academicYear && currentTerm) {
          filteredClasses = data.filter(cls =>
            // cls.facultyID === currentFacultyID && // This line was removed
            cls.isArchived !== true &&
            cls.academicYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
            cls.termName === currentTerm.termName
          );
        }
        
        setFacultyClasses(filteredClasses);
        setSelectedClass('');
        setSelectedSection('');
      } else {
        // Failed to fetch faculty classes
        setValidationMessage('Failed to fetch faculty classes. Please try again.');
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      // Error fetching faculty classes
      setValidationMessage('Error fetching faculty classes. Please check your connection and try again.');
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/classes/my-classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setValidationMessage(`API Test Successful! Found ${data.length} classes.`);
        setValidationType('success');
        setShowValidationModal(true);
      } else {
        setValidationMessage(`API Test Failed! Status: ${response.status}`);
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      // API Test Error
      setValidationMessage(`API Test Error: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setExcelFile(file);
      setUploadStatus('');
    }
  };

  // Simplified expected headers for 7-column layout
  const expectedHeaderRow8 = () => [
    "Student No.",
    "STUDENT'S NAME (Alphabetical Order with Middle Initials)",
    "WRITTEN WORKS 30%", "",
    "PERFORMANCE TASKS 50%", "",
    "QUARTERLY\nEXAM"
  ];
  const expectedHeaderRow9 = [
    "", "",
    "RAW", "HPS",
    "RAW", "HPS",
    ""
  ];
  const expectedHeaderRow10 = [];

  const arraysEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  const normalizeStudentsForSection = async (selectedClassObj, selectedSectionId) => {
    const token = localStorage.getItem('token');
    let students = [];
    // Removed calls to protected/nonexistent preview endpoints to avoid 403/404
    try {
      if (students.length === 0 && selectedClassObj.classID) {
        const membersRes = await fetch(`${API_BASE}/classes/${selectedClassObj.classID}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          if (membersData?.students?.length) {
            students = membersData.students;
          } else if (Array.isArray(membersData)) {
            students = membersData;
          }
        }
      }
    } catch {}
    try {
      if (students.length === 0 && selectedClassObj.classID && academicYear && currentTerm) {
        const classId = selectedClassObj.classID;
        const sgRes = await fetch(`${API_BASE}/api/semestral-grades/class/${classId}?termName=${currentTerm.termName}&academicYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (sgRes.ok) {
          const sgData = await sgRes.json();
          if (sgData?.success && Array.isArray(sgData.grades)) {
            const unique = [];
            const seen = new Set();
            sgData.grades.forEach(g => {
              const sid = g.schoolID || g.studentID || g._id;
              if (sid && !seen.has(sid)) {
                seen.add(sid);
                unique.push({ schoolID: sid, name: g.studentName });
              }
            });
            students = unique;
          }
        }
      }
    } catch {}

    const candidates = (students || []).filter(s => (s.studentID || s.schoolID || s.userID || s.id || s._id));
    const normalized = candidates.map((s, idx) => ({
      id: s.studentID || s.schoolID || s.userID || s.id || s._id || `S${idx + 1}`,
      name: s.name || s.studentName || `${s.firstname || ''} ${s.lastname || ''}`.trim()
    }));
    const idSet = new Set(normalized.map(s => String(s.id).trim()));
    const idToName = new Map(normalized.map(s => [String(s.id).trim(), s.name]));
    return { normalized, idSet, idToName };
  };

  const hasAccents = (str) => /[^\u0000-\u007f]/.test(str || '');

  // New function to validate required columns
  const validateRequiredColumns = (row8, row9, row10) => {
    
    const errors = [];

    const norm = (v) => (v == null ? '' : String(v))
      .replace(/[’‘‛‚`´]/g, "'")
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
    const cellContains = (cell, target) => norm(cell).includes(norm(target));
    const rowHas = (row, target) => (row || []).some(c => cellContains(c, target));
    const rowHasAny = (row, targets) => targets.some(t => rowHas(row, t));

    // Check Row 8 (Student No., Student Name, etc.)
    if (!row8 || row8.length === 0) {
      errors.push('Row 8 is missing or empty. This row should contain column titles.');
      return errors;
    }

    // Accept common variants for Student No. and Student Name and ignore exact positions
    const studentNoAliases = ['STUDENT NO.', 'STUDENT NO', 'STUDENT NUMBER'];
    const studentNameAliases = ["STUDENT'S NAME", 'STUDENT NAME'];

    if (!rowHasAny(row8, studentNoAliases)) {
      errors.push('Missing required header in Row 8: Student No.');
    }
    if (!rowHasAny(row8, studentNameAliases)) {
      errors.push("Missing required header in Row 8: STUDENT'S NAME");
    }

    // Check if Row 9 exists and has content
    if (!row9 || row9.length === 0) {
      errors.push('Row 9 is missing or empty. This row should contain group headers.');
      return errors;
    }

    // Row 10 (legacy sub-headers) is now optional in the compact template

    // Required group headers (can appear in Row 8 or Row 9 due to merges/wrapping)
    const requiredGroupLabels = ['WRITTEN WORKS 30%', 'PERFORMANCE TASKS 50%', 'QUARTERLY EXAM'];
    requiredGroupLabels.forEach(label => {
      const found = rowHas(row9, label) || rowHas(row8, label);
      if (!found) {
        errors.push(`Missing required header (Row 8/9): ${label}`);
      }
    });

    // Required sub-headers: RAW/HPS must appear (in row 9 for compact, or row 10 for legacy)
    const requiredSubHeaders = ['RAW', 'HPS'];
    requiredSubHeaders.forEach(label => {
      const found = rowHas(row9, label) || rowHas(row10, label);
      if (!found) {
        errors.push(`Missing required sub-header: ${label}`);
      }
    });


    return errors;
  };

  const validateExcelFile = async (file, selectedClassObj, selectedSectionId) => {
    // Read workbook
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { ok: false, errors: ["File is empty: no sheets found."] };
    }
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!aoa || aoa.length === 0) {
      return { ok: false, errors: ["File is empty: no content rows found."] };
    }

    // Expect header rows at indices 7,8,9 (0-based)
    const reqRow8 = expectedHeaderRow8();
    const row8 = aoa[7] || [];
    const row9 = aoa[8] || [];
    const row10 = aoa[9] || [];

    const errors = [];
    const warnings = [];

    // Detect metadata in header (first 12 rows) to verify section/class
    const extractMeta = (rows) => {
      const norm = (v) => (v == null ? '' : String(v)).trim();
      const up = (v) => norm(v).toUpperCase();
      const meta = { subjectCode: '', classCode: '', sectionName: '' };
      const scanRows = rows.slice(0, Math.min(rows.length, 12));
      for (const row of scanRows) {
        if (!Array.isArray(row)) continue;
        for (let c = 0; c < row.length; c++) {
          const cell = up(row[c]);
          if (cell.includes('CLASS CODE')) {
            // Prefer next cell, else same cell suffix after ':'
            meta.classCode = norm(row[c + 1] ?? '').trim() || norm(String(row[c]).split(':')[1] || '');
          }
          if (cell.includes('SUBJECT CODE')) {
            meta.subjectCode = norm(row[c + 1] ?? '').trim() || norm(String(row[c]).split(':')[1] || '');
          }
          if (cell.includes('SECTION')) {
            // If template ever includes Section: <name>
            meta.sectionName = norm(row[c + 1] ?? '').trim() || norm(String(row[c]).split(':')[1] || '');
          }
        }
      }
      return meta;
    };

    const sheetMeta = extractMeta(aoa);
    const selectedSectionObj = sections.find(s => s._id === selectedSectionId) || {};
    const selectedSectionName = selectedSectionObj.sectionName || '';
    const selectedClassCode = selectedClassObj?.classCode || selectedClassObj?.classID || '';

    // If the sheet declares a class code or section name and it doesn't match, block upload
    if (sheetMeta.classCode && selectedClassCode && String(sheetMeta.classCode).trim().toUpperCase() !== String(selectedClassCode).trim().toUpperCase()) {
      errors.push(`This file appears to be for a different section/class. Found Class Code: "${sheetMeta.classCode}" (expected: "${selectedClassCode}")`);
    }
    if (sheetMeta.sectionName && selectedSectionName && String(sheetMeta.sectionName).trim().toUpperCase() !== String(selectedSectionName).trim().toUpperCase()) {
      errors.push(`This file appears to be for a different section. Found Section: "${sheetMeta.sectionName}" (expected: "${selectedSectionName}")`);
    }

    // NEW: Validate required columns first (relaxed, position-insensitive)
    const columnErrors = validateRequiredColumns(row8, row9, row10);
    if (columnErrors.length > 0) {
      errors.push(...columnErrors);
      return {
        ok: false,
        totalRows: aoa.length,
        validRows: 0,
        errors: errors,
        warnings: warnings,
        accentedNames: []
      };
    }

    // Remove strict header equality checks to avoid false positives with merged cells/formatting
    // Kept as informational warnings if needed in future
    // if (!arraysEqual(row9.slice(0, expectedHeaderRow9.length), expectedHeaderRow9)) {
    //   warnings.push('Header row format differs from the canonical template (Row 9).');
    // }
    // if (!arraysEqual(row10.slice(0, expectedHeaderRow10.length), expectedHeaderRow10)) {
    //   warnings.push('Header row format differs from the canonical template (Row 10).');
    // }
    // if (!row8 || row8[0] !== 'Student No.' || (row8[1] || '').toString().toUpperCase().indexOf("STUDENT'S NAME") !== 0) {
    //   warnings.push('Header row format differs from the canonical template (Row 8).');
    // }

    // Extra columns handling beyond G (7 columns)
    const maxCols = 7;
    const headerWidths = [row8.length, row9.length, row10.length];
    if (headerWidths.some(w => w > maxCols)) {
      warnings.push('This file contains extra columns beyond G; they will be ignored.');
    }

    // Fetch section students for validation
    const { idSet, idToName } = await normalizeStudentsForSection(selectedClassObj, selectedSectionId);

    // Validate data rows starting row 11 (index 10)
    const seenIds = new Set();
    const accentedNames = new Set();
    const validRowIndices = [];
    const duplicateIds = new Set();
    const unknownIds = new Set();

    for (let r = 10; r < aoa.length; r++) {
      const row = aoa[r];
      if (!row || row.length === 0 || row.every(c => String(c).trim() === '')) continue; // skip entirely empty row

      // Accept rows longer than maxCols but ignore extra cells
      const cells = row.slice(0, maxCols);
      const studentId = String(cells[0] || '').trim();
      const studentName = String(cells[1] || '').trim();

      if (!studentId && !studentName) continue; // skip blank

      // Duplicate student id
      if (studentId) {
        if (seenIds.has(studentId)) {
          errors.push(`Row ${r + 1}: Column A (Student No.) has duplicate ID: ${studentId}`);
          duplicateIds.add(studentId);
          continue;
        }
        seenIds.add(studentId);
      }

      // Unknown student id (different section or not found)
      if (studentId && !idSet.has(studentId)) {
        errors.push(`Row ${r + 1}: Column A (Student No.) has unknown ID: ${studentId}`);
        unknownIds.add(studentId);
        continue;
      }

      // Optional: name mismatch can indicate different section; flag as warning but do not skip row
      const expectedName = studentId ? (idToName.get(studentId) || '') : '';
      if (studentId && expectedName && studentName && expectedName.trim().toLowerCase() !== studentName.trim().toLowerCase()) {
        warnings.push(`Name mismatch for student ${studentId} at row ${r + 1}. Expected "${expectedName}", got "${studentName}". Row will be processed by ID.`);
      }

      // Accents detection
      if (studentName && hasAccents(studentName)) {
        accentedNames.add(`${studentName} (${studentId})`);
      }

      // Require Quarterly Exam (column G, index 6) to be present and 0-100
      const qExam = cells[6];
      if (qExam === '' || qExam === null || typeof qExam === 'undefined') {
        errors.push(`Row ${r + 1}: Quarterly Exam (G) is required.`);
        continue;
      }
      {
        const num = parseFloat(qExam);
        if (Number.isNaN(num) || num < 0 || num > 100) {
          errors.push(`Row ${r + 1}: Quarterly Exam (G) should be a number between 0-100.`);
          continue;
        }
      }

      validRowIndices.push(r);
    }

    // Finalize
    if (duplicateIds.size > 0) {
      const list = Array.from(duplicateIds).join(', ');
      errors.unshift(`Column A (Student No.) contains duplicate IDs: ${list}`);
    }
    if (unknownIds.size > 0) {
      const list = Array.from(unknownIds).join(', ');
      errors.unshift(`Column A (Student No.) contains unknown IDs (not found in database): ${list}`);
    }
    const summary = {
      totalRows: aoa.length,
      validRows: validRowIndices.length,
      errors,
      warnings,
      accentedNames: Array.from(accentedNames)
    };

    if (errors.length > 0) {
      return { ok: false, ...summary };
    }

    return { ok: true, ...summary };
  };

  // Parse a validated Excel file into preview grade records for staging on the Grades screen
  const parseExcelForPreview = async (file, selectedClassObj) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return [];
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const termName = currentTerm?.termName || 'Term 1';
    const records = [];
    const maxCols = 7; // Compact layout: A..G
    for (let r = 10; r < aoa.length; r++) {
      const row = aoa[r];
      if (!row || row.length === 0 || row.every(c => String(c).trim() === '')) continue;
      const cells = row.slice(0, maxCols);
      const studentId = String(cells[0] || '').trim();
      const studentName = String(cells[1] || '').trim();
      if (!studentId) continue;
      // Quarterly Exam column is G (index 6)
      const qExam = parseFloat(cells[6]);
      const isNum = (n) => typeof n === 'number' && !Number.isNaN(n);

      // Parse grade breakdown fields for compact layout
      const writtenWorksRaw = parseFloat(cells[2]) || 0; // C
      const writtenWorksHPS = parseFloat(cells[3]) || 0; // D
      const performanceTasksRaw = parseFloat(cells[4]) || 0; // E
      const performanceTasksHPS = parseFloat(cells[5]) || 0; // F
      const quarterlyExam = isNaN(qExam) ? 0 : qExam; // G
      
      console.log('📊 Excel parsing for', studentName, ':', {
        globalQuarter,
        cells: cells.slice(0, 7), // Show first 7 columns
        writtenWorksRaw, writtenWorksHPS,
        performanceTasksRaw, performanceTasksHPS,
        quarterlyExam
      });

      let gradePayload = { 
        quarter1: '', quarter2: '', quarter3: '', quarter4: '',
        // Grade breakdown fields for current quarter
        writtenWorksRaw: writtenWorksRaw,
        writtenWorksHPS: writtenWorksHPS,
        performanceTasksRaw: performanceTasksRaw,
        performanceTasksHPS: performanceTasksHPS,
        quarterlyExam: quarterlyExam
      };
      
      // Set the appropriate quarter based on current selection
      // Quarterly grade is computed later; we only carry exam + raw/hps now

      // Quarterly grade/remarks are computed later in the UI; no need to derive here

      records.push({
        schoolID: studentId,
        studentName,
        grades: {
          ...gradePayload,
          // Quarterly grade/remarks computed later; no semester here
        },
        subjectCode: selectedClassObj?.classCode || selectedClassObj?.className,
        subjectName: selectedClassObj?.className,
      });
    }
    return records;
  };

  const proceedUploadAfterConfirm = async () => {
    try {
      setShowConfirmUpload(false);
      if (!pendingValidatedFile) return;
      setUploadLoading(true);
      setUploadStatus('Staging...');
      const selectedClassObj = facultyClasses[selectedClass];
      const previewRecords = await parseExcelForPreview(pendingValidatedFile, selectedClassObj);
      if (typeof onStageTemporaryGrades === 'function') {
        onStageTemporaryGrades(previewRecords, {
          classObj: selectedClassObj,
          sectionId: selectedSection,
          termName: currentTerm?.termName,
          academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : '',
          quarter: globalQuarter
        });
      }
      setSuccessMessage(`Staged ${previewRecords.length} student grade(s) to the Report table. Review and click Post Grades to finalize.`);
      setUploadProgress(100);
    } catch (e) {
      setValidationMessage('Upload failed: ' + e.message);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setUploadLoading(false);
      setPendingValidatedFile(null);
      setPendingValidatedSummary(null);
      setUploadStatus('');
    }
  };

  const handleUpload = async () => {
    if (!excelFile) {
      setValidationMessage('Please select a file first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    if (!selectedSection || selectedClass === '') {
      setValidationMessage('Please select both class and section before uploading.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    try {
      setUploadLoading(true);
      setUploadProgress(5);
      setUploadStatus('Preparing...');
      await new Promise(r => setTimeout(r, 150));
      setUploadProgress(15);
      setUploadStatus('Validating file...');

      const selectedClassObj = facultyClasses[selectedClass];
      const result = await validateExcelFile(excelFile, selectedClassObj, selectedSection);
      setUploadProgress(40);
      setUploadStatus('Validation complete');

      if (!result.ok) {
        const msg = [
          'Validation failed:',
          ...result.errors.map(e => `- ${e}`)
        ].join('\n');
        setValidationMessage(msg);
        setValidationType('error');
        setShowValidationModal(true);
        setUploadLoading(false);
        setUploadProgress(0);
        setUploadStatus('');
        return;
      }

      // Show warnings/accents confirmation before proceeding
      const notes = [];
      if (result.warnings?.length) notes.push(...result.warnings);
      if (result.accentedNames?.length) {
        notes.push(`These students contain accents in their names:\n- ${result.accentedNames.join('\n- ')}`);
      }
      if (notes.length > 0) {
        setConfirmUploadMessage(`Proceed with upload?\n\n${notes.join('\n\n')}`);
        setPendingValidatedFile(excelFile);
        setPendingValidatedSummary(result);
        setShowConfirmUpload(true);
        setUploadLoading(false);
        setUploadProgress(50);
        setUploadStatus('Awaiting confirmation...');
        return;
      }

      // No warnings: stage records to the Grades screen as temporary (not posted)
      setUploadStatus('Parsing file...');
      const previewRecords = await parseExcelForPreview(excelFile, selectedClassObj);
      setUploadProgress(70);
      if (typeof onStageTemporaryGrades === 'function') {
        onStageTemporaryGrades(previewRecords, {
          classObj: selectedClassObj,
          sectionId: selectedSection,
          termName: currentTerm?.termName,
          academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : '',
          quarter: globalQuarter
        });
      }
      setUploadStatus('Finalizing...');
      setUploadProgress(95);
      await new Promise(r => setTimeout(r, 200));
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 200));
      setSuccessMessage(`Staged ${previewRecords.length} student grade(s) to the Report table. Review and click Post Grades to finalize.`);
      setUploadStatus('Completed');
      setUploadLoading(false);
    } catch (error) {
      setValidationMessage('Validation error: ' + error.message);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      // proceedUploadAfterConfirm handles loading cleanup
    }
  };

  const exportGradesToStudents = async () => {
    if (selectedClass === '' || !selectedSection) {
      setValidationMessage('Please select both a class and section first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }
    try {
      setExportLoading(true);
      const classObj = facultyClasses[selectedClass];
      const token = localStorage.getItem('token');
      const payload = {
        classId: classObj._id || classObj.classID || classObj.classCode,
        sectionId: selectedSection,
      };
      const res = await fetch(`${API_BASE}/api/grades/export-to-students`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setSuccessMessage(data.message || 'Grades exported to students successfully.');
        } else {
          const blob = await res.blob();
          const sectionName = sections.find(s => s._id === selectedSection)?.sectionName || 'Section';
          const filename = `${classObj.className}_${sectionName}_Grades_Export.xlsx`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          setSuccessMessage('Grades exported and file downloaded.');
        }
      } else if (res.status === 404) {
        setValidationMessage('Export endpoint not found. Please contact your administrator.');
        setValidationType('error');
        setShowValidationModal(true);
      } else {
        const err = await res.json().catch(() => ({}));
        setValidationMessage(`Export failed: ${err.message || res.statusText}`);
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (e) {
      setValidationMessage(`Export error: ${e.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setExportLoading(false);
    }
  };

  const downloadTemplate = async () => {
    setTemplateLoading(true);
    try {
      const selectedClassObj = facultyClasses[selectedClass];
      const selectedSectionObj = sections.find(s => s._id === selectedSection);
      
      if (!selectedClassObj || !selectedSectionObj) {
        setValidationMessage('Please select both a class and section first.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      // Use legacy client-side template generation (rest of function)

      const quarterLabels = getQuarterLabels();

      // Dynamic fields
      const subjectCode = selectedClassObj.subjectCode || selectedClassObj.classCode || 'N/A';
      const classCode = selectedClassObj.classCode || 'N/A';
      const currentSemester = currentTerm?.termName || '1st';
      const schoolYear = academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'N/A';
      const subjectName = selectedClassObj.className || 'N/A';
      const trackName = selectedSectionObj.trackName || 'N/A';

      // Fetch students for the selected section (with layered fallbacks)
      const token = localStorage.getItem('token');
      let students = [];
      try {
        // Try comprehensive endpoint first
        const classId = selectedClassObj.classID || selectedClassObj._id || selectedClassObj.classCode;
        const compRes = await fetch(`${API_BASE}/api/grading/class/${classId}/section/${selectedSection}/comprehensive`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (compRes.ok) {
          const compData = await compRes.json();
          if (compData?.success && compData?.data?.students?.length) {
            students = compData.data.students;
          }
        }
      } catch {}
      try {
        if (students.length === 0) {
          const directRes = await fetch(`${API_BASE}/api/students/section/${selectedSection}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (directRes.ok) {
            const directData = await directRes.json();
            if (Array.isArray(directData) && directData.length) {
              students = directData;
            }
          }
        }
      } catch {}
      try {
        if (students.length === 0 && selectedClassObj.classID) {
          const membersRes = await fetch(`${API_BASE}/classes/${selectedClassObj.classID}/members`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (membersRes.ok) {
            const membersData = await membersRes.json();
            if (membersData?.students?.length) {
              students = membersData.students;
            }
          }
        }
      } catch {}

      // Frontend guard: only keep true students
      const studentsOnly = (students || []).filter(s => (s.role || '').toLowerCase() === 'students');
      // Normalize students to have school ID and name
      const normalizedStudents = studentsOnly.map((s, idx) => {
        const fullName = s.name || s.studentName || `${s.firstname || ''} ${s.lastname || ''}`.trim() || `Student ${idx + 1}`;
        
        // Format name as "Last Name, First Name" for sorting
        const formatNameForSorting = (name) => {
          const nameParts = name.trim().split(' ');
          if (nameParts.length >= 2) {
            const lastName = nameParts[nameParts.length - 1];
            const firstName = nameParts.slice(0, -1).join(' ');
            return `${lastName}, ${firstName}`;
          }
          return name; // Return as-is if only one name part
        };
        
        return {
          id: s.studentID || s.schoolID || s.userID || s.id || s._id || `S${idx + 1}`,
          name: formatNameForSorting(fullName),
          originalName: fullName, // Keep original for reference
          objectId: s._id || s.id || null,
          userId: s.userID || s.studentID || s.schoolID || null
        };
      });
      
      // Sort students alphabetically by last name (which is now first in formatted name)
      normalizedStudents.sort((a, b) => {
        return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
      });

      if (normalizedStudents.length === 0) {
        setValidationMessage('No students found for this section. The template will still be generated with empty rows.');
        setValidationType('info');
        setShowValidationModal(true);
      }

      // Build worksheet data (A..W)
      const wsData = [
        ["SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC."],
        ["2772-2774 Roxas Boulevard, Pasay City 1300 Philippines"],
        [""],
        [subjectName],
        ["Track:", trackName, "", "Semester:", currentSemester, "", "School Year:", schoolYear],
        ["Subject Code:", subjectCode, "", "Class Code:", classCode, "", `Quarter: ${globalQuarter}`],
        [""],
        [
          "Student No.",
          "STUDENT'S NAME (Alphabetical Order with Middle Initials)",
          "WRITTEN WORKS 30%", "",
          "PERFORMANCE TASKS 50%", "",
          "QUARTERLY\nEXAM"
        ],
        [
          "", "",
          "RAW", "HPS",
          "RAW", "HPS",
          ""
        ],
      ];

      // Fetch student scores and activity totals using the same method as Faculty_Activities
      const fetchStudentScores = async () => {
        const scores = {};
        const activityTotals = { written: 0, performance: 0 };
        
        try {
          // Fetch assignments for this quarter
          const assignmentRes = await fetch(`${API_BASE}/assignments?quarter=${globalQuarter}&termName=${globalTerm}&academicYear=${globalAcademicYear}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          let assignments = [];
          if (assignmentRes.ok) {
            assignments = await assignmentRes.json();
            console.log('📋 Fetched Assignments:', assignments.map(a => ({ 
              id: a._id, 
              title: a.title, 
              classID: a.classID, 
              activityType: a.activityType, 
              points: a.points,
              quarter: a.quarter 
            })));
          }
          
          // Fetch quizzes for this quarter
          const quizRes = await fetch(`${API_BASE}/api/quizzes?classID=${selectedClassObj.classID}&quarter=${globalQuarter}&termName=${globalTerm}&academicYear=${globalAcademicYear}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          let quizzes = [];
          if (quizRes.ok) {
            quizzes = await quizRes.json();
            console.log('📋 Fetched Quizzes:', quizzes.map(q => ({ 
              id: q._id, 
              title: q.title, 
              classID: q.classID, 
              activityType: q.activityType, 
              points: q.points,
              quarter: q.quarter 
            })));
          }
          
          // Process assignments (same logic as Faculty_Activities)
          for (const assignment of assignments) {
            if (assignment.classID === selectedClassObj.classID) {
              const category = assignment.activityType === 'written' ? 'written' : 'performance';
              activityTotals[category] += assignment.points || 0;
              
              try {
                const submissionRes = await fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                if (submissionRes.ok) {
                  const submissions = await submissionRes.json();
                  if (submissions && submissions.length > 0) {
                    // Check if all submissions are graded (same logic as Faculty_Activities)
                    const allGraded = submissions.every(sub => sub.status === 'graded');
                    if (allGraded) {
                      // Process each graded submission
                      submissions.forEach(submission => {
                        if (submission.status === 'graded') {
                          const objectKey = submission.student && typeof submission.student === 'object' && submission.student._id ? String(submission.student._id) : String(submission.student || '');
                          const altKey = submission.studentID ? String(submission.studentID) : null;
                          const keys = [objectKey, altKey].filter(Boolean);
                          keys.forEach(k => {
                            if (!scores[k]) {
                              scores[k] = { written: 0, performance: 0 };
                            }
                            scores[k][category] += submission.grade || 0;
                          });
                        }
                      });
                    }
                  }
                }
              } catch (err) {
                console.error(`Failed to fetch submissions for assignment ${assignment._id}:`, err);
              }
            }
          }
          
          // Process quizzes (same logic as Faculty_Activities)
          for (const quiz of quizzes) {
            const category = quiz.activityType === 'written' ? 'written' : 'performance';
            activityTotals[category] += quiz.points || 0;
            
            try {
              const responseRes = await fetch(`${API_BASE}/api/quizzes/${quiz._id}/responses`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (responseRes.ok) {
                const responses = await responseRes.json();
                if (responses && responses.length > 0) {
                  // Check if all responses are graded (same logic as Faculty_Activities)
                  const allGraded = responses.every(resp => resp.graded === true);
                  if (allGraded) {
                    // Process each graded response
                    responses.forEach(response => {
                      if (response.graded === true) {
                        const objectKey = response.studentId && typeof response.studentId === 'object' && response.studentId._id ? String(response.studentId._id) : String(response.studentId || '');
                        const altKey = response.studentID ? String(response.studentID) : null;
                        const keys = [objectKey, altKey].filter(Boolean);
                        keys.forEach(k => {
                          if (!scores[k]) {
                            scores[k] = { written: 0, performance: 0 };
                          }
                          scores[k][category] += response.score || 0;
                        });
                      }
                    });
                  }
                }
              }
            } catch (err) {
              console.error(`Failed to fetch responses for quiz ${quiz._id}:`, err);
            }
          }
          
          console.log('🔍 Excel Generation - Processed Data:');
          console.log('  - Activity Totals:', activityTotals);
          console.log('  - Student Scores Sample:', Object.keys(scores).slice(0, 3).map(id => ({ id, scores: scores[id] })));
          console.log('  - Assignments processed:', assignments.length);
          console.log('  - Quizzes processed:', quizzes.length);
          console.log('  - All student IDs with scores:', Object.keys(scores));
          console.log('  - Selected Class ID:', selectedClassObj.classID);
          console.log('  - Quarter Filter:', globalQuarter, globalTerm, globalAcademicYear);
          
        } catch (error) {
          console.error('Error fetching student scores:', error);
        }
        
        return { scores, activityTotals };
      };

      // Fetch the actual data
      const { scores, activityTotals } = await fetchStudentScores();
      
      // Debug logging
      console.log('🔍 Excel Generation Debug:');
      console.log('  - Activity Totals:', activityTotals);
      console.log('  - Student Scores Sample:', Object.keys(scores).slice(0, 3).map(id => ({ id, scores: scores[id] })));
      console.log('  - Selected Quarter:', globalQuarter, globalTerm, globalAcademicYear);
      
      // Append student rows with actual data - only include real students
      normalizedStudents.forEach((student) => {
        const keyCandidates = [
          student.objectId ? String(student.objectId) : null,
          student.userId ? String(student.userId) : null,
          student.id ? String(student.id) : null
        ].filter(Boolean);
        let studentScores = { written: 0, performance: 0 };
        for (const k of keyCandidates) {
          if (scores[k]) { studentScores = scores[k]; break; }
        }
        
        // Create row with actual data
        const studentRow = [
          student.id, // A Student No.
          student.name, // B Name
          studentScores.written, // C WW RAW
          activityTotals.written, // D WW HPS
          studentScores.performance, // E PT RAW
          activityTotals.performance, // F PT HPS
          "" // G Quarterly Grade (blank)
        ];
        
        wsData.push(studentRow);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Merges to match simplified layout (A..G)
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // A1:G1
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // A2:G2
        { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }, // A4:G4
        { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } },  // A8:A9 Student No.
        { s: { r: 7, c: 1 }, e: { r: 8, c: 1 } },  // B8:B9 Name
        { s: { r: 7, c: 2 }, e: { r: 7, c: 3 } },  // C8:D8 WW 30% (RAW,HPS)
        { s: { r: 7, c: 4 }, e: { r: 7, c: 5 } },  // E8:F8 PT 50% (RAW,HPS)
        { s: { r: 7, c: 6 }, e: { r: 8, c: 6 } },  // G8:G9 Quarterly Exam
      ];

      // Column widths (A..G)
      ws["!cols"] = [
        { wch: 12 }, // A Student No.
        { wch: 42 }, // B Name
        { wch: 10 }, // C WW RAW
        { wch: 10 }, // D WW HPS
        { wch: 10 }, // E PT RAW
        { wch: 10 }, // F PT HPS
        { wch: 14 }, // G Quarterly Grade
      ];

      // Set row heights for better text wrapping
      ws["!rows"] = [
        { hpt: 20 }, // Row 1
        { hpt: 20 }, // Row 2
        { hpt: 20 }, // Row 3
        { hpt: 20 }, // Row 4
        { hpt: 20 }, // Row 5
        { hpt: 20 }, // Row 6
        { hpt: 20 }, // Row 7
        { hpt: 50 }, // Row 8 - taller for wrapped text
        { hpt: 50 }, // Row 9 - taller for wrapped text
        { hpt: 20 }, // Row 10
      ];

      // Create styles using a more direct approach
      const createStyle = (alignment) => ({
        alignment: {
          horizontal: alignment.horizontal || 'center',
          vertical: alignment.vertical || 'center',
          wrapText: alignment.wrapText || false
        }
      });

      // Apply styles directly to specific cells with proper XLSX alignment values
      const styleCells = [
        // A8, B8: center, middle align, text wrapped
        { cell: 'A8', style: { alignment: { horizontal: 'center', vertical: 'center', wrapText: true } } },
        { cell: 'B8', style: { alignment: { horizontal: 'center', vertical: 'center', wrapText: true } } },
        
        // C8,E8: center, middle align
        { cell: 'C8', style: { alignment: { horizontal: 'center', vertical: 'center' } } },
        { cell: 'E8', style: { alignment: { horizontal: 'center', vertical: 'center' } } },
        
        // C9..F9: center, middle align (RAW/HPS row)
        { cell: 'C9', style: { alignment: { horizontal: 'center', vertical: 'center' } } },
        { cell: 'D9', style: { alignment: { horizontal: 'center', vertical: 'center' } } },
        { cell: 'E9', style: { alignment: { horizontal: 'center', vertical: 'center' } } },
        { cell: 'F9', style: { alignment: { horizontal: 'center', vertical: 'center' } } },
        
        // G8: Quarterly Exam header
        { cell: 'G8', style: { alignment: { horizontal: 'center', vertical: 'center', wrapText: true } } }
      ];

      // Apply all styles
      styleCells.forEach(({ cell, style }) => {
        if (!ws[cell]) ws[cell] = { v: '' };
        ws[cell].s = style;
      });

      // Freeze panes under headers (A..B fixed, top 10 rows)
      ws["!freeze"] = { xSplit: 2, ySplit: 10 };

      // Force apply all styles by recreating the worksheet with styles
      const styledData = wsData.map((row, rowIndex) => {
        return row.map((cell, colIndex) => {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          
          // Check if this cell needs special formatting
          const specialCell = styleCells.find(sc => sc.cell === cellRef);
          if (specialCell) {
            return {
              v: cell,
              s: specialCell.style
            };
          }
          
          return cell;
        });
      });

      // Recreate worksheet with styled data
      const styledWs = XLSX.utils.aoa_to_sheet(styledData);
      
      // Copy merges and other properties
      styledWs["!merges"] = ws["!merges"];
      styledWs["!cols"] = ws["!cols"];
      styledWs["!rows"] = ws["!rows"];
      styledWs["!freeze"] = ws["!freeze"];
      
      // Replace the original worksheet
      Object.assign(ws, styledWs);

      XLSX.utils.book_append_sheet(wb, ws, "Grade Sheet");

      const filename = `${selectedClassObj.className}_${selectedSectionObj.sectionName}_${currentSemester}_${schoolYear}_Template.xlsx`;
      XLSX.writeFile(wb, filename);
      
      setSuccessMessage('Template downloaded successfully!');
    } catch (error) {
      // Template generation error
      setValidationMessage('Failed to generate template: ' + error.message);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setTemplateLoading(false);
    }
  };

  // Fetch classes on component mount
  useEffect(() => {
    if (academicYear && currentTerm) {
      fetchFacultyClasses();
    }
  }, [academicYear, currentTerm]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Faculty_Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-gray-600 text-lg">Loading faculty classes...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no classes found
  if (!loading && facultyClasses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Faculty_Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Grades</h1>
            <p className="text-gray-600">
              Export and manage grades for your assignments, activities, and quizzes
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-8">
              <p className="text-gray-600 text-lg mb-4">
                No classes found for this faculty member.
              </p>
              <p className="text-gray-500 mb-4">
                Please contact your administrator to assign classes to your account.
              </p>
              <button
                onClick={fetchFacultyClasses}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Refresh Classes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Faculty_Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Grades</h1>
              <p className="text-gray-600">
                Export and manage grades for your assignments, activities, and quizzes
              </p>
            </div>
            <div className="flex items-center gap-4"></div>
          </div>
        </div>

        {/* Current Academic Period */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Current Academic Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Academic Year</label>
              <p className="text-lg font-semibold text-gray-900">
                {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Loading...'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Term</label>
              <p className="text-lg font-semibold text-gray-900">
                {currentTerm ? currentTerm.termName : 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        

        {/* Class Selection */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Select Class</h3>
          
          {/* Show loading message when waiting for classes */}
          {loading && (
            <div className="text-center py-4 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-blue-600">Loading your classes...</p>
            </div>
          )}
          
          {/* Warning when no classes available */}
          {!loading && facultyClasses.length === 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800 font-medium">
                ⚠️ No classes available for the current term and academic year.
              </p>
              <div className="text-xs text-orange-700 mt-1 space-y-1">
                <p>• Current Term: {currentTerm?.termName || 'Not set'}</p>
                <p>• Academic Year: {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Not set'}</p>
                <p>• Faculty ID: {localStorage.getItem("userID") || 'Not set'}</p>
              </div>
              <p className="text-xs text-orange-600 mt-2">
                💡 Make sure you have created classes for the current term, or check if the term is properly set.
              </p>
            </div>
          )}
          
          {/* Success message when classes are found */}
          {!loading && facultyClasses.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium">
                ✅ Found {facultyClasses.length} class{facultyClasses.length !== 1 ? 'es' : ''} for {currentTerm?.termName || 'current term'}
              </p>
            </div>
          )}
          
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The system will only show sections that are specifically assigned to the selected class. 
              If no sections appear, it means the selected class doesn't have any sections assigned to it. 
              You can use the refresh (🔄) and test (🧪) buttons to troubleshoot section loading.
            </p>
          </div>

          {/* Class Dropdown */}
          <div className="mb-4">
            <label htmlFor="classSelect" className="block text-sm font-medium text-gray-700 mb-2">
              Choose a class to work with:
            </label>
            <select
              id="classSelect"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading || facultyClasses.length === 0}
            >
              <option value="">-- Select a class --</option>
              {facultyClasses.map((cls, index) => (
                <option key={cls._id || index} value={index}>
                  {cls.className} - {cls.subjectName}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selection */}
          {selectedClass !== '' && (
            <div className="mb-4">
              <label htmlFor="sectionSelect" className="block text-sm font-medium text-gray-700 mb-2">
                Select Section:
              </label>
              <select
                id="sectionSelect"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a section --</option>
                {sections.map((section, index) => (
                  <option key={section._id || index} value={section._id}>
                    {section.sectionName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={fetchFacultyClasses}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              🔄 Refresh Classes
            </button>
            
            <button
              onClick={testAPI}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              🧪 Test API
            </button>
          </div>
        </div>

        {/* Excel Upload Section */}
        {selectedClass !== '' && selectedSection !== '' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Upload Excel File</h3>
            <div className="mb-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!excelFile || uploadLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {uploadLoading ? 'Uploading...' : 'Upload Grades'}
              </button>
              <button
                onClick={downloadTemplate}
                disabled={templateLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {templateLoading ? 'Generating...' : 'Download Student Grades Template'}
              </button>
              <button
                onClick={exportGradesToStudents}
                disabled={exportLoading || selectedClass === '' || !selectedSection}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {exportLoading ? 'Exporting...' : 'Export to Students'}
              </button>
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{uploadProgress}% Complete</p>
              </div>
            )}
            {uploadStatus && (
              <p className={`mt-2 text-sm ${uploadStatus.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {uploadStatus}
              </p>
            )}
            {/* Roster Preview removed per request */}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}
      </div>

      {/* Validation Modal */}
      <ValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        message={validationMessage}
        type={validationType}
      />

      {/* Confirm Upload Modal */}
      {showConfirmUpload && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-30 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-8 border w-full max-w-md max-h-full">
            <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
              <button
                type="button"
                className="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                onClick={() => setShowConfirmUpload(false)}
              >
                <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                </svg>
                <span className="sr-only">Close modal</span>
              </button>
              <div className="p-6 text-center">
                <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
                  {confirmUploadMessage}
                </h3>
                <button
                  onClick={async () => { await proceedUploadAfterConfirm(); }}
                  className="text-white bg-green-600 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 dark:focus:ring-green-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2"
                >
                  Start Upload
                </button>
                <button
                  onClick={() => setShowConfirmUpload(false)}
                  className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
