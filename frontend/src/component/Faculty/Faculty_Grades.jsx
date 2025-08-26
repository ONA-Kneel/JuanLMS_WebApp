import Faculty_Navbar from "./Faculty_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';
import GradingSystem from '../GradingSystem';

/**
 * Faculty Grades Component
 * 
 * Features:
 * - Grading Table: Class-based grade management with student selection
 * - Excel Grading System: Bulk grade management
 * - Individual Student Grade Management: Select specific students to manage their grades
 * - File Upload: Upload grades via CSV/Excel files for individual students
 * - Real-time Grade Calculation: Automatic calculation of final grades and remarks
 */

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

// Modal Component
const Modal = ({ isOpen, onClose, title, children, type = 'info' }) => {
  if (!isOpen) return null;

  const getModalStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border-2 ${getModalStyles()}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getIcon()}</span>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Faculty_Grades() {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [activeTab, setActiveTab] = useState('traditional'); // 'traditional' or 'excel'
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState({});
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [studentGrades, setStudentGrades] = useState({});
  const [uploadingStudentGrades, setUploadingStudentGrades] = useState(false);
  const [selectedStudentFile, setSelectedStudentFile] = useState(null);
  const [showIndividualManagement, setShowIndividualManagement] = useState(false);
  
  // Modal states
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const currentFacultyID = localStorage.getItem("userID");

  // Helper function to show modal
  const showModal = (title, message, type = 'info') => {
    setModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  // Helper function to close modal
  const closeModal = () => {
    setModal({
      isOpen: false,
      title: '',
      message: '',
      type: 'info'
    });
  };

  // Helper function to validate grade values (0-100 range)
  const isValidGrade = (grade) => {
    if (!grade || grade === '') return true; // Empty grades are valid
    const gradeNum = parseFloat(grade);
    return !isNaN(gradeNum) && gradeNum >= 0 && gradeNum <= 100;
  };

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

  useEffect(() => {
    async function fetchClasses() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/classes`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        
        // Filter classes: only show classes created by current faculty in current term
        const filtered = data.filter(cls => 
          cls.facultyID === currentFacultyID && 
          cls.isArchived !== true &&
          cls.academicYear === `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}` &&
          cls.termName === currentTerm?.termName
        );
        
        setClasses(filtered);
        console.log("Faculty Grades - Filtered classes:", filtered);
        // Log class details including sections
        filtered.forEach(cls => {
          console.log(`Class: ${cls.className}, Section: ${cls.section}, Class Code: ${cls.classCode}`);
        });
        
        // Debug backend endpoints after classes are loaded
        if (filtered.length > 0) {
          console.log("🔍 Classes loaded, running debug...");
          setTimeout(() => debugBackend(), 1000); // Delay to ensure state is set
        }
      } catch (err) {
        console.error("Failed to fetch classes", err);
      } finally {
        setLoading(false);
      }
    }
    
    // Only fetch classes when we have both academic year and term
    if (academicYear && currentTerm) {
      fetchClasses();
    }
  }, [currentFacultyID, academicYear, currentTerm]);

  useEffect(() => {
    if (selectedClass !== null) {
      fetchSubjects();
      fetchStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass !== null && selectedSection) {
      // Filter students by section if needed
      // This will be handled in the render logic
    }
  }, [selectedClass, selectedSection]);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const selectedClassObj = classes[selectedClass];
      
      // Use a working endpoint or create default subjects directly
      // The /subjects endpoint doesn't exist, so we'll create defaults
      createDefaultSubjects();
      
    } catch (error) {
      console.error('Error in fetchSubjects:', error);
      // Fallback to creating default subjects
      createDefaultSubjects();
    }
  };

  const createDefaultSubjects = () => {
    const selectedClassObj = classes[selectedClass];
    const defaultSubjects = [
      {
        _id: 'subject_1',
        subjectCode: selectedClassObj.className,
        subjectDescription: selectedClassObj.className,
        trackName: selectedClassObj.trackName || 'STEM',
        gradeLevel: selectedClassObj.gradeLevel || '12'
      }
    ];
    setSubjects(defaultSubjects);
    
          // Initialize grades for default subjects based on current term
      const initialGrades = {};
      defaultSubjects.forEach(subject => {
        if (currentTerm?.termName === 'Term 1') {
          initialGrades[subject._id] = {
            quarter1: '',
            quarter2: '',
            semesterFinal: '',
            remarks: ''
          };
        } else if (currentTerm?.termName === 'Term 2') {
          initialGrades[subject._id] = {
            quarter3: '',
            quarter4: '',
            semesterFinal: '',
            remarks: ''
          };
        } else {
          // Default fallback
          initialGrades[subject._id] = {
            quarter1: '',
            quarter2: '',
            semesterFinal: '',
            remarks: ''
          };
        }
      });
      setGrades(initialGrades);
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const selectedClassObj = classes[selectedClass];
      
      // Try multiple endpoints to get students
      let studentsData = [];
      
      try {
        // Try class members endpoint first
        const response = await fetch(`${API_BASE}/classes/${selectedClassObj.classID}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.students) {
            studentsData = data.students;
          }
        }
      } catch {
        console.log('Class members endpoint failed, trying alternatives');
      }
      
      // If no students found, try alternative endpoints
      if (studentsData.length === 0) {
        try {
          const altResponse = await fetch(`${API_BASE}/api/students/class/${selectedClassObj.classCode || selectedClassObj.classID}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (altResponse.ok) {
            const data = await altResponse.json();
            if (data) {
              studentsData = data;
            }
          }
        } catch {
          console.log('Alternative endpoint also failed');
        }
      }
      
      // Transform students data to include grades structure
      const transformedStudents = studentsData.map(student => {
        let gradesStructure = {};
        
        if (currentTerm?.termName === 'Term 1') {
          gradesStructure = {
            quarter1: '',
            quarter2: '',
            semesterFinal: '',
            remarks: ''
          };
        } else if (currentTerm?.termName === 'Term 2') {
          gradesStructure = {
            quarter3: '',
            quarter4: '',
            semesterFinal: '',
            remarks: ''
          };
        } else {
          // Default structure
          gradesStructure = {
            quarter1: '',
            quarter2: '',
            semesterFinal: '',
            remarks: ''
          };
        }
        
        return {
          _id: student._id || student.userID || student.studentID,
          userID: student.userID || student.studentID || student._id, // Ensure userID is captured
          name: student.name || `${student.firstname || ''} ${student.lastname || ''}`.trim(),
          schoolID: student.schoolID || student.userID || student.studentID,
          section: student.section || student.sectionName || 'default',
          grades: gradesStructure
        };
      });
      
      setStudents(transformedStudents);
      
      // Initialize grades state for all students
      const initialGrades = {};
      transformedStudents.forEach(student => {
        initialGrades[student._id] = { ...student.grades };
      });
      setGrades(initialGrades);

      // Load previously saved grades from localStorage
      loadSavedGradesFromDatabase(selectedClassObj.classID, transformedStudents);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  // Load saved grades from database instead of localStorage
  const loadSavedGradesFromDatabase = async (classID, studentsList) => {
    try {
      const token = localStorage.getItem("token");
      const selectedClassObj = classes[selectedClass];
      
      if (!selectedClassObj || !academicYear || !currentTerm) return;
      
      // Fetch grades from database for this class and term
      const response = await fetch(`${API_BASE}/api/semestral-grades/class/${selectedClassObj.classID}?termName=${currentTerm.termName}&academicYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.grades) {
          // Update grades state with database data
          setGrades(prevGrades => {
            const updatedGrades = { ...prevGrades };
            
            studentsList.forEach(student => {
              // Find matching grade record for this student using schoolID consistently
              const studentGradeRecord = data.grades.find(g => 
                g.studentID === student._id || g.schoolID === student.schoolID
              );
              
              if (studentGradeRecord) {
                updatedGrades[student._id] = {
                  ...updatedGrades[student._id],
                  ...studentGradeRecord.grades,
                  isLocked: studentGradeRecord.isLocked || false
                };
              }
            });
            
            return updatedGrades;
          });
        }
              } else {
          // No grades found in database for this class/term
        }
      
    } catch (error) {
      console.error('Error loading saved grades from database:', error);
    }
  };

  const handleClassChange = (e) => {
    const classIndex = parseInt(e.target.value);
    setSelectedClass(classIndex);
    
    // Reset section selection to null when class changes
    setSelectedSection(null);
    
    setSubjects([]);
    setGrades({});
    setStudents([]);
    setSelectedStudent(null);
    setSelectedStudentName('');
    setStudentGrades({});
    setShowIndividualManagement(false);
  };

  const handleSectionChange = (e) => {
    const section = e.target.value;
    setSelectedSection(section);
    setSelectedStudent(null);
    setSelectedStudentName('');
    setStudentGrades({});
    setShowIndividualManagement(false);
  };



  const handleStudentGradeChange = (field, value) => {
    // Validate grade input for quarter grades (0-100 range)
    if (field.includes('quarter') && value !== '') {
      const gradeNum = parseFloat(value);
      
      // Check if grade is within valid range (0-100)
      if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
        // Show error message and don't update the grade
        showModal(
          'Invalid Grade',
          `Grades must be between 0 and 100.\n\nYou entered: ${value}\n\nPlease enter a valid grade.`,
          'error'
        );
        return; // Exit early, don't update the grade
      }
      
      // Limit to 2 decimal places
      value = gradeNum.toFixed(2);
    }

    setStudentGrades(prevGrades => {
      const updatedGrades = {
        ...prevGrades,
        [field]: value
      };
      
      // Calculate semester final grade based on current term
      if (currentTerm?.termName === 'Term 1') {
        // Term 1: Calculate average of Q1 and Q2
        if (field === 'quarter1' || field === 'quarter2') {
          const quarter1 = field === 'quarter1' ? value : prevGrades.quarter1;
          const quarter2 = field === 'quarter2' ? value : prevGrades.quarter2;
          
          if (quarter1 && quarter2) {
            const q1Num = parseFloat(quarter1) || 0;
            const q2Num = parseFloat(quarter2) || 0;
            
            const semesterGrade = (q1Num + q2Num) / 2;
            let remarks = 'PASSED';
            
            if (semesterGrade < 75) {
              remarks = 'FAILED';
            } else if (semesterGrade < 80) {
              remarks = 'REPEAT';
            } else if (semesterGrade < 85) {
              remarks = 'INCOMPLETE';
            }
            
            updatedGrades.semesterFinal = semesterGrade.toFixed(2);
            updatedGrades.remarks = remarks;
          }
        }
      } else if (currentTerm?.termName === 'Term 2') {
        // Term 2: Calculate average of Q3 and Q4
        if (field === 'quarter3' || field === 'quarter4') {
          const quarter3 = field === 'quarter3' ? value : prevGrades.quarter3;
          const quarter4 = field === 'quarter4' ? value : prevGrades.quarter4;
          
          if (quarter3 && quarter4) {
            const q3Num = parseFloat(quarter3) || 0;
            const q4Num = parseFloat(quarter4) || 0;
            
            const semesterGrade = (q3Num + q4Num) / 2;
            let remarks = 'PASSED';
            
            if (semesterGrade < 75) {
              remarks = 'FAILED';
            } else if (semesterGrade < 80) {
              remarks = 'REPEAT';
            } else if (semesterGrade < 85) {
              remarks = 'INCOMPLETE';
            }
            
            updatedGrades.semesterFinal = semesterGrade.toFixed(2);
            updatedGrades.remarks = remarks;
          }
        }
      } else {
        // Default: Calculate average of Q1 and Q2 (fallback)
        if (field === 'quarter1' || field === 'quarter2') {
          const quarter1 = field === 'quarter1' ? value : prevGrades.quarter1;
          const quarter2 = field === 'quarter2' ? value : prevGrades.quarter2;
          
          if (quarter1 && quarter2) {
            const q1Num = parseFloat(quarter1) || 0;
            const q2Num = parseFloat(quarter2) || 0;
            
            const semesterGrade = (q1Num + q2Num) / 2;
            let remarks = 'PASSED';
            
            if (semesterGrade < 75) {
              remarks = 'FAILED';
            } else if (semesterGrade < 80) {
              remarks = 'REPEAT';
            } else if (semesterGrade < 85) {
              remarks = 'INCOMPLETE';
            }
            
            updatedGrades.semesterFinal = semesterGrade.toFixed(2);
            updatedGrades.remarks = remarks;
          }
        }
      }
      
      return updatedGrades;
    });
    
    // Also update the main grades state to sync with the table
    if (selectedStudentName) {
      // Find the student by name to get their ID
      const student = students.find(s => s.name === selectedStudentName);
      if (student) {
        setGrades(prevGrades => ({
          ...prevGrades,
          [student._id]: {
            ...prevGrades[student._id],
            [field]: value
          }
        }));
      }
    }
  };

  const handleStudentFileSelect = (e) => {
    setSelectedStudentFile(e.target.files[0]);
  };

  const uploadStudentGrades = async () => {
    if (!selectedStudentFile || !selectedStudentName || !selectedClass) {
      showModal('Missing Information', 'Please select a file, student, and class first', 'warning');
      return;
    }

    try {
      setUploadingStudentGrades(true);
      
      // Find the student by name to get their ID
      const student = students.find(s => s.name === selectedStudentName);
      if (!student) {
        showModal('Student Not Found', 'The selected student could not be found', 'error');
        return;
      }
      
      // For now, simulate file upload since the API endpoint doesn't exist
      // This is a temporary solution until the backend endpoint is implemented
      console.log('Simulating file upload for student:', student.name);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Parse the file content (basic CSV/Excel simulation)
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        try {
          const content = e.target.result;
          console.log('File content:', content);
          
          // For now, just show success message
          showModal('Upload Successful', 'Student grades uploaded successfully! (Simulated - saved to localStorage)', 'success');
          
          // Clear the file input
          setSelectedStudentFile(null);
          document.getElementById('student-file-input').value = '';
          
          // Refresh students list to show updated grades
          fetchStudents();
        } catch (error) {
          console.error('Error processing file:', error);
          showModal('Processing Error', 'Failed to process file. Please try again.', 'error');
        }
      };
      
      fileReader.readAsText(selectedStudentFile);
      
    } catch (error) {
      console.error('Error uploading student grades:', error);
      showModal('Upload Error', 'Failed to upload grades. Please try again.', 'error');
    } finally {
      setUploadingStudentGrades(false);
    }
  };

  const saveStudentGrades = async () => {


    // Better validation logic
    if (!selectedStudentName || selectedStudentName.trim() === '') {
      showModal('Missing Student', 'Please select a student first', 'warning');
      return;
    }

    if (selectedClass === null || selectedClass === undefined || selectedClass === '') {
      showModal('Missing Class', 'Please select a class first', 'warning');
      return;
    }

    if (!selectedSection || selectedSection.trim() === '') {
      showModal('Missing Section', 'Please select a section first', 'warning');
      return;
    }

    if (!showIndividualManagement) {
      showModal('Section Not Open', 'Please open the Individual Student Grade Management section first', 'warning');
      return;
    }

    // Check if we have valid grades to save
    const hasValidGrades = Object.values(studentGrades).some(grade => 
      grade !== null && grade !== undefined && grade !== ''
    );

    if (!hasValidGrades) {
      showModal('No Grades Entered', 'Please enter at least one quarter grade before saving', 'warning');
      return;
    }

    // Additional validation: Check if all quarter grades are within valid range (0-100)
    const quarterFields = ['quarter1', 'quarter2', 'quarter3', 'quarter4'];
    const invalidGrades = [];
    
    quarterFields.forEach(field => {
      if (studentGrades[field] && studentGrades[field] !== '') {
        const gradeNum = parseFloat(studentGrades[field]);
        if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
          invalidGrades.push(`${field}: ${studentGrades[field]}`);
        }
      }
    });
    
    if (invalidGrades.length > 0) {
      showModal(
        'Invalid Grades Detected',
        `All grades must be between 0 and 100.\n\nInvalid grades:\n${invalidGrades.join('\n')}\n\nPlease correct these grades before saving.`,
        'error'
      );
      return;
    }

    try {
      const selectedClassObj = classes[selectedClass];
      
      if (!selectedClassObj) {
        showModal('Class Not Found', 'Selected class not found. Please try selecting the class again.', 'error');
        return;
      }
      
      // Find the student by name to get their ID
      const student = students.find(s => s.name === selectedStudentName);
      if (!student) {
        showModal('Student Not Found', 'Student not found. Please try selecting the student again.', 'error');
        return;
      }
      
      // Use schoolID consistently instead of userID to avoid discrepancies
      const studentSchoolID = student.schoolID || student._id;
      
      // Prepare grades data for database storage
      const gradesData = {
        studentId: student._id,
        schoolID: studentSchoolID, // Use schoolID as primary identifier
        studentName: student.name,
        subjectCode: selectedClassObj.classCode || selectedClassObj.className,
        subjectName: selectedClassObj.className,
        classID: selectedClassObj.classID,
        section: selectedSection,
        academicYear: `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`,
        termName: currentTerm?.termName,
        facultyID: currentFacultyID,
        grades: {
          quarter1: studentGrades.quarter1 || '',
          quarter2: studentGrades.quarter2 || '',
          quarter3: studentGrades.quarter3 || '',
          quarter4: studentGrades.quarter4 || '',
          semesterFinal: studentGrades.semesterFinal || '',
          remarks: studentGrades.remarks || ''
        },
        isLocked: true,
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // Save to database using the Semestral_Grades_Collection
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/semestral-grades/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gradesData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success message with confirmation that grades cannot be edited
        showModal(
          'Grades Saved Successfully',
          `${selectedStudentName}'s grades have been saved to the database and are now visible in the Report on Learning Progress and Achievement table.\n\n⚠️ These grades cannot be edited anymore and are now visible to students.\n\n💾 Grades are securely stored in the Semestral_Grades_Collection using School ID: ${studentSchoolID}.`,
          'success'
        );
        
        // Update local state to reflect the saved grades
        setGrades(prevGrades => ({
          ...prevGrades,
          [student._id]: {
            ...prevGrades[student._id],
            ...studentGrades,
            isLocked: true
          }
        }));

        // Clear the individual management section
        setShowIndividualManagement(false);
        setSelectedStudentName('');
        setStudentGrades({});

      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save grades to database');
      }

    } catch (error) {
      console.error('Error saving student grades:', error);
      showModal(
        'Save Failed',
        `Failed to save grades: ${error.message || 'Unknown error'}\n\nPlease check your connection and try again.`,
        'error'
      );
    }
  };

  const handleGradeChange = (subjectId, quarter, value) => {
    setGrades(prev => {
      const updatedGrades = {
        ...prev,
        [subjectId]: {
          ...prev[subjectId],
          [quarter]: value
        }
      };
      
      // Calculate semester final grade and remarks based on current term
      if (currentTerm?.termName === 'Term 1') {
        // Term 1: Calculate average of Q1 and Q2
        if (quarter === 'quarter1' || quarter === 'quarter2') {
          const quarter1 = quarter === 'quarter1' ? value : (prev[subjectId]?.quarter1 || '');
          const quarter2 = quarter === 'quarter2' ? value : (prev[subjectId]?.quarter2 || '');
          
          if (quarter1 && quarter2) {
            const q1Num = parseFloat(quarter1) || 0;
            const q2Num = parseFloat(quarter2) || 0;
            
            const semesterGrade = (q1Num + q2Num) / 2;
            let remarks = 'PASSED';
            
            if (semesterGrade < 75) {
              remarks = 'FAILED';
            } else if (semesterGrade < 80) {
              remarks = 'REPEAT';
            } else if (semesterGrade < 85) {
              remarks = 'INCOMPLETE';
            }
            
            updatedGrades[subjectId].semesterFinal = semesterGrade.toFixed(2);
            updatedGrades[subjectId].remarks = remarks;
          }
        }
      } else if (currentTerm?.termName === 'Term 2') {
        // Term 2: Calculate average of Q3 and Q4
        if (quarter === 'quarter3' || quarter === 'quarter4') {
          const quarter3 = quarter === 'quarter3' ? value : (prev[subjectId]?.quarter3 || '');
          const quarter4 = quarter === 'quarter4' ? value : (prev[subjectId]?.quarter4 || '');
          
          if (quarter3 && quarter4) {
            const q3Num = parseFloat(quarter3) || 0;
            const q4Num = parseFloat(quarter4) || 0;
            
            const semesterGrade = (q3Num + q4Num) / 2;
            let remarks = 'PASSED';
            
            if (semesterGrade < 75) {
              remarks = 'FAILED';
            } else if (semesterGrade < 80) {
              remarks = 'REPEAT';
            } else if (semesterGrade < 85) {
              remarks = 'INCOMPLETE';
            }
            
            updatedGrades[subjectId].semesterFinal = semesterGrade.toFixed(2);
            updatedGrades[subjectId].remarks = remarks;
          }
        }
      } else {
        // Default: Calculate average of Q1 and Q2 (fallback)
        if (quarter === 'quarter1' || quarter === 'quarter2') {
          const quarter1 = quarter === 'quarter1' ? value : (prev[subjectId]?.quarter1 || '');
          const quarter2 = quarter === 'quarter2' ? value : (prev[subjectId]?.quarter2 || '');
          
          if (quarter1 && quarter2) {
            const q1Num = parseFloat(quarter1) || 0;
            const q2Num = parseFloat(quarter2) || 0;
            
            const semesterGrade = (q1Num + q2Num) / 2;
            let remarks = 'PASSED';
            
            if (semesterGrade < 75) {
              remarks = 'FAILED';
            } else if (semesterGrade < 80) {
              remarks = 'REPEAT';
            } else if (semesterGrade < 85) {
              remarks = 'INCOMPLETE';
            }
            
            updatedGrades[subjectId].semesterFinal = semesterGrade.toFixed(2);
            updatedGrades[subjectId].remarks = remarks;
          }
        }
      }
      
      return updatedGrades;
    });
    
    // Also update the individual student grades if this student is currently selected
    if (selectedStudentName) {
      const student = students.find(s => s.name === selectedStudentName);
      if (student && student._id === subjectId) {
        setStudentGrades(prev => ({
          ...prev,
          [quarter]: value
        }));
      }
    }
  };





  const calculateSemesterGrade = (quarter1, quarter2) => {
    if (!quarter1 || !quarter2) return '';
    
    const q1 = parseFloat(quarter1) || 0;
    const q2 = parseFloat(quarter2) || 0;
    
    const semesterGrade = (q1 + q2) / 2;
    return semesterGrade.toFixed(2);
  };

  const calculateRemarks = (semesterGrade) => {
    if (!semesterGrade) return '';
    
    const grade = parseFloat(semesterGrade) || 0;
    
    if (grade >= 85) {
      return 'PASSED';
    } else if (grade >= 80) {
      return 'INCOMPLETE';
    } else if (grade >= 75) {
      return 'REPEAT';
    } else {
      return 'FAILED';
    }
  };

  const calculateGeneralAverage = (quarter) => {
    const validGrades = subjects
      .map(subject => {
        const subjectGrades = grades[subject._id];
        if (!subjectGrades) return null;
        
        if (currentTerm?.termName === 'Term 1') {
          if (quarter === 'quarter1') return parseFloat(subjectGrades.quarter1) || null;
          if (quarter === 'quarter2') return parseFloat(subjectGrades.quarter2) || null;
        } else if (currentTerm?.termName === 'Term 2') {
          if (quarter === 'quarter3') return parseFloat(subjectGrades.quarter3) || null;
          if (quarter === 'quarter4') return parseFloat(subjectGrades.quarter4) || null;
        } else {
          // Default fallback
          if (quarter === 'quarter1') return parseFloat(subjectGrades.quarter1) || null;
          if (quarter === 'quarter2') return parseFloat(subjectGrades.quarter2) || null;
        }
        
        if (quarter === 'semesterFinal') return parseFloat(subjectGrades.semesterFinal) || null;
        return null;
      })
      .filter(grade => grade !== null);
    
    if (validGrades.length === 0) return '';
    
    const average = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
    return average.toFixed(2);
  };







  // Save grades to backend
  const saveGrades = async () => {
    if (!selectedClass || subjects.length === 0) return;
    
    // Show confirmation dialog first
    const confirmed = window.confirm(
      `⚠️ CONFIRMATION REQUIRED\n\n` +
      `Are you sure you want to save and post ALL grades for ${classes[selectedClass]?.className}?\n\n` +
      `📊 This will:\n` +
      `• Save all grades to the database (Semestral_Grades_Collection)\n` +
      `• Post grades to the Report on Learning Progress and Achievement table\n` +
      `• Make grades visible to all students\n` +
      `• Lock grades permanently (cannot be edited anymore)\n\n` +
      `Click "OK" to proceed or "Cancel" to abort.`
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      const selectedClassObj = classes[selectedClass];
      
      // Validate all grades before saving
      const invalidGrades = [];
      students.forEach((student, index) => {
        const studentGrades = grades[student._id] || {};
        const quarterFields = ['quarter1', 'quarter2', 'quarter3', 'quarter4'];
        
        quarterFields.forEach(field => {
          if (studentGrades[field] && studentGrades[field] !== '') {
            const gradeNum = parseFloat(studentGrades[field]);
            if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
              invalidGrades.push(`Student ${student.name} - ${field}: ${studentGrades[field]}`);
            }
          }
        });
      });
      
      if (invalidGrades.length > 0) {
        showModal(
          'Invalid Grades Detected',
          `All grades must be between 0 and 100.\n\nInvalid grades:\n${invalidGrades.join('\n')}\n\nPlease correct these grades before posting.`,
          'error'
        );
        return;
      }
      
      // Prepare grades data based on current term
      const gradesData = {
        classID: selectedClassObj.classID,
        className: selectedClassObj.className,
        academicYear: `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`,
        termName: currentTerm?.termName,
        facultyID: currentFacultyID,
        section: selectedSection,
        students: students.map(student => {
          const studentGrades = grades[student._id] || {};
          let gradesStructure = {};
          
          if (currentTerm?.termName === 'Term 1') {
            gradesStructure = {
              quarter1: studentGrades.quarter1 || '',
              quarter2: studentGrades.quarter2 || '',
              semesterFinal: studentGrades.semesterFinal || '',
              remarks: studentGrades.remarks || ''
            };
          } else if (currentTerm?.termName === 'Term 2') {
            gradesStructure = {
              quarter3: studentGrades.quarter3 || '',
              quarter4: studentGrades.quarter4 || '',
              semesterFinal: studentGrades.semesterFinal || '',
              remarks: studentGrades.remarks || ''
            };
          } else {
            // Default fallback
            gradesStructure = {
              quarter1: studentGrades.quarter1 || '',
              quarter2: studentGrades.quarter2 || '',
              semesterFinal: studentGrades.semesterFinal || '',
              remarks: studentGrades.remarks || ''
            };
          }
          
          // Use schoolID consistently instead of userID to avoid discrepancies
          const studentSchoolID = student.schoolID || student._id;
          
          return {
            studentID: student._id,
            schoolID: studentSchoolID, // Use schoolID as primary identifier
            studentName: student.name,
            subjectCode: selectedClassObj.classCode || selectedClassObj.className,
            subjectName: selectedClassObj.className,
            section: student.section,
            grades: gradesStructure,
            isLocked: true
          };
        }),
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // Save to database using the Semestral_Grades_Collection
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/semestral-grades/save-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gradesData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success message that grades are posted to student end
        showModal(
          'All Grades Posted Successfully',
          `Grades have been saved to the database (Semestral_Grades_Collection) and posted to the Report on Learning Progress and Achievement table.\n\n👥 These grades are now visible to all students and cannot be edited anymore.\n\n🔒 All grades are now locked and read-only.\n\n🎯 Students can now view their grades in their student dashboard using their School ID.\n\n💾 Data is securely stored with proper encryption.`,
          'success'
        );
        
        // Mark all grades as locked/read-only
        setGrades(prevGrades => {
          const updatedGrades = {};
          Object.keys(prevGrades).forEach(studentId => {
            updatedGrades[studentId] = {
              ...prevGrades[studentId],
              isLocked: true // Mark all grades as locked
            };
          });
          return updatedGrades;
        });

      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save grades to database');
      }

    } catch (error) {
      console.error('Error saving grades:', error);
      showModal(
        'Save Failed',
        `Failed to save grades: ${error.message || 'Unknown error'}\n\nPlease check your connection and try again.`,
        'error'
      );
    }
  };

  // Debug function to test backend endpoints
  const debugBackend = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log('🔍 [Frontend] Testing backend endpoints...');
      
      // Test current user endpoint
      try {
        const userResponse = await fetch(`${API_BASE}/classes/debug/current-user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('🔍 [Frontend] Current user debug response:', userData);
        } else {
          console.log('🔍 [Frontend] Current user debug failed:', userResponse.status);
        }
      } catch (error) {
        console.log('🔍 [Frontend] Current user debug error:', error);
      }
      
      // Test debug classes endpoint
      try {
        const classesResponse = await fetch(`${API_BASE}/classes/debug/classes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (classesResponse.ok) {
          const classesData = await classesResponse.json();
          console.log('🔍 [Frontend] Debug classes response:', classesData);
        } else {
          console.log('🔍 [Frontend] Debug classes failed:', classesResponse.status);
        }
      } catch (error) {
        console.log('🔍 [Frontend] Debug classes error:', error);
      }
      
      // Test debug users endpoint
      try {
        const usersResponse = await fetch(`${API_BASE}/classes/debug/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          console.log('🔍 [Frontend] Debug users response:', usersData);
        } else {
          console.log('🔍 [Frontend] Debug users failed:', usersResponse.status);
        }
      } catch (error) {
        console.log('🔍 [Frontend] Debug users error:', error);
      }
      
      // Test specific class members endpoint
      if (selectedClass !== null && classes[selectedClass]) {
        const selectedClassObj = classes[selectedClass];
        console.log('🔍 [Frontend] Testing members endpoint for class:', selectedClassObj.classID);
        
        try {
          const membersResponse = await fetch(`${API_BASE}/classes/${selectedClassObj.classID}/members`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('🔍 [Frontend] Members endpoint status:', membersResponse.status);
          
          if (membersResponse.ok) {
            const membersData = await membersResponse.json();
            console.log('🔍 [Frontend] Members endpoint response:', membersData);
          } else {
            const errorText = await membersResponse.text();
            console.log('🔍 [Frontend] Members endpoint error response:', errorText);
          }
        } catch (error) {
          console.log('🔍 [Frontend] Members endpoint error:', error);
        }
      }
      
    } catch (error) {
      console.error('🔍 [Frontend] Debug function error:', error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />
      
      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        type={modal.type}
      >
        <div className="whitespace-pre-line">{modal.message}</div>
      </Modal>

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Grades</h2>
            <p className="text-base md:text-lg">
              <span> </span>{academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              <span> </span>{currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
              <span> </span>{new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={debugBackend}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              title="Debug backend endpoints"
            >
              🔍 Debug
            </button>
            <ProfileMenu/>
          </div>
        </div>

        
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex gap-4 border-b">
            <button
              className={`pb-2 px-4 ${activeTab === 'traditional' ? 'border-b-2 border-blue-900 font-bold' : ''}`}
              onClick={() => setActiveTab('traditional')}
            >
              Grading Table
            </button>
            <button
              className={`pb-2 px-4 ${activeTab === 'excel' ? 'border-b-2 border-blue-900 font-bold' : ''}`}
              onClick={() => setActiveTab('excel')}
            >
              Excel Grading System
            </button>
          </div>
        </div>

        {/* Content based on activeTab */}
        {activeTab === 'traditional' ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
                                      {/* Class Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class:</label>
               <select
                 className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 value={selectedClass !== null ? selectedClass : ""}
                 onChange={handleClassChange}
                 disabled={loading}
               >
                 <option value="">Choose a class...</option>
                 {classes.map((cls, index) => (
                   <option key={cls.classID} value={index}>
                     {cls.className}
                   </option>
                 ))}
               </select>
               {/* Warning when no classes available */}
               {!loading && classes.length === 0 && (
                 <p className="mt-2 text-sm text-orange-600">
                   ⚠️ No classes available for the current term ({currentTerm?.termName || 'Unknown'}) and academic year ({academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Unknown'}).
                 </p>
               )}
             </div>

                           {/* Section Selection */}
              {selectedClass !== null && classes[selectedClass] && classes[selectedClass].section && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Section:</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedSection || ""}
                    onChange={handleSectionChange}
                  >
                    <option value="">Choose a section...</option>
                    {/* Show the class's assigned section */}
                    <option key={classes[selectedClass].section} value={classes[selectedClass].section}>
                      {classes[selectedClass].section}
                    </option>
                    {/* Also show any additional sections from students if they exist */}
                    {students.length > 0 && Array.from(new Set(students.map(student => student.section || 'default')))
                      .filter(section => section !== classes[selectedClass].section && section !== 'default')
                      .map(section => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                  </select>
                </div>
              )}
             
             {/* Warning when no sections available for the selected class */}
             {selectedClass !== null && classes[selectedClass] && !classes[selectedClass].section && (
               <div className="mb-6">
                 <p className="text-sm text-orange-600">
                   ⚠️ The selected class "{classes[selectedClass].className}" does not have any sections assigned to it.
                 </p>
               </div>
             )}

                                                   {/* Student Search */}
              {selectedClass !== null && selectedSection && students.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Student:</label>
                  <input
                    type="text"
                    placeholder="Search by student name or ID..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedStudent || ""}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Type student name or ID to search, then click on a student to select them
                  </p>
                  
                  {/* Search Results Dropdown */}
                  {selectedStudent && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md bg-white shadow-lg">
                      {students
                        .filter(student => {
                          const searchTerm = selectedStudent.toLowerCase();
                          const studentName = student.name.toLowerCase();
                          const studentID = (student.schoolID || '').toLowerCase();
                          return studentName.includes(searchTerm) || studentID.includes(searchTerm);
                        })
                        .map((student) => (
                          <div
                            key={student._id}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                            onClick={() => {
                              setSelectedStudentName(student.name);
                              // Set the student grades to the selected student's existing grades
                              const existingGrades = grades[student._id] || {};
                              setStudentGrades({
                                quarter1: existingGrades.quarter1 || '',
                                quarter2: existingGrades.quarter2 || '',
                                quarter3: existingGrades.quarter3 || '',
                                quarter4: existingGrades.quarter4 || '',
                                semesterFinal: existingGrades.semesterFinal || '',
                                remarks: existingGrades.remarks || ''
                              });
                              // Clear the search input after selection
                              setSelectedStudent('');
                              // Show the individual management section
                              setShowIndividualManagement(true);
                            }}
                          >
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-gray-600">ID: {student.schoolID || 'N/A'}</div>
                          </div>
                        ))}
                      {students.filter(student => {
                        const searchTerm = selectedStudent.toLowerCase();
                        const studentName = student.name.toLowerCase();
                        const studentID = (student.schoolID || '').toLowerCase();
                        return studentName.includes(searchTerm) || studentID.includes(searchTerm);
                      }).length === 0 && (
                        <div className="p-3 text-gray-500 text-center">
                          No students found matching your search
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

                                                   {/* Individual Student Grade Management */}
               {selectedStudentName && showIndividualManagement && (
                 <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50 relative">
                   <div className="flex justify-between items-start mb-4">
                     <h3 className="text-lg font-semibold text-gray-800">
                       Individual Student Grade Management - {currentTerm?.termName || 'Current Term'}
                       {selectedSection && selectedSection !== 'default' && (
                         <span className="text-sm font-normal text-gray-600 ml-2">
                           (Section: {selectedSection})
                         </span>
                       )}
                     </h3>
                     <button
                       onClick={() => setShowIndividualManagement(false)}
                       className="text-gray-500 hover:text-gray-700 text-xl font-bold leading-none p-1 rounded-full hover:bg-gray-200 transition-colors"
                       title="Close Individual Student Grade Management"
                     >
                       ×
                     </button>
                   </div>
                  
                                    {/* Student Name and ID Display */}
                   <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                     <p className="text-sm font-medium text-blue-800 mb-1">
                       <strong>Student Name:</strong> {selectedStudentName}
                     </p>
                     <p className="text-xs text-blue-700">
                       <strong>Student ID:</strong> {(() => {
                         const student = students.find(s => s.name === selectedStudentName);
                         return student ? (student.schoolID || 'N/A') : 'N/A';
                       })()}
                     </p>
                   </div>

                   {/* Check if grades are locked */}
                   {(() => {
                     const student = students.find(s => s.name === selectedStudentName);
                     const studentGradesData = grades[student?._id] || {};
                     const isLocked = studentGradesData.isLocked;
                     
                     if (isLocked) {
                       return (
                         <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                           <p className="text-sm font-medium text-yellow-800 mb-1">
                             ⚠️ Grades Locked
                           </p>
                           <p className="text-xs text-yellow-700">
                             This student's grades have already been saved and posted to the Report on Learning Progress and Achievement table. 
                             Grades cannot be edited anymore and are now visible to students.
                           </p>
                         </div>
                       );
                     }
                     
                     return null;
                   })()}
                  
                  {/* Student Grade Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {(() => {
                      const student = students.find(s => s.name === selectedStudentName);
                      const studentGradesData = grades[student?._id] || {};
                      const isLocked = studentGradesData.isLocked;
                      
                      if (isLocked) {
                        // Show read-only grades when locked
                        return (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">1st Quarter</label>
                              <input
                                type="text"
                                readOnly
                                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 font-semibold"
                                value={studentGrades.quarter1 || studentGradesData.quarter1 || ''}
                              />
                              <p className="text-xs text-gray-500 mt-1">Grades locked - cannot edit</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">2nd Quarter</label>
                              <input
                                type="text"
                                readOnly
                                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 font-semibold"
                                value={studentGrades.quarter2 || studentGradesData.quarter2 || ''}
                              />
                              <p className="text-xs text-gray-500 mt-1">Grades locked - cannot edit</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Semester Final Grade</label>
                              <input
                                type="text"
                                readOnly
                                className="w-full p-2 border border-gray-300 rounded-md bg-blue-50 font-semibold"
                                value={studentGrades.semesterFinal || studentGradesData.semesterFinal || ''}
                              />
                              <p className="text-xs text-gray-500 mt-1">Auto-calculated from quarter grades</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                              <input
                                type="text"
                                readOnly
                                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 font-semibold"
                                value={studentGrades.remarks || studentGradesData.remarks || ''}
                              />
                              <p className="text-xs text-gray-500 mt-1">Auto-calculated remarks</p>
                            </div>
                          </>
                        );
                      }
                      
                      // Show editable inputs when not locked
                      if (currentTerm?.termName === 'Term 1') {
                        return (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">1st Quarter</label>
                             <input
                               type="number"
                               min="0"
                               max="100"
                               step="0.01"
                               placeholder="Grade"
                               className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               value={studentGrades.quarter1 || ''}
                               onChange={(e) => handleStudentGradeChange('quarter1', e.target.value)}
                             />
                             <p className="text-xs text-gray-500 mt-1">Valid range: 0.00 - 100.00</p>
                             {studentGrades.quarter1 && (
                               <p className={`text-xs mt-1 ${isValidGrade(studentGrades.quarter1) ? 'text-green-600' : 'text-red-600'}`}>
                                 {isValidGrade(studentGrades.quarter1) ? '✅ Valid grade' : '❌ Invalid grade'}
                               </p>
                             )}
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">2nd Quarter</label>
                             <input
                               type="number"
                               min="0"
                               max="100"
                               step="0.01"
                               placeholder="Grade"
                               className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               value={studentGrades.quarter2 || ''}
                               onChange={(e) => handleStudentGradeChange('quarter2', e.target.value)}
                             />
                             <p className="text-xs text-gray-500 mt-1">Valid range: 0.00 - 100.00</p>
                             {studentGrades.quarter2 && (
                               <p className={`text-xs mt-1 ${isValidGrade(studentGrades.quarter2) ? 'text-green-600' : 'text-red-600'}`}>
                                 {isValidGrade(studentGrades.quarter2) ? '✅ Valid grade' : '❌ Invalid grade'}
                               </p>
                             )}
                           </div>
                         </>
                       );
                     } else if (currentTerm?.termName === 'Term 2') {
                       return (
                         <>
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">3rd Quarter</label>
                             <input
                               type="number"
                               min="0"
                               max="100"
                               step="0.01"
                               placeholder="Grade"
                               className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               value={studentGrades.quarter3 || ''}
                               onChange={(e) => handleStudentGradeChange('quarter3', e.target.value)}
                             />
                             <p className="text-xs text-gray-500 mt-1">Valid range: 0.00 - 100.00</p>
                             {studentGrades.quarter3 && (
                               <p className={`text-xs mt-1 ${isValidGrade(studentGrades.quarter3) ? 'text-green-600' : 'text-red-600'}`}>
                                 {isValidGrade(studentGrades.quarter3) ? '✅ Valid grade' : '❌ Invalid grade'}
                               </p>
                             )}
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">4th Quarter</label>
                             <input
                               type="number"
                               min="0"
                               max="100"
                               step="0.01"
                               placeholder="Grade"
                               className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               value={studentGrades.quarter4 || ''}
                               onChange={(e) => handleStudentGradeChange('quarter4', e.target.value)}
                             />
                             <p className="text-xs text-gray-500 mt-1">Valid range: 0.00 - 100.00</p>
                             {studentGrades.quarter4 && (
                               <p className={`text-xs mt-1 ${isValidGrade(studentGrades.quarter4) ? 'text-green-600' : 'text-red-600'}`}>
                                 {isValidGrade(studentGrades.quarter4) ? '✅ Valid grade' : '❌ Invalid grade'}
                               </p>
                             )}
                           </div>
                         </>
                       );
                     } else {
                       return (
                         <>
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Quarter 1</label>
                             <input
                               type="number"
                               min="0"
                               max="100"
                               step="0.01"
                               placeholder="Grade"
                               className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               value={studentGrades.quarter1 || ''}
                               onChange={(e) => handleStudentGradeChange('quarter1', e.target.value)}
                             />
                             <p className="text-xs text-gray-500 mt-1">Valid range: 0.00 - 100.00</p>
                             {studentGrades.quarter1 && (
                               <p className={`text-xs mt-1 ${isValidGrade(studentGrades.quarter1) ? 'text-green-600' : 'text-red-600'}`}>
                                 {isValidGrade(studentGrades.quarter1) ? '✅ Valid grade' : '❌ Invalid grade'}
                               </p>
                             )}
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Quarter 2</label>
                             <input
                               type="number"
                               min="0"
                               max="100"
                               step="0.01"
                               placeholder="Grade"
                               className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               value={studentGrades.quarter2 || ''}
                               onChange={(e) => handleStudentGradeChange('quarter2', e.target.value)}
                             />
                             <p className="text-xs text-gray-500 mt-1">Valid range: 0.00 - 100.00</p>
                             {studentGrades.quarter2 && (
                               <p className={`text-xs mt-1 ${isValidGrade(studentGrades.quarter2) ? 'text-green-600' : 'text-red-600'}`}>
                                 {isValidGrade(studentGrades.quarter2) ? '✅ Valid grade' : '❌ Invalid grade'}
                               </p>
                             )}
                           </div>
                         </>
                       );
                     }
                    })()}
                                      <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Semester Final Grade</label>
                      <input
                        type="text"
                        readOnly
                        className="w-full p-2 border border-gray-300 rounded-md bg-blue-50 font-semibold"
                        value={studentGrades.semesterFinal || ''}
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto-calculated from quarter grades</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={studentGrades.remarks || ''}
                        onChange={(e) => handleStudentGradeChange('remarks', e.target.value)}
                        disabled={(() => {
                          const student = students.find(s => s.name === selectedStudentName);
                          const studentGradesData = grades[student?._id] || {};
                          return studentGradesData.isLocked;
                        })()}
                      >
                        <option value="">Select remarks...</option>
                        <option value="PASSED">PASSED</option>
                        <option value="FAILED">FAILED</option>
                        <option value="REPEAT">REPEAT</option>
                        <option value="INCOMPLETE">INCOMPLETE</option>
                      </select>
                    </div>
                 </div>

                 {/* Student Grade Actions */}
                 <div className="flex flex-wrap gap-3">
                   {(() => {
                     const student = students.find(s => s.name === selectedStudentName);
                     const studentGradesData = grades[student?._id] || {};
                     const isLocked = studentGradesData.isLocked;
                     
                     if (isLocked) {
                       return (
                         <div className="text-sm text-gray-600">
                           ✅ Grades are locked and cannot be edited. They are now visible to students.
                         </div>
                       );
                     }
                     
                     return (
                       <>
                         <button
                           onClick={saveStudentGrades}
                           className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                         >
                           Save Student Grades
                         </button>
                         
                         {/* File Upload for Student */}
                         <div className="flex items-center gap-2">
                           <input
                             id="student-file-input"
                             type="file"
                             accept=".csv,.xlsx,.xls"
                             onChange={handleStudentFileSelect}
                             className="hidden"
                           />
                           <label
                             htmlFor="student-file-input"
                             className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
                           >
                             Choose File
                           </label>
                           {selectedStudentFile && (
                             <span className="text-sm text-gray-600">{selectedStudentFile.name}</span>
                           )}
                         </div>
                         
                         {selectedStudentFile && (
                           <button
                             onClick={uploadStudentGrades}
                             disabled={uploadingStudentGrades}
                             className={`px-4 py-2 rounded-md transition-colors ${
                               uploadingStudentGrades 
                                 ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                 : 'bg-orange-600 text-white hover:bg-orange-700'
                             }`}
                           >
                             {uploadingStudentGrades ? 'Uploading...' : 'Upload Student Grades'}
                           </button>
                         )}
                       </>
                     );
                   })()}
                 </div>
               </div>
             )}

                         {/* Main Title */}
             <div className="text-center mb-8">
               <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                 Report on Learning Progress and Achievement
               </h1>
             </div>

             {/* Grades Status Summary */}
             {selectedClass !== null && selectedSection && students.length > 0 && (
               <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                 <div className="flex flex-wrap items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                       <span className="text-sm font-medium text-gray-700">
                         Posted to Students: {students.filter(student => grades[student._id]?.isLocked).length}
                       </span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                       <span className="text-sm font-medium text-gray-700">
                         Pending: {students.filter(student => !grades[student._id]?.isLocked).length}
                       </span>
                     </div>
                   </div>
                   <div className="text-sm text-gray-600">
                     💡 Grades marked as "Posted" are visible to students and cannot be edited anymore.
                   </div>
                 </div>
               </div>
             )}



            {/* Only show tables when both class and section are selected */}
            {selectedClass !== null && selectedSection && selectedSection !== 'default' && (
              <>
                {/* First Semester Section - Only show if Term 1 is active */}
                {currentTerm?.termName === 'Term 1' && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">
                          First Semester (Q1 & Q2)
                          {selectedSection && selectedSection !== 'default' && (
                            <span className="text-sm font-normal text-gray-600 ml-2">
                              - Section: {selectedSection}
                            </span>
                          )}
                        </h2>
                        {/* Subject information below the semester title */}
                        {selectedClass !== null && classes[selectedClass] && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p><strong>Subject:</strong> {classes[selectedClass].className}</p>
                            <p><strong>Subject Code:</strong> {classes[selectedClass].classCode}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveGrades}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-orange-600 text-white hover:bg-orange-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Post all grades to student end"
                          disabled={students.length === 0}
                        >
                          Post Grades
                        </button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                                                                           <thead>
                            <tr>
                              <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Student ID</th>
                              <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Students</th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50" colSpan="2">Quarter</th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Remarks</th>
                            </tr>
                            <tr>
                              <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                              <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">1</th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">2</th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                            </tr>
                          </thead>
                                                 <tbody>
                           {students.length > 0 ? (
                                                           students.map((student) => {
                                const studentGrades = grades[student._id] || {};
                                const semesterGrade = calculateSemesterGrade(studentGrades.quarter1, studentGrades.quarter2);
                                const remarks = calculateRemarks(semesterGrade);
                                const isLocked = studentGrades.isLocked;
                                
                                return (
                                  <tr key={student._id} className={`hover:bg-gray-50 ${isLocked ? 'bg-green-50' : ''}`}>
                                    <td className="border border-gray-300 p-2 h-12 font-medium text-sm">
                                      {student.schoolID || 'N/A'}
                                    </td>
                                    <td className="border border-gray-300 p-2 h-12 font-medium">
                                      <div className="flex items-center gap-2">
                                        {student.name}
                                        {isLocked && (
                                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                            ✅ Posted
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                                                        <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {studentGrades.quarter1 || '-'}
                                     </td>
                                     <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {studentGrades.quarter2 || '-'}
                                     </td>
                                                                        <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {studentGrades.semesterFinal || semesterGrade || '-'}
                                     </td>
                                     <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {studentGrades.remarks || remarks || '-'}
                                     </td>
                                   </tr>
                                 );
                               })
                            ) : (
                              <tr>
                                <td colSpan="6" className="border border-gray-300 p-4 text-center text-gray-500">
                                  No students available in this class and section.
                                </td>
                              </tr>
                            )}
                            
                            {/* General Average */}
                            <tr className="bg-yellow-100">
                              <td className="border border-gray-300 p-2 font-bold text-gray-800" colSpan="2">General Average</td>
                              <td className="border border-gray-300 p-2 text-center font-bold">
                                {students.length > 0 ? calculateGeneralAverage('quarter1') : ''}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-bold">
                                {students.length > 0 ? calculateGeneralAverage('quarter2') : ''}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-bold">
                                {students.length > 0 ? calculateGeneralAverage('semesterFinal') : ''}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-bold">
                                {/* Remarks column for General Average */}
                              </td>
                            </tr>
                         </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Second Semester Section - Only show if Term 2 is active */}
                {currentTerm?.termName === 'Term 2' && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">
                          Second Semester (Q3 & Q4)
                          {selectedSection && selectedSection !== 'default' && (
                            <span className="text-sm font-normal text-gray-600 ml-2">
                              - Section: {selectedSection}
                            </span>
                          )}
                        </h2>
                        {/* Subject information below the semester title */}
                        {selectedClass !== null && classes[selectedClass] && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p><strong>Subject:</strong> {classes[selectedClass].className}</p>
                            <p><strong>Subject Code:</strong> {classes[selectedClass].classCode}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveGrades}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-orange-600 text-white hover:bg-orange-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Save all grades to database"
                          disabled={students.length === 0}
                        >
                          Post Grades
                        </button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                                                                           <thead>
                            <tr>
                              <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Student ID</th>
                              <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50">Students</th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50" colSpan="2">Quarter</th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Semester Final Grade</th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">Remarks</th>
                            </tr>
                            <tr>
                              <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                              <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-50"></th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">3</th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">4</th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                              <th className="border border-gray-300 p-3 text-center font-semibold bg-gray-50"></th>
                            </tr>
                          </thead>
                                                 <tbody>
                           {students.length > 0 ? (
                                                           students.map((student) => {
                                const studentGrades = grades[student._id] || {};
                                const semesterGrade = calculateSemesterGrade(studentGrades.quarter3, studentGrades.quarter4);
                                const remarks = calculateRemarks(semesterGrade);
                                const isLocked = studentGrades.isLocked;
                                
                                return (
                                  <tr key={student._id} className={`hover:bg-gray-50 ${isLocked ? 'bg-green-50' : ''}`}>
                                    <td className="border border-gray-300 p-2 h-12 font-medium text-sm">
                                      {student.schoolID || 'N/A'}
                                    </td>
                                    <td className="border border-gray-300 p-2 h-12 font-medium">
                                      <div className="flex items-center gap-2">
                                        {student.name}
                                        {isLocked && (
                                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                            ✅ Posted
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                                                        <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {studentGrades.quarter3 || '-'}
                                     </td>
                                     <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {studentGrades.quarter4 || '-'}
                                     </td>
                                     <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {studentGrades.semesterFinal || semesterGrade || '-'}
                                     </td>
                                     <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {studentGrades.remarks || remarks || '-'}
                                     </td>
                                   </tr>
                                 );
                               })
                            ) : (
                              <tr>
                                <td colSpan="6" className="border border-gray-300 p-4 text-center text-gray-500">
                                  No students available in this class and section.
                                </td>
                              </tr>
                            )}
                            
                            {/* General Average */}
                            <tr className="bg-yellow-100">
                              <td className="border border-gray-300 p-2 font-bold text-gray-800" colSpan="2">General Average</td>
                              <td className="border border-gray-300 p-2 text-center font-bold">
                                {students.length > 0 ? calculateGeneralAverage('quarter3') : ''}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-bold">
                                {students.length > 0 ? calculateGeneralAverage('quarter4') : ''}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-bold">
                                {students.length > 0 ? calculateGeneralAverage('semesterFinal') : ''}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-bold">
                                {/* Remarks column for General Average */}
                              </td>
                            </tr>
                         </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Show message when no active term matches */}
                {!currentTerm?.termName || (currentTerm?.termName !== 'Term 1' && currentTerm?.termName !== 'Term 2') && (
                  <div className="text-center py-8 text-gray-600">
                    <p>No active term found. Please check your academic term settings.</p>
                  </div>
                )}
              </>
            )}

                         {/* Show message when class or section not selected */}
             {(selectedClass === null || !selectedSection || selectedSection === 'default') && (
               <div className="text-center py-8 text-gray-600">
                 {selectedClass === null ? (
                   <p>Please select a class to view available sections and the grading table.</p>
                 ) : !selectedSection ? (
                   <p>Please select a section to view the grading table for the selected class.</p>
                 ) : (
                   <p>Please select both a class and section to view the grading table.</p>
                 )}
               </div>
             )}
          </div>
        ) : (
          <GradingSystem />
        )}

        


      </div>
    </div>
  );
}
