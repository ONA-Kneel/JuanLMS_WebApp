import React, { useState, useEffect } from 'react';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import ValidationModal from './ValidationModal';
import * as XLSX from 'xlsx';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function GradingSystem() {
  const [facultyClasses, setFacultyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [sections, setSections] = useState([]);
  const [allSections, setAllSections] = useState([]); // Store all sections
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationType, setValidationType] = useState('error');
  const [successMessage, setSuccessMessage] = useState('');

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
        console.error("Failed to fetch academic year", err);
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
        console.log('Fetching sections for term:', currentTerm._id);
        console.log('Current term name:', currentTerm.termName);
        console.log('Current school year:', `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`);
        
        // Try multiple approaches to get sections
        let sectionsData = [];
        
        // Approach 1: Try the term-specific endpoint
        try {
          const response = await fetch(`${API_BASE}/api/terms/${currentTerm._id}/sections`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('Term-specific sections response status:', response.status);
          
          if (response.ok) {
            sectionsData = await response.json();
            console.log('Fetched sections from term endpoint:', sectionsData);
          }
        } catch (error) {
          console.log('Term-specific endpoint failed, trying fallback');
        }
        
        // Approach 2: If no sections from term endpoint, try the general sections endpoint
        if (!sectionsData || sectionsData.length === 0) {
          try {
            console.log('Trying general sections endpoint');
            const fallbackResponse = await fetch(`${API_BASE}/api/sections`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (fallbackResponse.ok) {
              const allSectionsData = await fallbackResponse.json();
              console.log('All sections from general endpoint:', allSectionsData);
              console.log('Looking for sections with:');
              console.log('  termName:', currentTerm.termName);
              console.log('  schoolYear:', `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`);
              
              // Filter sections by current term and school year
              sectionsData = allSectionsData.filter(section => {
                const matches = section.termName === currentTerm.termName && 
                  section.schoolYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
                  section.status === 'active';
                
                if (!matches) {
                  console.log(`Section ${section.sectionName} doesn't match:`, {
                    sectionTermName: section.termName,
                    sectionSchoolYear: section.schoolYear,
                    sectionStatus: section.status,
                    expectedTermName: currentTerm.termName,
                    expectedSchoolYear: `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`
                  });
                }
                
                return matches;
              });
              console.log('Filtered sections for current term:', sectionsData);
            }
          } catch (error) {
            console.log('General sections endpoint also failed');
          }
        }
        
        // Approach 3: If still no sections, try to get sections by track/strand
        if (!sectionsData || sectionsData.length === 0) {
          try {
            console.log('Trying to fetch sections by track/strand');
            // First get tracks
            const tracksResponse = await fetch(`${API_BASE}/api/tracks`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (tracksResponse.ok) {
              const tracks = await tracksResponse.json();
              console.log('Available tracks:', tracks);
              
              // For each track, get strands and sections
              for (const track of tracks) {
                if (track.status === 'active') {
                  const strandsResponse = await fetch(`${API_BASE}/api/strands/track/${track.trackName}?schoolYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}&termName=${currentTerm.termName}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  
                  if (strandsResponse.ok) {
                    const strands = await strandsResponse.json();
                    console.log(`Strands for track ${track.trackName}:`, strands);
                    
                    for (const strand of strands) {
                      if (strand.status === 'active') {
                        const sectionsResponse = await fetch(`${API_BASE}/api/sections/track/${track.trackName}/strand/${strand.strandName}?schoolYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}&termName=${currentTerm.termName}`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        if (sectionsResponse.ok) {
                          const trackStrandSections = await sectionsResponse.json();
                          console.log(`Sections for track ${track.trackName}, strand ${strand.strandName}:`, trackStrandSections);
                          sectionsData.push(...trackStrandSections.filter(s => s.status === 'active'));
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.log('Track/strand approach failed:', error);
          }
        }
        
        // Approach 4: If still no sections, try to get ALL sections without filtering
        if (!sectionsData || sectionsData.length === 0) {
          try {
            console.log('Trying to get ALL sections without filtering');
            const allSectionsResponse = await fetch(`${API_BASE}/api/sections`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (allSectionsResponse.ok) {
              const allSectionsData = await allSectionsResponse.json();
              console.log('ALL sections in database:', allSectionsData);
              
              // Show what we have vs what we're looking for
              console.log('Current term data:', {
                termId: currentTerm._id,
                termName: currentTerm.termName,
                schoolYear: currentTerm.schoolYear
              });
              
              console.log('Current academic year data:', {
                start: academicYear.schoolYearStart,
                end: academicYear.schoolYearEnd,
                fullYear: `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`
              });
              
              // Try to find any sections that might be close
              const closeMatches = allSectionsData.filter(section => 
                section.status === 'active' && (
                  section.termName === currentTerm.termName ||
                  section.schoolYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` ||
                  section.schoolYear === currentTerm.schoolYear
                )
              );
              
              console.log('Close matches found:', closeMatches);
              
              // Use close matches if available
              if (closeMatches.length > 0) {
                sectionsData = closeMatches;
              }
            }
          } catch (error) {
            console.log('Getting all sections failed:', error);
          }
        }
        
        // Final fallback: if we still have no sections, show all active sections
        if (!sectionsData || sectionsData.length === 0) {
          try {
            console.log('Final fallback: showing all active sections');
            const fallbackResponse = await fetch(`${API_BASE}/api/sections`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (fallbackResponse.ok) {
              const allSectionsData = await fallbackResponse.json();
              sectionsData = allSectionsData.filter(s => s.status === 'active');
              console.log('Fallback sections (all active):', sectionsData);
            }
          } catch (error) {
            console.log('Final fallback failed:', error);
          }
        }
        
        console.log('Final sections data:', sectionsData);
        console.log('Sections data type:', typeof sectionsData);
        console.log('Sections data length:', sectionsData?.length || 'undefined');
        if (sectionsData.length > 0) {
          console.log('First section sample:', sectionsData[0]);
        }
        
        setAllSections(sectionsData);
        setSections(sectionsData);
        
      } catch (error) {
        console.error('Failed to fetch sections:', error);
      }
    }
    fetchSections();
  }, [currentTerm, academicYear]);

  // Filter sections based on selected class
  useEffect(() => {
    if (selectedClass !== '' && allSections.length > 0) {
      const selectedClassObj = facultyClasses[selectedClass];
      if (selectedClassObj) {
        // Show all available sections for the selected class
        // The teacher should be able to select from available sections for grading
        console.log('Showing all sections for class:', selectedClassObj.className);
        console.log('Class assigned section:', selectedClassObj.section);
        console.log('Available sections:', allSections);
        setSections(allSections);
      } else {
        // If no class found, show all sections
        setSections(allSections);
      }
    } else {
      // If no class selected, show all sections
      setSections(allSections);
    }
  }, [selectedClass, allSections, facultyClasses]);

  // Fetch faculty classes with sections and assignments
  const fetchFacultyClasses = async () => {
    try {
      setLoading(true);
      console.log('Fetching faculty classes...');
      
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Faculty classes data:', data);
        console.log('Number of classes:', data.length);
        
        // Filter classes: only show active classes for current faculty in current term
        const currentFacultyID = localStorage.getItem("userID");
        let filteredClasses = [];
        
        if (academicYear && currentTerm) {
          filteredClasses = data.filter(cls => 
            cls.facultyID === currentFacultyID && 
            cls.isArchived !== true &&
            cls.academicYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
            cls.termName === currentTerm.termName
          );
          console.log('Filtered classes by term:', filteredClasses);
        }
        
        if (filteredClasses.length > 0) {
          console.log('First class:', filteredClasses[0]);
        }
        setFacultyClasses(filteredClasses);
      } else {
        console.error('Failed to fetch faculty classes');
        setValidationMessage('Failed to fetch faculty classes');
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('Error fetching faculty classes:', error);
      setValidationMessage(`Error fetching faculty classes: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Only fetch classes when we have both academic year and term
  useEffect(() => {
    if (academicYear && currentTerm) {
      fetchFacultyClasses();
    }
  }, [academicYear, currentTerm]);

  

  // Generate Excel template with student names and activity columns
  const generateExcelTemplate = (students, assignments, quizzes, className, sectionName) => {
    console.log('Generating template with:', {
      studentsCount: students?.length || 0,
      assignmentsCount: assignments?.length || 0,
      quizzesCount: quizzes?.length || 0,
      className,
      sectionName
    });

    if (!students || students.length === 0) {
      console.error('No students provided to generateExcelTemplate');
      throw new Error('No students data available to generate template');
    }

    // Define column headers
    const headers = [
      'Student ID',
      'Student Name',
      'Email',
      'Total Score',
      'Total Possible',
      'Percentage'
    ];

    // Add assignment columns
    assignments.forEach((assignment) => {
      headers.push(`${assignment.title} (${assignment.points || 0} pts)`);
    });

    // Add quiz columns
    quizzes.forEach((quiz) => {
      headers.push(`${quiz.title} (${quiz.points || 0} pts)`);
    });

    // Add feedback columns
    assignments.forEach((assignment) => {
      headers.push(`${assignment.title} Feedback`);
    });

    quizzes.forEach((quiz) => {
      headers.push(`${quiz.title} Feedback`);
    });

    console.log('Template headers:', headers);

    // Create data array for the worksheet
    const worksheetData = [headers]; // First row is headers

    // Add student data rows
    students.forEach((student, rowIndex) => {
      const row = [];
      
      console.log(`Processing student ${rowIndex + 1}:`, student);
      
      // Student basic info
      row.push(student.id || '');
      row.push(student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim());
      row.push(student.email || '');
      
      // Score columns (leave blank for faculty to fill)
      row.push(''); // Total Score
      row.push(''); // Total Possible
      row.push(''); // Percentage
      
      // Assignment score columns (blank)
      assignments.forEach(() => {
        row.push('');
      });
      
      // Quiz score columns (blank)
      quizzes.forEach(() => {
        row.push('');
      });
      
      // Assignment feedback columns (blank)
      assignments.forEach(() => {
        row.push('');
      });
      
      // Quiz feedback columns (blank)
      quizzes.forEach(() => {
        row.push('');
      });
      
      worksheetData.push(row);
    });

    console.log('Worksheet data created with rows:', worksheetData.length);

    // Create worksheet from array data
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = headers.map(header => ({ width: Math.max(header.length + 2, 15) }));

    // Set row heights
    worksheet['!rows'] = [{ hpt: 25 }]; // Header row height
    for (let i = 1; i <= students.length; i++) {
      worksheet['!rows'][i] = { hpt: 20 };
    }

    return worksheet;
  };

  // Generate Excel template with grades and feedback
  const generateExcelTemplateWithGrades = (students, activities) => {
    console.log('generateExcelTemplateWithGrades called with:', { students, activities });
    
    if (!students || students.length === 0) {
      console.error('No students provided to generateExcelTemplateWithGrades');
      return null;
    }

    if (!activities || activities.length === 0) {
      console.log('No activities provided, creating basic template');
    }

    // Define headers
    const headers = [
      'Student ID',
      'Student Name',
      'School ID',
      'Section'
    ];

    // Add activity columns with scores and feedback
    activities.forEach((activity) => {
      if (activity.type === 'Assignment') {
        headers.push(`${activity.title} Score`);
        headers.push(`${activity.title} Feedback`);
      } else if (activity.type === 'Quiz') {
        headers.push(`${activity.title} Score`);
        headers.push(`${activity.title} Feedback`);
      }
    });

    console.log('Template with grades headers:', headers);

    // Create data array for the worksheet
    const worksheetData = [headers]; // First row is headers

    // Add student data rows with grades
    students.forEach((student, rowIndex) => {
      const row = [];
      
      console.log(`Processing student ${rowIndex + 1}:`, student);
      
      // Student basic info
      row.push(student.id || '');
      row.push(student.studentName || student.name || '');
      row.push(student.schoolID || '');
      row.push(student.section || '');
      
      // Add activity scores and feedback
      activities.forEach((activity) => {
        if (activity.type === 'Assignment') {
          const submission = activity.submissions?.find(sub => 
            sub.studentId === student.id || sub.userID === student.id || sub.schoolID === student.id
          );
          row.push(submission?.grade || submission?.score || '');
          row.push(submission?.feedback || '');
        } else if (activity.type === 'Quiz') {
          const response = activity.responses?.find(resp => 
            resp.studentId === student.id || resp.userID === student.id || resp.schoolID === student.id
          );
          row.push(response?.score || '');
          row.push(response?.feedback || '');
        }
      });
      
      worksheetData.push(row);
    });

    console.log('Worksheet with grades created with rows:', worksheetData.length);

    // Create worksheet from array data
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = headers.map(header => ({ width: Math.max(header.length + 2, 15) }));

    // Set row heights
    worksheet['!rows'] = [{ hpt: 25 }]; // Header row height
    for (let i = 1; i <= students.length; i++) {
      worksheet['!rows'][i] = { hpt: 20 };
    }

    return worksheet;
  };



  // Download Excel file
  const downloadExcelFile = (worksheet, filename = "Student_GradeSheet.xlsx") => {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grading Template");
    
    // Write and download the file
    XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : "Student_GradeSheet.xlsx");
  };

  // Add effect to log state changes for debugging
  useEffect(() => {
    console.log('State updated:', {
      facultyClasses: facultyClasses.length,
      selectedClass,
      selectedSection
    });
  }, [facultyClasses, selectedClass, selectedSection]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      // Check file extension
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const allowedExtensions = ['xlsx', 'xls', 'csv'];
      
      if (allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)) {
        setExcelFile(file);
        setSuccessMessage(`File selected: ${file.name}`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setValidationMessage('Please select a valid Excel file (.xlsx, .xls) or CSV file.');
        setValidationType('error');
        setShowValidationModal(true);
        // Clear the file input
        e.target.value = '';
      }
    }
  };

  const downloadTemplate = async () => {
    if (!selectedSection) {
      setValidationMessage('Please select a section first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    try {
      const selectedClassObj = facultyClasses[selectedClass];
      if (!selectedClassObj) {
        setValidationMessage('Selected class not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      setTemplateLoading(true);

      // Fetch students in the selected section
      const token = localStorage.getItem('token');
      
      console.log('Attempting to fetch students for section:', selectedSection);
      console.log('Class object:', selectedClassObj);
      
      // Try multiple methods to fetch students
      let studentsData = null;
      
      // Method 1: Try the debug endpoint
      try {
        console.log('Method 1: Trying debug endpoint...');
        const studentsResponse = await fetch(
          `${API_BASE}/api/grading/debug/students/${selectedSection}?` + 
          `trackName=${selectedClassObj.trackName || ''}&` +
          `strandName=${selectedClassObj.strandName || ''}&` +
          `gradeLevel=${selectedClassObj.gradeLevel || ''}&` +
          `schoolYear=${academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : ''}&` +
          `termName=${currentTerm ? currentTerm.termName : ''}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        console.log('Debug endpoint response status:', studentsResponse.status);
        
        if (studentsResponse.ok) {
          const responseData = await studentsResponse.json();
          console.log('Debug endpoint response data:', responseData);
          
          if (responseData.success && responseData.sectionStudents && responseData.sectionStudents.length > 0) {
            studentsData = responseData;
            console.log('Debug endpoint successful, found students:', responseData.sectionStudents.length);
          } else {
            console.log('Debug endpoint returned no students or invalid data');
          }
        } else {
          console.log('Debug endpoint failed with status:', studentsResponse.status);
        }
      } catch (error) {
        console.log('Debug endpoint failed with error:', error);
      }

      // Method 2: Try comprehensive endpoint
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.log('Method 2: Trying comprehensive endpoint...');
        
        try {
          const altResponse = await fetch(
            `${API_BASE}/api/grading/class/${selectedClassObj.classID}/section/${selectedSection}/comprehensive`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          console.log('Comprehensive endpoint response status:', altResponse.status);
          
          if (altResponse.ok) {
            const altData = await altResponse.json();
            console.log('Comprehensive endpoint response data:', altData);
            
            if (altData.success && altData.data && altData.data.students && altData.data.students.length > 0) {
              // Transform the data to match expected format
              studentsData = {
                success: true,
                sectionStudents: altData.data.students.map(student => ({
                  id: student.userID || student.studentId || student._id || '', // Prioritize unencrypted userID
                  name: student.studentName || student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                  email: student.email || `${student.studentName || student.name || 'student'}@example.com`
                }))
              };
              console.log('Comprehensive endpoint successful, transformed students:', studentsData.sectionStudents.length);
            } else {
              console.log('Comprehensive endpoint returned no students or invalid data');
            }
          } else {
            console.log('Comprehensive endpoint failed with status:', altResponse.status);
          }
        } catch (altError) {
          console.log('Comprehensive endpoint failed with error:', altError);
        }
      }

      // Method 3: Try direct student endpoint
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.log('Method 3: Trying direct student endpoint...');
        
        try {
          // Try to get students directly from the students collection
          const directResponse = await fetch(
            `${API_BASE}/api/students/section/${selectedSection}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          console.log('Direct student endpoint response status:', directResponse.status);
          
          if (directResponse.ok) {
            const directData = await directResponse.json();
            console.log('Direct student endpoint response data:', directData);
            
            if (directData && directData.length > 0) {
              studentsData = {
                success: true,
                sectionStudents: directData.map(student => ({
                  id: student.userID || student._id || student.studentID || '', // Prioritize unencrypted userID
                  name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                  email: student.email || `${student.name || 'student'}@example.com`
                }))
              };
              console.log('Direct student endpoint successful, found students:', studentsData.sectionStudents.length);
            } else {
              console.log('Direct student endpoint returned no students');
            }
          } else {
            console.log('Direct student endpoint failed with status:', directResponse.status);
          }
        } catch (directError) {
          console.log('Direct student endpoint failed with error:', directError);
        }
      }

      // Method 4: Try class-based student endpoint
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.log('Method 4: Trying class-based student endpoint...');
        
        try {
          const classResponse = await fetch(
            `${API_BASE}/classes/${selectedClassObj.classID}/members`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          console.log('Class-based student endpoint response status:', classResponse.status);
          
          if (classResponse.ok) {
            const classData = await classResponse.json();
            console.log('Class-based student endpoint response data:', classData);
            
            if (classData && classData.students && classData.students.length > 0) {
              studentsData = {
                success: true,
                sectionStudents: classData.students.map(student => ({
                  id: student.userID || student._id || student.studentID || '', // Prioritize unencrypted userID
                  name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                  email: student.email || `${student.name || 'student'}@example.com`
                }))
              };
              console.log('Class-based student endpoint successful, found students:', studentsData.sectionStudents.length);
            } else {
              console.log('Class-based student endpoint returned no students');
            }
          } else {
            console.log('Class-based student endpoint failed with status:', classResponse.status);
          }
        } catch (classError) {
          console.log('Class-based student endpoint failed with error:', classError);
        }
      }

      // Method 5: Try to get students directly from the class object if it has student data
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.log('Method 5: Checking if class object has student data...');
        
        if (selectedClassObj.students && Array.isArray(selectedClassObj.students) && selectedClassObj.students.length > 0) {
          console.log('Found students in class object:', selectedClassObj.students.length);
          studentsData = {
            success: true,
            sectionStudents: selectedClassObj.students.map(student => ({
              id: student.userID || student._id || student.studentID || student.id || '', // Prioritize unencrypted userID
              name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
              email: student.email || `${student.name || 'student'}@example.com`
            }))
          };
        } else {
          console.log('No students found in class object');
        }
      }

      // Method 6: Try to get students by class code instead of section
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.log('Method 6: Trying to get students by class code...');
        
        try {
          const classCodeResponse = await fetch(
            `${API_BASE}/api/students/class/${selectedClassObj.classCode || selectedClassObj.classID}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          console.log('Class code endpoint response status:', classCodeResponse.status);
          
          if (classCodeResponse.ok) {
            const classCodeData = await classCodeResponse.json();
            console.log('Class code endpoint response data:', classCodeData);
            
            if (classCodeData && classCodeData.length > 0) {
              studentsData = {
                success: true,
                sectionStudents: classCodeData.map(student => ({
                  id: student.userID || student._id || student.studentID || student.id || '', // Prioritize unencrypted userID
                  name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                  email: student.email || `${student.name || 'student'}@example.com`
                }))
              };
              console.log('Class code endpoint successful, found students:', studentsData.sectionStudents.length);
            } else {
              console.log('Class code endpoint returned no students');
            }
          } else {
            console.log('Class code endpoint failed with status:', classCodeResponse.status);
          }
        } catch (classCodeError) {
          console.log('Class code endpoint failed with error:', classCodeError);
        }
      }

      // Method 7: Try to get students by class name
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.log('Method 7: Trying to get students by class name...');
        
        try {
          const classNameResponse = await fetch(
            `${API_BASE}/api/students/className/${encodeURIComponent(selectedClassObj.className)}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          console.log('Class name endpoint response status:', classNameResponse.status);
          
          if (classNameResponse.ok) {
            const classNameData = await classNameResponse.json();
            console.log('Class name endpoint response data:', classNameData);
            
            if (classNameData && classNameData.length > 0) {
              studentsData = {
                success: true,
                sectionStudents: classNameData.map(student => ({
                  id: student.userID || student._id || student.studentID || student.id || '', // Prioritize unencrypted userID
                  name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                  email: student.email || `${student.name || 'student'}@example.com`
                }))
              };
              console.log('Class name endpoint successful, found students:', studentsData.sectionStudents.length);
            } else {
              console.log('Class name endpoint returned no students');
            }
          } else {
            console.log('Class name endpoint failed with status:', classNameResponse.status);
          }
        } catch (classNameError) {
          console.log('Class name endpoint failed with error:', classNameError);
        }
      }

      // Method 8: Check if class object has any student-related fields we might have missed
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.log('Method 8: Checking class object for any student-related fields...');
        console.log('Full class object:', selectedClassObj);
        
        // Look for any field that might contain student data
        const possibleStudentFields = ['students', 'enrolledStudents', 'classStudents', 'members', 'enrollment'];
        
        for (const field of possibleStudentFields) {
          if (selectedClassObj[field] && Array.isArray(selectedClassObj[field]) && selectedClassObj[field].length > 0) {
            console.log(`Found students in field '${field}':`, selectedClassObj[field].length);
                         studentsData = {
               success: true,
               sectionStudents: selectedClassObj[field].map(student => ({
                 id: student.userID || student._id || student.studentID || student.id || '', // Prioritize unencrypted userID
                 name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                 email: student.email || `${student.name || 'student'}@example.com`
               }))
             };
            break;
          }
        }
        
        if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
          console.log('No student data found in any expected fields');
        }
      }

      // Method 9: Try to get students from class members endpoint
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.log('Method 9: Trying to get students from class members endpoint...');
        
        try {
          const membersResponse = await fetch(
            `${API_BASE}/classes/${selectedClassObj.classID}/members`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          console.log('Class members endpoint response status:', membersResponse.status);
          
          if (membersResponse.ok) {
            const membersData = await membersResponse.json();
            console.log('Class members endpoint response data:', membersData);
            
            if (membersData && membersData.students && Array.isArray(membersData.students) && membersData.students.length > 0) {
              studentsData = {
                success: true,
                sectionStudents: membersData.students.map(student => ({
                  id: student.userID || student._id || student.studentID || student.id || '', // Prioritize unencrypted userID
                  name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                  email: student.email || `${student.name || 'student'}@example.com`
                }))
              };
              console.log('Class members endpoint successful, found students:', studentsData.sectionStudents.length);
            } else {
              console.log('Class members endpoint returned no students or invalid data structure');
            }
          } else {
            console.log('Class members endpoint failed with status:', membersResponse.status);
          }
        } catch (membersError) {
          console.log('Class members endpoint failed with error:', membersError);
        }
      }

      // Method 10: Try to get students from the class members page endpoint (the one that shows "Will Bianca")
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.log('Method 10: Trying to get students from class members page endpoint...');
        
        try {
          // This endpoint should return the same data as shown in the class members page
          const membersPageResponse = await fetch(
            `${API_BASE}/classes/${selectedClassObj.classID}/members?includeStudents=true`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          console.log('Class members page endpoint response status:', membersPageResponse.status);
          
          if (membersPageResponse.ok) {
            const membersPageData = await membersPageResponse.json();
            console.log('Class members page endpoint response data:', membersPageData);
            
            // Try different possible data structures
            let foundStudents = null;
            
            if (membersPageData && membersPageData.students && Array.isArray(membersPageData.students)) {
              foundStudents = membersPageData.students;
            } else if (membersPageData && membersPageData.members && Array.isArray(membersPageData.members)) {
              foundStudents = membersPageData.members.filter(member => member.role === 'student');
            } else if (membersPageData && Array.isArray(membersPageData)) {
              foundStudents = membersPageData.filter(item => item.role === 'student' || item.type === 'student');
            }
            
            if (foundStudents && foundStudents.length > 0) {
              studentsData = {
                success: true,
                sectionStudents: foundStudents.map(student => ({
                  id: student.userID || student._id || student.studentID || student.id || '', // Prioritize unencrypted userID
                  name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                  email: student.email || `${student.name || 'student'}@example.com`
                }))
              };
              console.log('Class members page endpoint successful, found students:', studentsData.sectionStudents.length);
            } else {
              console.log('Class members page endpoint returned no students or invalid data structure');
            }
          } else {
            console.log('Class members page endpoint failed with status:', membersPageResponse.status);
          }
        } catch (membersPageError) {
          console.log('Class members page endpoint failed with error:', membersPageError);
        }
      }



      // Method 12: Try to get students from the class members page that shows "Will Bianca"
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.log('Method 12: Trying to get students from the specific class members endpoint...');
        
        try {
          // Try the endpoint that shows the class members page data
          const classMembersResponse = await fetch(
            `${API_BASE}/classes/${selectedClassObj.classID}/members?type=all`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          console.log('Specific class members endpoint response status:', classMembersResponse.status);
          
          if (classMembersResponse.ok) {
            const classMembersData = await classMembersResponse.json();
            console.log('Specific class members endpoint response data:', classMembersData);
            
            // Try to extract students from various possible data structures
            let foundStudents = null;
            
            if (classMembersData && classMembersData.students) {
              foundStudents = Array.isArray(classMembersData.students) ? classMembersData.students : [classMembersData.students];
            } else if (classMembersData && classMembersData.members) {
              foundStudents = Array.isArray(classMembersData.members) ? classMembersData.members : [classMembersData.members];
            } else if (classMembersData && Array.isArray(classMembersData)) {
              foundStudents = classMembersData;
            }
            
            if (foundStudents && foundStudents.length > 0) {
              // Filter for students only
              const studentMembers = foundStudents.filter(member => 
                member && (
                  member.role === 'student' || 
                  member.type === 'student' || 
                  member.userType === 'student' ||
                  (member.name && !member.role) // If no role specified but has name, assume student
                )
              );
              
              if (studentMembers.length > 0) {
                studentsData = {
                  success: true,
                  sectionStudents: studentMembers.map(student => ({
                    id: student.userID || student._id || student.studentID || student.id || '', // Prioritize unencrypted userID
                    name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                    email: student.email || `${student.name || 'student'}@example.com`
                  }))
                };
                console.log('Specific class members endpoint successful, found students:', studentsData.sectionStudents.length);
              } else {
                console.log('No student members found in the data');
              }
            } else {
              console.log('Specific class members endpoint returned no valid data structure');
            }
          } else {
            console.log('Specific class members endpoint failed with status:', classMembersResponse.status);
          }
        } catch (classMembersError) {
          console.log('Specific class members endpoint failed with error:', classMembersError);
        }
      }

      // Final check and error handling
      if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        console.error('All student fetching methods failed');
        console.log('Available data for debugging:');
        console.log('- Selected class:', selectedClassObj);
        console.log('- Selected section:', selectedSection);
        console.log('- Academic year:', academicYear);
        console.log('- Current term:', currentTerm);
        
        // Try one last method: check if we can get students from the class object directly
        console.log('Final attempt: Checking class object structure...');
        console.log('Class object keys:', Object.keys(selectedClassObj));
        console.log('Class object full structure:', JSON.stringify(selectedClassObj, null, 2));
        
        // Look for any array that might contain student-like objects
        for (const [key, value] of Object.entries(selectedClassObj)) {
          if (Array.isArray(value) && value.length > 0) {
            console.log(`Found array in key '${key}' with ${value.length} items:`, value);
            // Check if any item looks like a student
            const firstItem = value[0];
            if (firstItem && (firstItem.name || firstItem.firstname || firstItem.lastname || firstItem.email)) {
              console.log(`Array '${key}' appears to contain student data!`);
              studentsData = {
                success: true,
                sectionStudents: value.map(student => ({
                  id: student.userID || student._id || student.studentID || student.id || '', // Prioritize unencrypted userID
                  name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                  email: student.email || `${student.name || 'student'}@example.com`
                }))
              };
              console.log('Successfully extracted students from class object:', studentsData.sectionStudents.length);
              break;
            }
          }
        }
        
        if (!studentsData || !studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
          throw new Error(`No students found in section "${selectedSection}". All fetching methods failed. Please check the section configuration or contact administrator.`);
        }
      }

      console.log('Students data received:', studentsData);
      console.log('Number of students:', studentsData.sectionStudents?.length || 0);
      
      // Validate and clean student data
      if (studentsData.sectionStudents && studentsData.sectionStudents.length > 0) {
        console.log('Raw student data sample:', studentsData.sectionStudents[0]);
        
        // Clean and validate student data
        studentsData.sectionStudents = studentsData.sectionStudents.filter(student => {
          // Check if student has at least a name or ID
          const hasValidData = student && (
            student.name || 
            student.firstname || 
            student.lastname || 
            student.id || 
            student._id || 
            student.userID || 
            student.studentID
          );
          
          if (!hasValidData) {
            console.log('Filtering out invalid student data:', student);
          }
          
          return hasValidData;
        });
        
        console.log('After filtering, students count:', studentsData.sectionStudents.length);
        
        // Ensure all students have proper data structure
        studentsData.sectionStudents = studentsData.sectionStudents.map((student, index) => {
          const processedStudent = {
            id: student.userID || student.id || student._id || student.studentID || `student_${index}`, // Prioritize unencrypted userID
            name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim() || `Student ${index + 1}`,
            email: student.email || `${student.name || `student_${index + 1}`}@example.com`
          };
          
          console.log(`Processed student ${index + 1}:`, processedStudent);
          return processedStudent;
        });
      }

      // Fetch activities (assignments and quizzes) for this class
      const activitiesResponse = await fetch(
        `${API_BASE}/api/grading/class/${selectedClassObj.classID}/section/${selectedSection}/comprehensive`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!activitiesResponse.ok) {
        throw new Error(`Failed to fetch activities: ${activitiesResponse.status}`);
      }

      const activitiesData = await activitiesResponse.json();
      
      if (!activitiesData.success) {
        throw new Error(activitiesData.message || 'Failed to retrieve activities data');
      }

      console.log('Activities data received:', activitiesData);
      console.log('Number of assignments:', activitiesData.data?.assignments?.length || 0);
      console.log('Number of quizzes:', activitiesData.data?.quizzes?.length || 0);

      // Check if we have students
      if (!studentsData.sectionStudents || studentsData.sectionStudents.length === 0) {
        throw new Error('No students found in this section. Please check the section configuration.');
      }

      // Process students data for the template
      const processedStudents = studentsData.sectionStudents.map(student => ({
        id: student.id || student.userID || student.studentID || student._id || '',
        studentName: student.name || student.studentName || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
        schoolID: student.schoolID || student.userID || student.studentID || '',
        section: selectedSection
      }));

      // Create activities array with submissions and responses
      const activities = [];
      
      // Add assignments with submissions
      if (activitiesData.data?.assignments && Array.isArray(activitiesData.data.assignments)) {
        for (const assignment of activitiesData.data.assignments) {
          try {
            const submissionResponse = await fetch(
              `${API_BASE}/api/assignments/${assignment._id}/submissions`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (submissionResponse.ok) {
              const submissionData = await submissionResponse.json();
              assignment.submissions = submissionData.submissions || [];
            }
          } catch (error) {
            console.log(`Failed to fetch submissions for assignment ${assignment._id}:`, error);
            assignment.submissions = [];
          }
          activities.push({
            type: 'Assignment',
            title: assignment.title,
            id: assignment._id,
            maxScore: assignment.maxScore || 100,
            submissions: assignment.submissions || []
          });
        }
      }

      // Add quizzes with responses
      if (activitiesData.data?.quizzes && Array.isArray(activitiesData.data.quizzes)) {
        for (const quiz of activitiesData.data.quizzes) {
          try {
            const responseResponse = await fetch(
              `${API_BASE}/api/quizzes/${quiz._id}/responses`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (responseResponse.ok) {
              const responseData = await responseResponse.json();
              quiz.responses = responseData.responses || [];
            }
          } catch (error) {
            console.log(`Failed to fetch responses for quiz ${quiz._id}:`, error);
            quiz.responses = [];
          }
          activities.push({
            type: 'Quiz',
            title: quiz.title,
            id: quiz._id,
            maxScore: quiz.maxScore || 100,
            responses: quiz.responses || []
          });
        }
      }

      console.log('Processed students:', processedStudents);
      console.log('Activities with submissions/responses:', activities);

      // Generate Excel template with grades
      const excelContent = generateExcelTemplateWithGrades(
        processedStudents,
        activities
      );

      // Download the Excel file
      downloadExcelFile(excelContent, `${selectedClassObj.className}_${selectedSection}_Template_with_Grades.xlsx`);

      setValidationMessage(`Template with grades downloaded successfully with ${processedStudents.length} students and ${activities.length} activities!`);
      setValidationType('success');
      setShowValidationModal(true);

    } catch (error) {
      console.error('Error downloading template:', error);
      setValidationMessage(`Error downloading template: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setTemplateLoading(false);
    }
  };

  const uploadGrades = async () => {
    if (!selectedSection) {
      setValidationMessage('Please select a section first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    try {
      setUploadLoading(true);
      const selectedClassObj = facultyClasses[selectedClass];
      if (!selectedClassObj) {
        setValidationMessage('Selected class not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      // For now, show a message that this feature needs to be implemented
      setValidationMessage('Grade upload feature will be implemented once the backend integration is complete.');
      setValidationType('info');
      setShowValidationModal(true);

    } catch (error) {
      console.error('Error uploading grades:', error);
      setValidationMessage(`Error uploading grades: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setUploadLoading(false);
    }
  };

  // Test all available endpoints to see what's working
  const testAllEndpoints = async () => {
    try {
      setTemplateLoading(true);
      const token = localStorage.getItem('token');
      let testReport = `Endpoint Test Report\n\n`;
      
      // Test basic endpoints
      const basicEndpoints = [
        { name: 'All Students', url: `${API_BASE}/api/students` },
        { name: 'All Classes', url: `${API_BASE}/api/classes` },
        { name: 'All Sections', url: `${API_BASE}/api/sections` },
        { name: 'Active Academic Year', url: `${API_BASE}/api/schoolyears/active` },
        { name: 'Terms', url: `${API_BASE}/api/terms` }
      ];

      for (const endpoint of basicEndpoints) {
        try {
          testReport += `\n--- ${endpoint.name} ---\n`;
          testReport += `URL: ${endpoint.url}\n`;
          
          const response = await fetch(endpoint.url, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          testReport += `Status: ${response.status}\n`;
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              testReport += `✅ Found ${data.length} items\n`;
              if (data.length > 0) {
                testReport += `Sample: ${JSON.stringify(data[0], null, 2)}\n`;
              }
            } else {
              testReport += `✅ Response: ${JSON.stringify(data, null, 2)}\n`;
            }
          } else {
            testReport += `❌ Failed: ${response.statusText}\n`;
          }
        } catch (error) {
          testReport += `❌ Error: ${error.message}\n`;
        }
      }

      setValidationMessage(testReport);
      setValidationType('info');
      setShowValidationModal(true);

    } catch (error) {
      console.error('Error testing endpoints:', error);
      setValidationMessage(`Error testing endpoints: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Debug function to check students in section
  const debugStudents = async () => {
    if (!selectedSection) {
      setValidationMessage('Please select a section first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    try {
      const selectedClassObj = facultyClasses[selectedClass];
      if (!selectedClassObj) {
        setValidationMessage('Selected class not found.');
        setValidationType('error');
        setShowValidationModal(true);
        return;
      }

      setLoading(true);
      
      const token = localStorage.getItem('token');
      let debugReport = `Student Debug Report for ${selectedSection}\n\n`;
      
             // Test all possible endpoints
       const endpoints = [
         {
           name: 'Debug Students Endpoint',
           url: `${API_BASE}/api/grading/debug/students/${selectedSection}?trackName=${selectedClassObj.trackName || ''}&strandName=${selectedClassObj.strandName || ''}&gradeLevel=${selectedClassObj.gradeLevel || ''}&schoolYear=${academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : ''}&termName=${currentTerm ? currentTerm.termName : ''}`,
           transform: (data) => data.success ? data.sectionStudents : null
         },
         {
           name: 'Comprehensive Endpoint',
           url: `${API_BASE}/api/grading/class/${selectedClassObj.classID}/section/${selectedSection}/comprehensive`,
           transform: (data) => data.success && data.data ? data.data.students : null
         },
         {
           name: 'Direct Students Endpoint',
           url: `${API_BASE}/api/students/section/${selectedSection}`,
           transform: (data) => Array.isArray(data) ? data : null
         },

         {
           name: 'Class Code Students Endpoint',
           url: `${API_BASE}/api/students/class/${selectedClassObj.classCode || selectedClassObj.classID}`,
           transform: (data) => Array.isArray(data) ? data : null
         },
         {
           name: 'Class Name Students Endpoint',
           url: `${API_BASE}/api/students/className/${encodeURIComponent(selectedClassObj.className)}`,
           transform: (data) => Array.isArray(data) ? data : null
         },
         {
           name: 'Class Members Endpoint',
           url: `${API_BASE}/classes/${selectedClassObj.classID}/members`,
           transform: (data) => data && data.students ? data.students : null
         },
         {
           name: 'Class Members Page Endpoint',
           url: `${API_BASE}/classes/${selectedClassObj.classID}/members?includeStudents=true`,
           transform: (data) => {
             if (data && data.students) return data.students;
             if (data && data.members) return data.members.filter(m => m.role === 'student');
             if (Array.isArray(data)) return data.filter(m => m.role === 'student' || m.type === 'student');
             return null;
           }
         },

         {
           name: 'All Students Endpoint',
           url: `${API_BASE}/api/students`,
           transform: (data) => Array.isArray(data) ? data : null
         }
       ];

      for (const endpoint of endpoints) {
        try {
          debugReport += `\n--- ${endpoint.name} ---\n`;
          debugReport += `URL: ${endpoint.url}\n`;
          
          const response = await fetch(endpoint.url, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          debugReport += `Status: ${response.status}\n`;
          
          if (response.ok) {
            const data = await response.json();
            debugReport += `Response: ${JSON.stringify(data, null, 2)}\n`;
            
            const students = endpoint.transform(data);
            if (students && students.length > 0) {
              debugReport += `✅ Found ${students.length} students!\n`;
              debugReport += `Sample: ${JSON.stringify(students[0], null, 2)}\n`;
            } else {
              debugReport += `❌ No students found or invalid data structure\n`;
            }
          } else {
            debugReport += `❌ Failed: ${response.statusText}\n`;
          }
        } catch (error) {
          debugReport += `❌ Error: ${error.message}\n`;
        }
      }

      // Add class and section info
      debugReport += `\n--- Class & Section Info ---\n`;
      debugReport += `Selected Class: ${JSON.stringify(selectedClassObj, null, 2)}\n`;
      debugReport += `Selected Section: ${selectedSection}\n`;
      debugReport += `Academic Year: ${academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Not set'}\n`;
      debugReport += `Current Term: ${currentTerm ? currentTerm.termName : 'Not set'}\n`;

      setValidationMessage(debugReport);
      setValidationType('info');
      setShowValidationModal(true);

    } catch (error) {
      console.error('Error debugging students:', error);
      setValidationMessage(`Error debugging students: ${error.message}`);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Grades</h1>
          <p className="text-gray-600">
            Export and manage grades for your assignments, activities, and quizzes
          </p>
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
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> If sections are not showing up, this might be due to a data mismatch between the current academic term and the sections in the database. 
              The system will try multiple approaches to load sections, and you can use the refresh (🔄) and test (🧪) buttons to troubleshoot.
            </p>
          </div>
          <div className="flex gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject (Class):</label>
              <select 
                className="border rounded px-3 py-2 min-w-[200px]"
                value={selectedClass || ""}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection(''); // Reset section when class changes
                }}
              >
                <option value="">Select a subject</option>
                {facultyClasses.map((cls, index) => (
                  <option key={cls.classID} value={index}>
                    {cls.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Section:</label>
              <div className="flex gap-2">
                <select 
                  className="border rounded px-3 py-2 min-w-[200px]"
                  value={selectedSection || ""}
                  onChange={(e) => setSelectedSection(e.target.value)}
                >
                  <option value="">Select a section</option>
                  {sections.map((section) => (
                    <option key={section._id} value={section.sectionName}>
                      {section.sectionName} ({section.trackName} - {section.strandName})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    // Manually trigger sections refresh
                    if (currentTerm && academicYear) {
                      // This will trigger the useEffect that fetches sections
                      setCurrentTerm({ ...currentTerm });
                    }
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  title="Refresh sections"
                >
                  🔄
                </button>
                <button
                  onClick={async () => {
                    // Test sections API directly
                    try {
                      const token = localStorage.getItem("token");
                      console.log('Testing sections API directly...');
                      
                      // Test 1: General sections endpoint
                      const response1 = await fetch(`${API_BASE}/api/sections`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (response1.ok) {
                        const data1 = await response1.json();
                        console.log('Direct API test - All sections:', data1);
                      }
                      
                      // Test 2: Term-specific endpoint
                      if (currentTerm) {
                        const response2 = await fetch(`${API_BASE}/api/terms/${currentTerm._id}/sections`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (response2.ok) {
                          const data2 = await response2.json();
                          console.log('Direct API test - Term sections:', data2);
                        }
                      }
                    } catch (error) {
                      console.error('Direct API test failed:', error);
                    }
                  }}
                  className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  title="Test sections API"
                >
                  🧪
                </button>
              </div>
              {sections.length === 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ No sections loaded. Click the refresh button (🔄) or test button (🧪) to troubleshoot.
                </p>
              )}
              {sections.length > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  ✅ {sections.length} section(s) loaded successfully
                </p>
              )}
            </div>
          </div>
          
          {/* Debug Info */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <p><strong>Selected Subject:</strong> {selectedClass !== '' ? facultyClasses[selectedClass]?.className : 'None'}</p>
            <p><strong>Selected Section:</strong> {selectedSection || 'None'}</p>
            <p><strong>Class Section:</strong> {selectedClass !== '' ? facultyClasses[selectedClass]?.section || 'None' : 'None'}</p>
            <p><strong>Class Code:</strong> {selectedClass !== '' ? facultyClasses[selectedClass]?.classCode : 'None'}</p>
            <p><strong>Total Classes:</strong> {facultyClasses.length}</p>
            <p><strong>Total Sections Available:</strong> {sections.length}</p>
            <p><strong>All Sections:</strong> {allSections.length}</p>
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>Academic Year:</strong> {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Loading...'}</p>
            <p><strong>Current Term:</strong> {currentTerm ? currentTerm.termName : 'Loading...'}</p>
            <p><strong>Current Term ID:</strong> {currentTerm ? currentTerm._id : 'None'}</p>
            <p><strong>Sections Data:</strong> {sections.length > 0 ? `${sections.length} sections loaded` : 'No sections loaded'}</p>
            {sections.length > 0 && (
              <div className="mt-2">
                <p><strong>Available Sections:</strong></p>
                <ul className="list-disc list-inside ml-2">
                  {sections.slice(0, 5).map((section, index) => (
                    <li key={index}>
                      {section.sectionName} ({section.trackName} - {section.strandName})
                    </li>
                  ))}
                  {sections.length > 5 && <li>... and {sections.length - 5} more</li>}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Export All Grades */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Export All Grades</h3>
          <div className="space-y-4">
            <p className="text-gray-600">
              Export comprehensive grades for assignments and quizzes in the selected section as a CSV file.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="flex items-end">
                <button
                  onClick={downloadTemplate}
                   disabled={!selectedSection || templateLoading}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                   {templateLoading ? 'Generating...' : 'Download Template with Grades'}
                </button>
              </div>
            </div>
            
            {/* Debug Information */}
            {import.meta.env.MODE === 'development' && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md text-sm">
                <h4 className="font-semibold mb-2">Debug Info:</h4>
                <p>Selected Class: {selectedClass !== '' ? facultyClasses[selectedClass]?.className : 'None'}</p>
                <p>Selected Section: {selectedSection || 'None'}</p>
                <p>Class Section: {selectedClass !== '' ? facultyClasses[selectedClass]?.section || 'None' : 'None'}</p>
                <p>Class Code: {selectedClass !== '' ? facultyClasses[selectedClass]?.classCode : 'None'}</p>
                <p>Total Classes: {facultyClasses.length}</p>
                <p>Total Sections Available: {sections.length}</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Grading File */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Upload Grading File</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excel File</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedSection}
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload an Excel file with columns: Student Name, Student ID, Assignment/Activity/Quiz, Grade, Feedback (optional).
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={uploadGrades}
                disabled={!excelFile || !selectedSection}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {uploadLoading ? 'Uploading...' : 'Upload Grades'}
              </button>
              
              <button
                onClick={debugStudents}
                 disabled={!selectedSection || loading}
                className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                 {loading ? 'Debugging...' : 'Debug Students'}
               </button>

               <button
                 onClick={testAllEndpoints}
                 disabled={loading}
                 className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors"
               >
                 {loading ? 'Testing...' : 'Test All Endpoints'}
              </button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50">
            {successMessage}
          </div>
        )}

        {/* Validation Modal */}
        <ValidationModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          message={validationMessage}
          type={validationType}
        />
      </div>
    </div>
  );
} 