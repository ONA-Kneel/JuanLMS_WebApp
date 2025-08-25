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
  const [debugMode, setDebugMode] = useState(false);

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
        
        let sectionsData = [];
        
        // Try term-specific endpoint first
        const response = await fetch(`${API_BASE}/api/terms/${currentTerm._id}/sections`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          sectionsData = await response.json();
          console.log('Fetched sections from term endpoint:', sectionsData);
        } else {
          console.log('Term-specific endpoint failed, trying fallback');
          
          // Try general sections endpoint
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
            
            // Filter sections by term and school year
            sectionsData = allSectionsData.filter(section => 
              section.termName === currentTerm.termName &&
              section.schoolYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
              section.status === 'active'
            );
            console.log('Filtered sections for current term:', sectionsData);
          } else {
            console.log('General sections endpoint also failed');
            
            // Try track/strand approach
            try {
              console.log('Trying to fetch sections by track/strand');
              const tracksResponse = await fetch(`${API_BASE}/api/tracks`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (tracksResponse.ok) {
                const tracks = await tracksResponse.json();
                console.log('Available tracks:', tracks);
                
                for (const track of tracks) {
                  const strandsResponse = await fetch(`${API_BASE}/api/strands/track/${track.trackName}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  
                  if (strandsResponse.ok) {
                    const strands = await strandsResponse.json();
                    console.log(`Strands for track ${track.trackName}:`, strands);
                    
                    for (const strand of strands) {
                      const sectionsResponse = await fetch(`${API_BASE}/api/sections/track/${track.trackName}/strand/${strand.strandName}`, {
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
            } catch (error) {
              console.log('Track/strand approach failed:', error);
            }
            
            // If still no sections, try to get all sections and find close matches
            if (sectionsData.length === 0) {
              try {
                console.log('Trying to get ALL sections without filtering');
                const allSectionsResponse = await fetch(`${API_BASE}/api/sections`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                if (allSectionsResponse.ok) {
                  const allSectionsData = await allSectionsResponse.json();
                  console.log('ALL sections in database:', allSectionsData);
                  
                  // Find sections with similar term names or school years
                  const closeMatches = allSectionsData.filter(section => 
                    (section.termName && section.termName.toLowerCase().includes(currentTerm.termName.toLowerCase())) ||
                    (section.schoolYear && section.schoolYear.includes(academicYear.schoolYearStart.toString()))
                  );
                  console.log('Close matches found:', closeMatches);
                  
                  if (closeMatches.length > 0) {
                    sectionsData = closeMatches.filter(s => s.status === 'active');
                  }
                }
              } catch (error) {
                console.log('Getting all sections failed:', error);
              }
            }
            
            // Final fallback: show all active sections
            if (sectionsData.length === 0) {
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
          }
        }
        
        console.log('Final sections data:', sectionsData);
        console.log('Sections data type:', typeof sectionsData);
        console.log('Sections data length:', sectionsData?.length || 'undefined');
        if (sectionsData && sectionsData.length > 0) {
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

  // Filter sections when class is selected
  useEffect(() => {
    if (selectedClass !== '' && facultyClasses[selectedClass]) {
      const selectedClassObj = facultyClasses[selectedClass];
      console.log('Filtering sections for class:', selectedClassObj.className);
      
      // Check if the class has a section assigned
      const classSection = selectedClassObj.section;
      console.log('Class assigned section:', classSection);
      
      if (classSection) {
        // Filter sections to show only the assigned section
        const filteredSections = allSections.filter(section => 
          section.sectionName === classSection
        );
        console.log('Filtered sections:', filteredSections);
        setSections(filteredSections);
      } else {
        console.log('Class has no section assigned:', selectedClassObj.className);
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
        console.log('Faculty classes data from /classes/my-classes:', data);
        console.log('Number of classes:', data.length);
        
        let filteredClasses = [];
        
        if (academicYear && currentTerm) {
          filteredClasses = data.filter(cls =>
            // cls.facultyID === currentFacultyID && // This line was removed
            cls.isArchived !== true &&
            cls.academicYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
            cls.termName === currentTerm.termName
          );
          console.log('Filtered classes by term:', filteredClasses);
        }
        
        setFacultyClasses(filteredClasses);
        setSelectedClass('');
        setSelectedSection('');
      } else {
        console.error('Failed to fetch faculty classes:', response.status);
        setValidationMessage('Failed to fetch faculty classes. Please try again.');
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('Error fetching faculty classes:', error);
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
        console.log('API Test - Classes found:', data.length);
        console.log('API Test - Sample class:', data[0]);
        setValidationMessage(`API Test Successful! Found ${data.length} classes.`);
        setValidationType('success');
        setShowValidationModal(true);
      } else {
        setValidationMessage(`API Test Failed! Status: ${response.status}`);
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('API Test Error:', error);
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

  const handleUpload = async () => {
    if (!excelFile) {
      setValidationMessage('Please select a file first.');
      setValidationType('error');
      setShowValidationModal(true);
      return;
    }

    setUploadLoading(true);
    setUploadProgress(0);
    setUploadStatus('Starting upload...');

    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('classId', facultyClasses[selectedClass]._id);
      formData.append('sectionId', selectedSection);

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/upload-grades`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus('Upload successful!');
        setSuccessMessage('Grades uploaded successfully.');
        setExcelFile(null);
        setUploadProgress(100);
      } else {
        const error = await response.json();
        setUploadStatus('Upload failed: ' + (error.message || 'Unknown error'));
        setValidationMessage('Upload failed: ' + (error.message || 'Unknown error'));
        setValidationType('error');
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Upload failed: ' + error.message);
      setValidationMessage('Upload failed: ' + error.message);
      setValidationType('error');
      setShowValidationModal(true);
    } finally {
      setUploadLoading(false);
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

      // Normalize students to have school ID and name
      const normalizedStudents = students.map((s, idx) => ({
        id:
          s.studentID || s.schoolID || s.userID || s.id || s._id || `S${idx + 1}`,
        name:
          s.name || s.studentName || `${s.firstname || ''} ${s.lastname || ''}`.trim() || `Student ${idx + 1}`
      }));

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
        ["Subject Code:", subjectCode, "", "Class Code:", classCode],
        [""],
        [
          "Student No.",
          "STUDENT'S NAME (Alphabetical Order with Middle Initials)",
          quarterLabels.firstQuarterDisplay, "", "", "", "", "", "", "", "", "",
          quarterLabels.secondQuarterDisplay, "", "", "", "", "", "", "", "",
          "FINAL GRADE"
        ],
        [
          "", "",
          "WRITTEN WORKS 40%", "", "", "",
          "PERFORMANCE TASKS 60%", "", "", "",
          "INITIAL GRADE",
          "QUARTERLY GRADE",
          "WRITTEN WORKS 40%", "", "", "",
          "PERFORMANCE TASKS 60%", "", "", "",
          "INITIAL GRADE",
          "QUARTERLY GRADE",
          ""
        ],
        [
          "", "",
          "RAW", "HPS", "PS", "WS",
          "RAW", "HPS", "PS", "WS",
          "", "",
          "RAW", "HPS", "PS", "WS",
          "RAW", "HPS", "PS", "WS",
          "", "",
          ""
        ],
      ];

      // Append student rows using normalized students; pad to 15 rows
      const EMPTY_21 = Array(21).fill("");
      const totalRows = Math.max(15, normalizedStudents.length);
      for (let i = 0; i < totalRows; i++) {
        const student = normalizedStudents[i];
        if (student) {
          wsData.push([student.id, student.name, ...EMPTY_21]);
        } else {
          wsData.push([i + 1, "", ...EMPTY_21]);
        }
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Merges to match layout
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 22 } }, // A1:W1
        { s: { r: 1, c: 0 }, e: { r: 1, c: 22 } }, // A2:W2
        { s: { r: 3, c: 0 }, e: { r: 3, c: 22 } }, // A4:W4
        { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } },  // A8:A9 Student No.
        { s: { r: 7, c: 1 }, e: { r: 8, c: 1 } },  // B8:B9 Name
        { s: { r: 7, c: 2 }, e: { r: 7, c: 11 } }, // C8:L8 Quarter 1/3 band
        { s: { r: 7, c: 12 }, e: { r: 7, c: 21 } },// M8:V8 Quarter 2/4 band
        { s: { r: 7, c: 22 }, e: { r: 8, c: 22 } },// W8:W9 Final Grade
        { s: { r: 8, c: 2 }, e: { r: 8, c: 5 } },  // C9:F9 WW 40%
        { s: { r: 8, c: 6 }, e: { r: 8, c: 9 } },  // G9:J9 PT 60%
        { s: { r: 8, c: 12 }, e: { r: 8, c: 15 } },// M9:P9 WW 40%
        { s: { r: 8, c: 16 }, e: { r: 8, c: 19 } },// Q9:T9 PT 60%
      ];

      // Column widths
      ws["!cols"] = [
        { wch: 12 },
        { wch: 42 },
        ...Array(20).fill({ wch: 10 }),
        { wch: 12 },
      ];

      // Freeze panes under headers (A..B fixed, top 10 rows)
      ws["!freeze"] = { xSplit: 2, ySplit: 10 };

      XLSX.utils.book_append_sheet(wb, ws, "Grade Sheet");

      const filename = `${selectedClassObj.className}_${selectedSectionObj.sectionName}_${currentSemester}_${schoolYear}_Template.xlsx`;
      XLSX.writeFile(wb, filename);
      
      setSuccessMessage('Template downloaded successfully!');
    } catch (error) {
      console.error('Template generation error:', error);
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
            <div className="flex items-center gap-4">
              {/* Debug toggle for development */}
              <button
                onClick={() => setDebugMode(!debugMode)}
                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                {debugMode ? "Hide Debug" : "Show Debug"}
              </button>
            </div>
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

        {/* Debug info */}
        {debugMode && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
            <h4 className="font-bold text-yellow-800 mb-2">Debug Info:</h4>
            <p className="text-sm text-yellow-700">Academic Year: {JSON.stringify(academicYear)}</p>
            <p className="text-sm text-yellow-700">Current Term: {JSON.stringify(currentTerm)}</p>
            <p className="text-sm text-yellow-700">Classes Found: {facultyClasses.length}</p>
            <p className="text-sm text-yellow-700">Current Faculty ID: {localStorage.getItem("userID") || 'Not set'}</p>
            <p className="text-sm text-yellow-700">API Base: {API_BASE}</p>
            <p className="text-sm text-yellow-700">Loading State: {loading ? 'Yes' : 'No'}</p>
            <p className="text-sm text-yellow-700">Selected Class: {selectedClass !== '' ? facultyClasses[selectedClass]?.className : 'None'}</p>
            <p className="text-sm text-yellow-700">Sections Count: {sections.length}</p>
          </div>
        )}

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
                {templateLoading ? 'Generating...' : 'Download Template'}
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
    </div>
  );
}
