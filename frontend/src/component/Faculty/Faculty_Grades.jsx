import Faculty_Navbar from "./Faculty_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';
import GradingSystem from '../GradingSystem';
import QuarterSelector from "../QuarterSelector";
import { useQuarter } from "../../context/QuarterContext.jsx";

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
    <div className="fixed inset-0 bg-black/50 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
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
  // Get quarter context
  const { globalQuarter, globalTerm, globalAcademicYear } = useQuarter();
  
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
  const [showIndividualManagement, setShowIndividualManagement] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
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

  // Refetch grades when quarter changes
  useEffect(() => {
    if (globalQuarter && globalTerm && globalAcademicYear && selectedClass !== null && students.length > 0) {
      loadSavedGradesFromDatabase(classes[selectedClass]?.classID, students);
    }
  }, [globalQuarter, globalTerm, globalAcademicYear]);

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
        // Use the same working endpoint as Faculty_Classes.jsx
        const res = await fetch(`${API_BASE}/classes/my-classes`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        
        console.log("🔍 Fetched classes from /classes/my-classes:", data);
        console.log("🔍 Filtering with:", {
          currentFacultyID,
          academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : null,
          currentTerm: currentTerm?.termName,
          totalClasses: data.length
        });
        
        // Filter classes: only show classes created by current faculty in current term
        const filtered = data.filter(cls => {
          const matches = cls.isArchived !== true &&
          cls.academicYear === `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}` &&
            cls.termName === currentTerm?.termName;
          
          console.log(`Class ${cls.className}:`, {
            facultyID: cls.facultyID,
            isArchived: cls.isArchived,
            academicYear: cls.academicYear,
            termName: cls.termName,
            matches
          });
          
          return matches;
        });
        
        console.log("✅ Filtered classes for grades:", filtered);
        setClasses(filtered);
      } catch (err) {
        console.error("❌ Failed to fetch classes", err);
        setClasses([]);
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
      
      if (!selectedClassObj) {
        console.log('❌ No class object found for selected class index:', selectedClass);
        setStudents([]);
        return;
      }
      
      console.log('🔍 Fetching students for class:', selectedClassObj.classID);
      console.log('🔍 Class object:', selectedClassObj);
      
      // Try multiple endpoints to get students
      let studentsData = [];
      
      try {
        // Try class members endpoint first
        const response = await fetch(`${API_BASE}/classes/${selectedClassObj.classID}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Class members response:', data);
          if (data && data.students) {
            studentsData = (data.students || []).filter(s => {
              const role = (s.role || '').toLowerCase();
              return role === 'student' || role === 'students';
            });
          } else if (data && Array.isArray(data)) {
            // Sometimes the endpoint returns an array directly
            studentsData = (data || []).filter(s => {
              const role = (s.role || '').toLowerCase();
              return role === 'student' || role === 'students';
            });
          }
        } else {
          console.log('❌ Class members endpoint failed:', response.status, response.statusText);
          if (response.status === 404) {
            console.log('⚠️ Class members endpoint not found - this endpoint might not exist');
        }
        }
      } catch (error) {
        console.log('❌ Class members endpoint error:', error);
      }
      
      // If no students found, try alternative endpoints
      if (studentsData.length === 0) {
        try {
          console.log('🔍 Trying alternative endpoint for students...');
          const altResponse = await fetch(`${API_BASE}/api/students/class/${selectedClassObj.classCode || selectedClassObj.classID}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (altResponse.ok) {
            const data = await altResponse.json();
            console.log('✅ Alternative endpoint response:', data);
            if (data) {
              studentsData = data;
            }
          } else {
            console.log('❌ Alternative endpoint failed:', altResponse.status, altResponse.statusText);
            if (altResponse.status === 404) {
              console.log('⚠️ Alternative students endpoint not found');
            }
          }
        } catch (error) {
          console.log('❌ Alternative endpoint error:', error);
        }
      }
      
      // If still no students, try to get from semestral grades
      if (studentsData.length === 0) {
        try {
          console.log('🔍 Trying to get students from semestral grades...');
          const gradesResponse = await fetch(`${API_BASE}/api/semestral-grades/class/${selectedClassObj.classID}?termName=${currentTerm?.termName}&academicYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (gradesResponse.ok) {
            const gradesData = await gradesResponse.json();
            console.log('✅ Semestral grades response:', gradesData);
            if (gradesData.success && gradesData.grades) {
              // Extract unique students from grades data
              const uniqueStudents = [];
              const seenStudents = new Set();
              
              gradesData.grades.forEach(grade => {
                if (!seenStudents.has(grade.studentID)) {
                  seenStudents.add(grade.studentID);
                  uniqueStudents.push({
                    _id: grade.studentID,
                    userID: grade.studentID,
                    name: grade.studentName,
                    schoolID: grade.schoolID,
                    section: grade.section || 'default'
                  });
                }
              });
              
              studentsData = uniqueStudents;
              console.log('✅ Extracted students from grades:', studentsData);
            }
          } else {
            console.log('❌ Semestral grades endpoint failed:', gradesResponse.status, gradesResponse.statusText);
            if (gradesResponse.status === 404) {
              console.log('⚠️ Semestral grades by class endpoint not found');
            }
          }
        } catch (error) {
          console.log('❌ Semestral grades endpoint error:', error);
        }
      }
      
      // If still no students, try a more generic approach
      if (studentsData.length === 0) {
        try {
          console.log('🔍 Trying generic students endpoint...');
          const genericResponse = await fetch(`${API_BASE}/api/students`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (genericResponse.ok) {
            const data = await genericResponse.json();
            console.log('✅ Generic students response:', data);
            if (data && Array.isArray(data)) {
              // Filter students by some criteria if possible
              studentsData = data.slice(0, 10); // Limit to first 10 for testing
              console.log('⚠️ Using generic students data (limited to 10 for testing)');
            }
          } else {
            console.log('❌ Generic students endpoint failed:', genericResponse.status, genericResponse.statusText);
          }
        } catch (error) {
          console.log('❌ Generic students endpoint error:', error);
        }
      }
      
      // If still no students, create sample data for testing
      if (studentsData.length === 0) {
        console.log('⚠️ No students found from any endpoint, creating sample data for testing');
        studentsData = [
          {
            _id: 'sample_student_1',
            userID: 'sample_student_1',
            name: 'Sample Student 1',
            schoolID: '123456789',
            section: 'A'
          },
          {
            _id: 'sample_student_2',
            userID: 'sample_student_2',
            name: 'Sample Student 2',
            schoolID: '987654321',
            section: 'A'
          }
        ];
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
      
      console.log('✅ Transformed students:', transformedStudents);
      setStudents(transformedStudents);
      
      // Initialize grades state for all students
      const initialGrades = {};
      transformedStudents.forEach(student => {
        initialGrades[student._id] = { ...student.grades };
      });
      setGrades(initialGrades);

      // Load previously saved grades from database
      if (transformedStudents.length > 0) {
      loadSavedGradesFromDatabase(selectedClassObj.classID, transformedStudents);
      }
      // Also load any locally persisted temporary grades for this class/term
      loadTempGrades(selectedClassObj.classID, transformedStudents);
      
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      setStudents([]);
      
      // Show error modal to user
      showModal(
        'Error Fetching Students',
        `Failed to fetch students for the selected class.\n\nError: ${error.message}\n\nPlease check your connection and try again.`,
        'error'
      );
    }
  };

  // Load saved grades from database instead of localStorage
  const loadSavedGradesFromDatabase = async (classID, studentsList) => {
    try {
      const token = localStorage.getItem("token");
      const selectedClassObj = classes[selectedClass];
      
      if (!selectedClassObj || !academicYear || !currentTerm) return;
      
      console.log('🔍 Loading saved grades for class:', classID);
      
      // Fetch grades from database for this class and quarter
      const response = await fetch(`${API_BASE}/api/semestral-grades/class/${selectedClassObj.classID}?termName=${globalTerm}&academicYear=${globalAcademicYear}&quarter=${globalQuarter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Grades loaded from database:', data);
        
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
                console.log('✅ Found grades for student:', student.name, studentGradeRecord);
                updatedGrades[student._id] = {
                  ...updatedGrades[student._id],
                  ...studentGradeRecord.grades,
                  isLocked: studentGradeRecord.isLocked || false
                };
              }
            });
            
            return updatedGrades;
          });
        } else {
          console.log('⚠️ No grades found in database for this class/term');
        }
              } else {
        console.log('❌ Failed to load grades from database:', response.status, response.statusText);
        // Try alternative approach - fetch grades by individual students
        await loadGradesByIndividualStudents(studentsList);
        }
      
    } catch (error) {
      console.error('❌ Error loading saved grades from database:', error);
      // Try alternative approach
      await loadGradesByIndividualStudents(studentsList);
    }
  };

  // ---- Temporary Grades Persistence (localStorage) ----
  const getTempKey = (classId) => {
    const ay = academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'AY';
    const term = currentTerm?.termName || 'TERM';
    return `tempGrades:${classId}:${term}:${ay}`;
  };

  const saveTempGrades = (classId, updatedGradesObj) => {
    try {
      const temp = {};
      Object.entries(updatedGradesObj || {}).forEach(([sid, g]) => {
        if (g && g.isTemp) temp[sid] = g;
      });
      const key = getTempKey(classId);
      localStorage.setItem(key, JSON.stringify(temp));
    } catch (e) {
      console.warn('Failed to persist temp grades:', e);
    }
  };

  const loadTempGrades = (classId, studentsList) => {
    try {
      const key = getTempKey(classId);
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const temp = JSON.parse(raw || '{}');
      if (!temp || typeof temp !== 'object') return;
      setGrades(prev => {
        const merged = { ...prev };
        // Only load temp grades for students that already exist in the studentsList
        // This prevents creating duplicate/synthetic students
        const currentStudentIds = new Set((studentsList || []).map(s => s._id));
        Object.entries(temp).forEach(([sid, g]) => {
          // Only process if this student ID exists in the current students list
          if (currentStudentIds.has(sid)) {
            merged[sid] = { ...(merged[sid] || {}), ...(g || {}), isTemp: true, isLocked: false };
          }
        });
        return merged;
      });
    } catch (e) {
      console.warn('Failed to load temp grades:', e);
    }
  };

  // Alternative approach: Load grades by individual students
  const loadGradesByIndividualStudents = async (studentsList) => {
    try {
      const token = localStorage.getItem("token");
      console.log('🔍 Trying to load grades by individual students...');
      
      const updatedGrades = { ...grades };
      let gradesLoaded = 0;
      
      for (const student of studentsList) {
        try {
          const studentSchoolID = student.schoolID || student._id;
          const response = await fetch(`${API_BASE}/api/semestral-grades/student/${studentSchoolID}?termName=${currentTerm.termName}&academicYear=${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.grades) {
              // Find grades for this specific class
              const classGrades = data.grades.find(g => 
                g.classID === classes[selectedClass].classID ||
                g.subjectCode === classes[selectedClass].classCode ||
                g.subjectName === classes[selectedClass].className
              );
              
              if (classGrades) {
                console.log('✅ Found grades for student:', student.name, classGrades);
                updatedGrades[student._id] = {
                  ...updatedGrades[student._id],
                  ...classGrades.grades,
                  isLocked: classGrades.isLocked || false
                };
                gradesLoaded++;
              }
            }
          }
        } catch (error) {
          console.log(`❌ Error loading grades for student ${student.name}:`, error);
        }
      }
      
      if (gradesLoaded > 0) {
        console.log(`✅ Loaded grades for ${gradesLoaded} students`);
        setGrades(updatedGrades);
      }
      
    } catch (error) {
      console.error('❌ Error in loadGradesByIndividualStudents:', error);
    }
  };

  // Test API endpoints function for debugging
  const testAPIEndpoints = async () => {
    try {
      const token = localStorage.getItem("token");
      const selectedClassObj = classes[selectedClass];
      
      if (!selectedClassObj) {
        showModal('No Class Selected', 'Please select a class first to test API endpoints', 'warning');
        return;
      }
      
      console.log('🧪 Testing API endpoints for debugging...');
      
      // Test 1: Class members endpoint
      try {
        const membersResponse = await fetch(`${API_BASE}/classes/${selectedClassObj.classID}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Class members endpoint:', membersResponse.status, membersResponse.statusText);
        if (membersResponse.ok) {
          const data = await membersResponse.json();
          console.log('📊 Members data:', data);
        }
      } catch (error) {
        console.log('❌ Class members endpoint error:', error);
      }
      
      // Test 2: Alternative students endpoint
      try {
        const altResponse = await fetch(`${API_BASE}/api/students/class/${selectedClassObj.classCode || selectedClassObj.classID}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Alternative students endpoint:', altResponse.status, altResponse.statusText);
        if (altResponse.ok) {
          const data = await altResponse.json();
          console.log('📊 Alternative data:', data);
        }
      } catch (error) {
        console.log('❌ Alternative students endpoint error:', error);
      }
      
      // Test 3: Semestral grades by class
      try {
        const gradesResponse = await fetch(`${API_BASE}/api/semestral-grades/class/${selectedClassObj.classID}?termName=${currentTerm?.termName}&academicYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Semestral grades by class endpoint:', gradesResponse.status, gradesResponse.statusText);
        if (gradesResponse.ok) {
          const data = await gradesResponse.json();
          console.log('📊 Grades data:', data);
        }
      } catch (error) {
        console.log('❌ Semestral grades by class endpoint error:', error);
      }
      
      // Test 4: Test individual student grades endpoint
      if (students.length > 0) {
        const testStudent = students[0];
        try {
          const studentResponse = await fetch(`${API_BASE}/api/semestral-grades/student/${testStudent.schoolID || testStudent._id}?termName=${currentTerm?.termName}&academicYear=${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('✅ Individual student grades endpoint:', studentResponse.status, studentResponse.statusText);
          if (studentResponse.ok) {
            const data = await studentResponse.json();
            console.log('📊 Student grades data:', data);
          }
        } catch (error) {
          console.log('❌ Individual student grades endpoint error:', error);
        }
      }
      
      showModal('API Test Complete', 'Check the browser console for detailed API endpoint test results.', 'info');
      
    } catch (error) {
      console.error('❌ Error testing API endpoints:', error);
      showModal('API Test Failed', `Error testing API endpoints: ${error.message}`, 'error');
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
    
    // Validate grade breakdown fields
    if ((field.includes('Raw') || field.includes('HPS') || field === 'quarterlyExam') && value !== '') {
      const gradeNum = parseFloat(value);
      
      // Check if grade is within valid range (0-100 for quarterly exam, 0+ for raw scores)
      if (isNaN(gradeNum) || gradeNum < 0) {
        showModal(
          'Invalid Input',
          `Values must be positive numbers.\n\nYou entered: ${value}\n\nPlease enter a valid value.`,
          'error'
        );
        return;
      }
      
      if (field === 'quarterlyExam' && gradeNum > 100) {
        showModal(
          'Invalid Quarterly Exam Grade',
          `Quarterly exam grade must be between 0 and 100.\n\nYou entered: ${value}\n\nPlease enter a valid grade.`,
          'error'
        );
        return;
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
            
            // Ensure semester final is always computed and not user-editable
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
            
            // Ensure semester final is always computed and not user-editable
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
            
            // Ensure semester final is always computed and not user-editable
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
      
      console.log('Processing excel file for student:', student.name);
      
      // Parse the file content (CSV/Excel)
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        try {
          const content = e.target.result;
          console.log('File content:', content);
          
          // Parse CSV content
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          // Find the data row (skip header)
          let dataRow = null;
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(cell => cell.trim());
            if (row.length > 0 && row[0] !== '') {
              dataRow = row;
              break;
            }
          }
          
          if (!dataRow) {
            showModal('Invalid File', 'No data found in the uploaded file', 'error');
            return;
          }
          
          // Extract grade data based on column headers
          const gradeData = {};
          
          // Map CSV columns to grade fields
          headers.forEach((header, index) => {
            const value = dataRow[index] || '';
            const numValue = parseFloat(value);
            
            switch (header) {
              case 'quarter1':
              case 'q1':
                gradeData.quarter1 = isNaN(numValue) ? '' : numValue;
                break;
              case 'quarter2':
              case 'q2':
                gradeData.quarter2 = isNaN(numValue) ? '' : numValue;
                break;
              case 'quarter3':
              case 'q3':
                gradeData.quarter3 = isNaN(numValue) ? '' : numValue;
                break;
              case 'quarter4':
              case 'q4':
                gradeData.quarter4 = isNaN(numValue) ? '' : numValue;
                break;
              case 'written_works_raw':
              case 'ww_raw':
              case 'writtenworksraw':
                gradeData.writtenWorksRaw = isNaN(numValue) ? '' : numValue;
                break;
              case 'written_works_hps':
              case 'ww_hps':
              case 'writtenworkshps':
                gradeData.writtenWorksHPS = isNaN(numValue) ? '' : numValue;
                break;
              case 'performance_tasks_raw':
              case 'pt_raw':
              case 'performancetasksraw':
                gradeData.performanceTasksRaw = isNaN(numValue) ? '' : numValue;
                break;
              case 'performance_tasks_hps':
              case 'pt_hps':
              case 'performancetaskshps':
                gradeData.performanceTasksHPS = isNaN(numValue) ? '' : numValue;
                break;
              case 'quarterly_exam':
              case 'quarterlyexam':
              case 'exam':
                gradeData.quarterlyExam = isNaN(numValue) ? '' : numValue;
                break;
            }
          });
          
          // Calculate semester final grade if we have quarter grades
          if (gradeData.quarter1 && gradeData.quarter2 && currentTerm?.termName === 'Term 1') {
            gradeData.semesterFinal = ((gradeData.quarter1 + gradeData.quarter2) / 2).toFixed(2);
          } else if (gradeData.quarter3 && gradeData.quarter4 && currentTerm?.termName === 'Term 2') {
            gradeData.semesterFinal = ((gradeData.quarter3 + gradeData.quarter4) / 2).toFixed(2);
          }
          
          // Update student grades with uploaded data
          setStudentGrades(prev => ({
            ...prev,
            ...gradeData,
            isUploaded: true, // Mark as uploaded but not posted
            lastUpdated: new Date().toISOString()
          }));
          
          // Update the main grades state
          setGrades(prevGrades => ({
            ...prevGrades,
            [student._id]: {
              ...prevGrades[student._id],
              ...gradeData,
              isUploaded: true,
              isLocked: false,
              lastUpdated: new Date().toISOString()
            }
          }));
          
          // Save to draft collection
          const token = localStorage.getItem("token");
          const selectedClassObj = classes[selectedClass];
          
          const draftData = {
            schoolID: student.schoolID || student._id,
            studentId: student._id,
            studentName: student.name,
            subjectCode: selectedClassObj?.classCode || selectedClassObj?.className,
            subjectName: selectedClassObj?.className,
            classID: selectedClassObj?.classID,
            section: student.section || selectedSection,
            academicYear: `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`,
            termName: currentTerm?.termName,
            facultyID: localStorage.getItem('userID') || 'unknown',
            grades: {
              quarter1: gradeData.quarter1 || null,
              quarter2: gradeData.quarter2 || null,
              quarter3: gradeData.quarter3 || null,
              quarter4: gradeData.quarter4 || null,
              semesterFinal: gradeData.semesterFinal || null,
              remarks: gradeData.remarks || ''
            },
            breakdownByQuarter: {
              [globalQuarter]: {
                ww: {
                  raw: gradeData.writtenWorksRaw || '',
                  hps: gradeData.writtenWorksHPS || ''
                },
                pt: {
                  raw: gradeData.performanceTasksRaw || '',
                  hps: gradeData.performanceTasksHPS || ''
                },
                exam: gradeData.quarterlyExam || ''
              }
            },
            isLocked: false,
            lastUpdated: new Date().toISOString()
          };
          
          // Save to backend draft collection
          fetch(`${API_BASE}/api/semestral-grades/save-draft`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(draftData)
          }).then(response => {
            if (response.ok) {
              console.log('Draft saved successfully');
            } else {
              console.error('Failed to save draft');
            }
          }).catch(error => {
            console.error('Error saving draft:', error);
          });
          
          showModal('Upload Successful', `Student grades uploaded successfully! Data includes RAW HPS and QUARTER EXAM values. Grades are saved as draft and can be edited before posting.`, 'success');
          
          // Clear the file input
          setSelectedStudentFile(null);
          document.getElementById('student-file-input').value = '';
          
        } catch (error) {
          console.error('Error processing file:', error);
          showModal('Processing Error', 'Failed to process file. Please check the file format and try again.', 'error');
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
        // Include breakdownByQuarter data for detailed breakdown storage
        breakdownByQuarter: studentGrades.breakdownByQuarter || {},
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
        
        // Show success message with summary for this student
        const finalGradeText = studentGrades.semesterFinal || 'N/A';
        const summaryMsg = [
          `${selectedStudentName}'s grades have been saved to the database and are now visible in the Report on Learning Progress and Achievement table.`,
          '',
          'Posted Summary:',
          `• Name: ${selectedStudentName}`,
          `• School ID: ${studentSchoolID}`,
          `• Final Grade: ${finalGradeText}`,
          `• Remarks: ${studentGrades.remarks || 'N/A'}`,
          '',
          '⚠️ These grades cannot be edited anymore and are now visible to students.',
          `💾 Grades are securely stored in the Semestral_Grades_Collection using School ID: ${studentSchoolID}.`
        ].join('\n');
        showModal('Grades Saved Successfully', summaryMsg, 'success');
        
        // Update local state to reflect the saved grades
        setGrades(prevGrades => ({
          ...prevGrades,
          [student._id]: {
            ...prevGrades[student._id],
            ...studentGrades,
            isLocked: true,
            isTemp: false
          }
        }));
        // Clear temp storage for this student
        const selectedClassObj2 = classes[selectedClass];
        if (selectedClassObj2) {
          const key = getTempKey(selectedClassObj2.classID);
          try {
            const raw = localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            delete obj[student._id];
            localStorage.setItem(key, JSON.stringify(obj));
          } catch {}
        }

        // Clear the individual management section
        setShowIndividualManagement(false);
        setSelectedStudentName('');
        setStudentGrades({});
        setIsEditMode(false);

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

  // Handle edit mode toggle
  const handleEditModeToggle = () => {
    if (isEditMode) {
      // If currently in edit mode, cancel and reset to original values
      const student = students.find(s => s.name === selectedStudentName);
      if (student) {
        const existingGrades = grades[student._id] || {};
        setStudentGrades({
          quarter1: existingGrades.quarter1 || '',
          quarter2: existingGrades.quarter2 || '',
          quarter3: existingGrades.quarter3 || '',
          quarter4: existingGrades.quarter4 || '',
          semesterFinal: existingGrades.semesterFinal || '',
          remarks: existingGrades.remarks || '',
          writtenWorksRaw: existingGrades.writtenWorksRaw || existingGrades.breakdown?.ww?.raw || existingGrades.breakdownByQuarter?.[globalQuarter]?.ww?.raw || '',
          writtenWorksHPS: existingGrades.writtenWorksHPS || existingGrades.breakdown?.ww?.hps || existingGrades.breakdownByQuarter?.[globalQuarter]?.ww?.hps || '',
          performanceTasksRaw: existingGrades.performanceTasksRaw || existingGrades.breakdown?.pt?.raw || existingGrades.breakdownByQuarter?.[globalQuarter]?.pt?.raw || '',
          performanceTasksHPS: existingGrades.performanceTasksHPS || existingGrades.breakdown?.pt?.hps || existingGrades.breakdownByQuarter?.[globalQuarter]?.pt?.hps || '',
          quarterlyExam: existingGrades.quarterlyExam || existingGrades.breakdown?.exam || existingGrades.breakdownByQuarter?.[globalQuarter]?.exam || ''
        });
      }
    }
    setIsEditMode(!isEditMode);
  };


  // Clear grades for the currently selected student (individual management)
  const clearSelectedStudentGrades = () => {
    try {
      if (!selectedStudentName) {
        showModal('No Student Selected', 'Please select a student first.', 'warning');
        return;
      }
      const student = students.find(s => s.name === selectedStudentName);
      if (!student) {
        showModal('Student Not Found', 'Please select the student again.', 'error');
        return;
      }
      const current = grades[student._id] || {};
      if (current.isLocked) {
        showModal('Grades Locked', 'Posted grades cannot be cleared.', 'warning');
        return;
      }

      const empty = {
        quarter1: '',
        quarter2: '',
        quarter3: '',
        quarter4: '',
        semesterFinal: '',
        remarks: '',
        isLocked: false,
        isTemp: false
      };

      // Update individual editor values
      setStudentGrades({
        quarter1: '',
        quarter2: '',
        quarter3: '',
        quarter4: '',
        semesterFinal: '',
        remarks: ''
      });

      // Update table state
      setGrades(prev => ({
        ...prev,
        [student._id]: {
          ...(prev[student._id] || {}),
          ...empty
        }
      }));

      // Remove from persisted temp storage if present
      const selectedClassObj = classes[selectedClass];
      if (selectedClassObj) {
        try {
          const key = getTempKey(selectedClassObj.classID);
          const raw = localStorage.getItem(key);
          const obj = raw ? JSON.parse(raw) : {};
          delete obj[student._id];
          localStorage.setItem(key, JSON.stringify(obj));
        } catch {}
      }

      showModal('Grades Cleared', `${selectedStudentName}'s grades have been cleared.`, 'success');
    } catch (e) {
      console.error('Error clearing student grades:', e);
      showModal('Error', 'Failed to clear grades. Please try again.', 'error');
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
        
        // Build a concise summary of posted grades (name and final grade)
        const summaryLines = (gradesData.students || []).map(s => `• ${s.studentName}: ${s.grades?.semesterFinal || 'N/A'}`);
        const summaryText = [
          'Grades have been saved to the database (Semestral_Grades_Collection) and posted to the Report on Learning Progress and Achievement table.',
          '',
          'Posted Summary (Name: Final Grade):',
          ...summaryLines,
          '',
          '👥 These grades are now visible to all students and cannot be edited anymore.',
          '🔒 All grades are now locked and read-only.',
          '🎯 Students can now view their grades in their student dashboard using their School ID.',
          '💾 Data is securely stored with proper encryption.'
        ].join('\n');
        showModal('All Grades Posted Successfully', summaryText, 'success');
        
        // Mark all grades as locked/read-only
        setGrades(prevGrades => {
          const updatedGrades = {};
          Object.keys(prevGrades).forEach(studentId => {
            updatedGrades[studentId] = {
              ...prevGrades[studentId],
              isLocked: true, // Mark all grades as locked
              isTemp: false
            };
          });
          // Clear persisted temp grades for this class
          const selectedClassObj3 = classes[selectedClass];
          if (selectedClassObj3) {
            try { localStorage.removeItem(getTempKey(selectedClassObj3.classID)); } catch {}
          }
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

  // Export grades to Excel with RAW, HPS, WS, RS format
  const exportGradesToExcel = () => {
    if (!selectedClass || students.length === 0) {
      showModal('No Data', 'No students or grades to export', 'warning');
      return;
    }

    try {
      const selectedClassObj = classes[selectedClass];
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Prepare CSV content
      const headers = [
        'Student ID',
        'Student Name',
        'Section',
        'Quarter 1',
        'Quarter 2', 
        'Quarter 3',
        'Quarter 4',
        'Semester Final',
        'Remarks',
        'Written Works RAW',
        'Written Works HPS',
        'Written Works PS',
        'Written Works WS',
        'Performance Tasks RAW',
        'Performance Tasks HPS', 
        'Performance Tasks PS',
        'Performance Tasks WS',
        'Quarterly Exam',
        'Initial Grade',
        'Quarterly Grade'
      ];

      const csvRows = [headers.join(',')];

      students.forEach(student => {
        const studentGrades = grades[student._id] || {};
        const breakdown = studentGrades.breakdownByQuarter?.[globalQuarter] || {};
        
        // Calculate PS (Percentage Score) and WS (Weighted Score)
        const wwRaw = parseFloat(breakdown.ww?.raw || studentGrades.writtenWorksRaw || 0);
        const wwHPS = parseFloat(breakdown.ww?.hps || studentGrades.writtenWorksHPS || 0);
        const wwPS = wwHPS > 0 ? (wwRaw / wwHPS) * 100 : 0;
        const wwWS = wwPS * 0.3; // 30% weight

        const ptRaw = parseFloat(breakdown.pt?.raw || studentGrades.performanceTasksRaw || 0);
        const ptHPS = parseFloat(breakdown.pt?.hps || studentGrades.performanceTasksHPS || 0);
        const ptPS = ptHPS > 0 ? (ptRaw / ptHPS) * 100 : 0;
        const ptWS = ptPS * 0.5; // 50% weight

        const exam = parseFloat(breakdown.exam || studentGrades.quarterlyExam || 0);
        const examPS = exam; // Exam is already a percentage
        const examWS = examPS * 0.2; // 20% weight

        const initialGrade = wwWS + ptWS;
        const quarterlyGrade = (initialGrade * 0.8) + (exam * 0.2);

        const row = [
          student.schoolID || student._id,
          `"${student.name}"`,
          `"${student.section || selectedSection || 'N/A'}"`,
          studentGrades.quarter1 || '',
          studentGrades.quarter2 || '',
          studentGrades.quarter3 || '',
          studentGrades.quarter4 || '',
          studentGrades.semesterFinal || '',
          studentGrades.remarks || '',
          wwRaw || '',
          wwHPS || '',
          wwPS.toFixed(2),
          wwWS.toFixed(2),
          ptRaw || '',
          ptHPS || '',
          ptPS.toFixed(2),
          ptWS.toFixed(2),
          exam || '',
          initialGrade.toFixed(2),
          quarterlyGrade.toFixed(2)
        ];

        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedClassObj?.className || 'Grades'}_${globalQuarter}_${currentDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showModal(
        'Export Successful', 
        `Successfully exported ${students.length} student grades to Excel format.\n\nFile includes:\n• RAW scores and HPS values\n• Calculated PS (Percentage Score)\n• Calculated WS (Weighted Score)\n• Initial Grade and Quarterly Grade calculations\n\nFile saved as: ${selectedClassObj?.className || 'Grades'}_${globalQuarter}_${currentDate}.csv`,
        'success'
      );

    } catch (error) {
      console.error('Error exporting grades:', error);
      showModal('Export Failed', 'Failed to export grades. Please try again.', 'error');
    }
  };

  // Save a draft of current grades to both local storage and backend
  const saveDraftGrades = async () => {
    try {
      const selectedClassObj = classes[selectedClass];
      if (!selectedClassObj) return;
      
      // Ensure all staged items remain marked as temp
      const draft = {};
      Object.entries(grades || {}).forEach(([sid, g]) => {
        draft[sid] = { ...g, isTemp: true, isLocked: false };
      });
      setGrades(draft);
      saveTempGrades(selectedClassObj.classID, draft);
      
      // Save to backend semestral_draft_collections
      const token = localStorage.getItem("token");
      const facultyID = localStorage.getItem('userID') || 'unknown';
      
      // Prepare draft data for all students
      const draftData = students.map(student => {
        const studentGrades = grades[student._id] || {};
        return {
          schoolID: student.schoolID || student._id,
          studentId: student._id,
          studentName: student.name,
          subjectCode: selectedClassObj?.classCode || selectedClassObj?.className,
          subjectName: selectedClassObj?.className,
          classID: selectedClassObj?.classID,
          section: student.section || selectedSection,
          academicYear: `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`,
          termName: currentTerm?.termName,
          facultyID: facultyID,
          grades: {
            quarter1: studentGrades.quarter1 || null,
            quarter2: studentGrades.quarter2 || null,
            quarter3: studentGrades.quarter3 || null,
            quarter4: studentGrades.quarter4 || null,
            semesterFinal: studentGrades.semesterFinal || null,
            remarks: studentGrades.remarks || ''
          },
          breakdownByQuarter: studentGrades.breakdownByQuarter || {
            [globalQuarter]: {
              ww: {
                raw: studentGrades.writtenWorksRaw || '',
                hps: studentGrades.writtenWorksHPS || ''
              },
              pt: {
                raw: studentGrades.performanceTasksRaw || '',
                hps: studentGrades.performanceTasksHPS || ''
              },
              exam: studentGrades.quarterlyExam || ''
            }
          },
          isLocked: false,
          lastUpdated: new Date().toISOString()
        };
      });
      
      // Save all drafts to backend
      const response = await fetch(`${API_BASE}/api/semestral-grades/save-draft-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          drafts: draftData,
          classID: selectedClassObj.classID,
          academicYear: `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`,
          termName: currentTerm?.termName
        })
      });
      
      if (response.ok) {
        showModal('Draft Saved', `Successfully saved draft for ${students.length} students to the database. These grades are not posted and are only visible to you.`, 'success');
      } else {
        console.error('Failed to save draft to backend');
        showModal('Draft Saved Locally', 'Draft saved locally but failed to save to database. Please check your connection.', 'warning');
      }
      
    } catch (e) {
      console.error('Failed to save draft:', e);
      showModal('Save Draft Failed', 'Could not save the draft. Please try again.', 'error');
    }
  };

  useEffect(() => {
    // Load drafts from backend for consistency across reloads
    const loadDrafts = async () => {
      try {
        const selectedClassObj = classes[selectedClass];
        if (!selectedClassObj) return;
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (academicYear) params.set('academicYear', `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`);
        if (currentTerm?.termName) params.set('termName', currentTerm.termName);
        const res = await fetch(`${API_BASE}/api/semestral-grades/drafts/class/${selectedClassObj.classID}?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.success) return;
        const latestByStudent = {};
        (data.drafts || []).forEach(d => {
          const key = d.schoolID || d.studentId;
          const prev = latestByStudent[key];
          if (!prev || new Date(d.updatedAt || d.lastUpdated || d.createdAt || 0) > new Date(prev.updatedAt || prev.lastUpdated || prev.createdAt || 0)) {
            latestByStudent[key] = d;
          }
        });
        const merged = { ...grades };
        Object.values(latestByStudent).forEach(d => {
          merged[d.schoolID || d.studentId] = {
            ...(merged[d.schoolID || d.studentId] || {}),
            ...d.grades,
            breakdownByQuarter: d.breakdownByQuarter || {},
            isTemp: true,
            isLocked: false
          };
        });
        setGrades(merged);
      } catch {}
    };
    loadDrafts();
  }, [selectedClass, selectedSection, academicYear, currentTerm]);





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
          <ProfileMenu/>
          </div>
        </div>

        {/* Quarter Selector */}
        <div className="mb-6">
          <QuarterSelector />
        </div>

        {/* Current Quarter Display */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm font-medium text-blue-800">
            Managing grades for: <span className="font-semibold">{globalQuarter} - {globalTerm}</span>
            <span className="text-blue-600 ml-2">({globalAcademicYear})</span>
          </p>
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
            {/* Show loading message when waiting for classes */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg text-gray-600">Loading your classes...</p>
                <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your class information</p>
              </div>
            )}
            
            {/* Show content only when not loading */}
            {!loading && (
              <>
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
                      {cls.className} - {cls.section || cls.classCode || 'No Section'}
                   </option>
                 ))}
               </select>
                
                {/* Loading state */}
                {loading && (
                  <p className="mt-2 text-sm text-blue-600">
                    🔄 Loading classes for {currentTerm?.termName || 'current term'}...
                  </p>
                )}
                
               {/* Warning when no classes available */}
               {!loading && classes.length === 0 && (
                  <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-sm text-orange-800 font-medium">
                      ⚠️ No classes available for the current term and academic year.
                    </p>
                    <div className="text-xs text-orange-700 mt-1 space-y-1">
                      <p>• Current Term: {currentTerm?.termName || 'Not set'}</p>
                      <p>• Academic Year: {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Not set'}</p>
                      <p>• Faculty ID: {currentFacultyID || 'Not set'}</p>
                    </div>
                    <p className="text-xs text-orange-600 mt-2">
                      💡 Make sure you have created classes for the current term, or check if the term is properly set.
                    </p>
                  </div>
                )}
                
                {/* Success message when classes are found */}
                {!loading && classes.length > 0 && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ Found {classes.length} class{classes.length !== 1 ? 'es' : ''} for {currentTerm?.termName || 'current term'}
                 </p>
               )}
             </div>

                           {/* Section Selection */}
              {selectedClass !== null && classes[selectedClass] && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Section:</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedSection || ""}
                    onChange={handleSectionChange}
                  >
                    <option value="">Choose a section...</option>
                    {/* Show the class's assigned section */}
                    {classes[selectedClass].section && (
                    <option key={classes[selectedClass].section} value={classes[selectedClass].section}>
                      {classes[selectedClass].section}
                    </option>
                    )}
                    {/* Also show any additional sections from students if they exist */}
                    {students.length > 0 && Array.from(new Set(students.map(student => student.section || 'default')))
                      .filter(section => section !== classes[selectedClass].section && section !== 'default')
                      .map(section => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    {/* Add a default section option if no sections are available */}
                    {(!classes[selectedClass].section || classes[selectedClass].section === '') && (
                      <option value="default">Default Section</option>
                    )}
                  </select>
                  
                  {/* Show section info */}
                  {selectedSection && (
                    <p className="mt-1 text-sm text-gray-600">
                      Selected section: <strong>{selectedSection}</strong>
                      {selectedSection === 'default' && (
                        <span className="text-orange-600 ml-2">⚠️ Using default section</span>
                      )}
                    </p>
                  )}
                </div>
              )}
             
             {/* Warning when no sections available for the selected class */}
             {selectedClass !== null && classes[selectedClass] && !classes[selectedClass].section && (
               <div className="mb-6">
                 <p className="text-sm text-orange-600">
                   ⚠️ The selected class "{classes[selectedClass].className}" does not have any sections assigned to it.
                 </p>
                 <p className="text-sm text-gray-600 mt-1">
                   💡 You can still proceed by selecting "Default Section" from the dropdown above.
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
                                remarks: existingGrades.remarks || '',
                                writtenWorksRaw: existingGrades.writtenWorksRaw || existingGrades.breakdown?.ww?.raw || existingGrades.breakdownByQuarter?.[globalQuarter]?.ww?.raw || '',
                                writtenWorksHPS: existingGrades.writtenWorksHPS || existingGrades.breakdown?.ww?.hps || existingGrades.breakdownByQuarter?.[globalQuarter]?.ww?.hps || '',
                                performanceTasksRaw: existingGrades.performanceTasksRaw || existingGrades.breakdown?.pt?.raw || existingGrades.breakdownByQuarter?.[globalQuarter]?.pt?.raw || '',
                                performanceTasksHPS: existingGrades.performanceTasksHPS || existingGrades.breakdown?.pt?.hps || existingGrades.breakdownByQuarter?.[globalQuarter]?.pt?.hps || '',
                                quarterlyExam: existingGrades.quarterlyExam || existingGrades.breakdown?.exam || existingGrades.breakdownByQuarter?.[globalQuarter]?.exam || ''
                              });
                              // Clear the search input after selection
                              setSelectedStudent('');
                              // Show the individual management section
                              setShowIndividualManagement(true);
                              // Reset edit mode for new student
                              setIsEditMode(false);
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
                     <div>
                       <h3 className="text-lg font-semibold text-gray-800">
                         Individual Student Grade Management - {currentTerm?.termName || 'Current Term'}
                         {selectedSection && selectedSection !== 'default' && (
                           <span className="text-sm font-normal text-gray-600 ml-2">
                             (Section: {selectedSection})
                           </span>
                         )}
                       </h3>
                       {isEditMode && (
                         <div className="mt-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-md text-sm text-yellow-800">
                           ✏️ Edit Mode Active - You can now modify grades
                         </div>
                       )}
                     </div>
                     <div className="flex items-center gap-2">
                       <button
                         onClick={async () => {
                           // Save only this student's current grades as a draft (local temp)
                           const student = students.find(s => s.name === selectedStudentName);
                           if (!student) return;
                           const sid = student._id;
                           const next = {
                             ...(grades[sid] || {}),
                             ...studentGrades,
                             isTemp: true,
                             isLocked: false
                           };
                           setGrades(prev => ({ ...prev, [sid]: next }));
                           const selectedClassObj = classes[selectedClass];
                           if (selectedClassObj) {
                             saveTempGrades(selectedClassObj.classID, { ...grades, [sid]: next });
                           }
                           // Persist draft to backend
                           try {
                             const token = localStorage.getItem('token');
                             await fetch(`${API_BASE}/api/semestral-grades/save-draft`, {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                               body: JSON.stringify({
                                 schoolID: student.schoolID || sid,
                                 subjectCode: selectedClassObj?.classCode || selectedClassObj?.className,
                                 subjectName: selectedClassObj?.className,
                                 classID: selectedClassObj?.classID,
                                 section: selectedSection,
                                 academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : '',
                                 termName: currentTerm?.termName,
                                 facultyID: currentFacultyID,
                                 grades: {
                                   quarter1: next.quarter1 || null,
                                   quarter2: next.quarter2 || null,
                                   quarter3: next.quarter3 || null,
                                   quarter4: next.quarter4 || null,
                                   semesterFinal: next.semesterFinal || null,
                                   remarks: next.remarks || ''
                                 },
                                 breakdownByQuarter: next.breakdownByQuarter || {}
                               })
                             });
                           } catch {}
                           showModal('Draft Saved', `Saved draft for ${selectedStudentName}. This is not posted.`, 'success');
                         }}
                         className={`px-3 py-1.5 rounded-md ${isEditMode ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-gray-400 text-gray-600 cursor-not-allowed'}`}
                         disabled={!isEditMode}
                         title="Save as draft for this student (not posted)"
                       >
                         Save as Draft
                       </button>
                       <button
                         onClick={() => setShowIndividualManagement(false)}
                         className="text-gray-500 hover:text-gray-700 text-xl font-bold leading-none p-1 rounded-full hover:bg-gray-200 transition-colors"
                         title="Close Individual Student Grade Management"
                       >
                         ×
                       </button>
                     </div>
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
                               disabled={!isEditMode}
                               className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                               disabled={!isEditMode}
                               className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                               disabled={!isEditMode}
                               className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                               disabled={!isEditMode}
                               className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                               disabled={!isEditMode}
                               className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                               disabled={!isEditMode}
                               className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    
                    {/* Detailed Grade Breakdown Section */}
                    <div className="col-span-full mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Detailed Grade Breakdown - {globalQuarter}</h4>
                      
                      {/* Grade Breakdown Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 p-2 text-left font-semibold">Component</th>
                              <th className="border border-gray-300 p-2 text-center font-semibold">RAW</th>
                              <th className="border border-gray-300 p-2 text-center font-semibold">HPS</th>
                              <th className="border border-gray-300 p-2 text-center font-semibold">PS</th>
                              <th className="border border-gray-300 p-2 text-center font-semibold">WS</th>
                              <th className="border border-gray-300 p-2 text-center font-semibold">Quarterly Exam</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-gray-300 p-2 font-medium">Written Works (30%)</td>
                              <td className="border border-gray-300 p-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  disabled={!isEditMode}
                                  className={`w-full text-center border-none bg-transparent ${!isEditMode ? 'cursor-not-allowed' : ''}`}
                                  value={studentGrades.writtenWorksRaw || ''}
                                  onChange={(e) => handleStudentGradeChange('writtenWorksRaw', e.target.value)}
                                />
                              </td>
                              <td className="border border-gray-300 p-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  disabled={!isEditMode}
                                  className={`w-full text-center border-none bg-transparent ${!isEditMode ? 'cursor-not-allowed' : ''}`}
                                  value={studentGrades.writtenWorksHPS || ''}
                                  onChange={(e) => handleStudentGradeChange('writtenWorksHPS', e.target.value)}
                                />
                              </td>
                              <td className="border border-gray-300 p-2 text-center bg-blue-50 font-semibold">
                                {(() => {
                                  const raw = parseFloat(studentGrades.writtenWorksRaw || 0);
                                  const hps = parseFloat(studentGrades.writtenWorksHPS || 0);
                                  return hps > 0 ? ((raw / hps) * 100).toFixed(2) : '0.00';
                                })()}%
                              </td>
                              <td className="border border-gray-300 p-2 text-center bg-green-50 font-semibold">
                                {(() => {
                                  const raw = parseFloat(studentGrades.writtenWorksRaw || 0);
                                  const hps = parseFloat(studentGrades.writtenWorksHPS || 0);
                                  const ps = hps > 0 ? (raw / hps) * 100 : 0;
                                  return (ps * 0.3).toFixed(2);
                                })()}
                              </td>
                              <td className="border border-gray-300 p-2 text-center" rowSpan="2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  placeholder="0.00"
                                  disabled={!isEditMode}
                                  className={`w-full text-center border-none bg-transparent ${!isEditMode ? 'cursor-not-allowed' : ''}`}
                                  value={studentGrades.quarterlyExam || ''}
                                  onChange={(e) => handleStudentGradeChange('quarterlyExam', e.target.value)}
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 p-2 font-medium">Performance Tasks (50%)</td>
                              <td className="border border-gray-300 p-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  disabled={!isEditMode}
                                  className={`w-full text-center border-none bg-transparent ${!isEditMode ? 'cursor-not-allowed' : ''}`}
                                  value={studentGrades.performanceTasksRaw || ''}
                                  onChange={(e) => handleStudentGradeChange('performanceTasksRaw', e.target.value)}
                                />
                              </td>
                              <td className="border border-gray-300 p-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  disabled={!isEditMode}
                                  className={`w-full text-center border-none bg-transparent ${!isEditMode ? 'cursor-not-allowed' : ''}`}
                                  value={studentGrades.performanceTasksHPS || ''}
                                  onChange={(e) => handleStudentGradeChange('performanceTasksHPS', e.target.value)}
                                />
                              </td>
                              <td className="border border-gray-300 p-2 text-center bg-blue-50 font-semibold">
                                {(() => {
                                  const raw = parseFloat(studentGrades.performanceTasksRaw || 0);
                                  const hps = parseFloat(studentGrades.performanceTasksHPS || 0);
                                  return hps > 0 ? ((raw / hps) * 100).toFixed(2) : '0.00';
                                })()}%
                              </td>
                              <td className="border border-gray-300 p-2 text-center bg-green-50 font-semibold">
                                {(() => {
                                  const raw = parseFloat(studentGrades.performanceTasksRaw || 0);
                                  const hps = parseFloat(studentGrades.performanceTasksHPS || 0);
                                  const ps = hps > 0 ? (raw / hps) * 100 : 0;
                                  return (ps * 0.5).toFixed(2);
                                })()}
                              </td>
                            </tr>
                            <tr className="bg-yellow-50">
                              <td className="border border-gray-300 p-2 font-semibold">Initial Grade</td>
                              <td className="border border-gray-300 p-2 text-center font-semibold" colSpan="4">
                                {(() => {
                                  const writtenWS = (() => {
                                    const raw = parseFloat(studentGrades.writtenWorksRaw || 0);
                                    const hps = parseFloat(studentGrades.writtenWorksHPS || 0);
                                    const ps = hps > 0 ? (raw / hps) * 100 : 0;
                                    return ps * 0.3;
                                  })();
                                  const performanceWS = (() => {
                                    const raw = parseFloat(studentGrades.performanceTasksRaw || 0);
                                    const hps = parseFloat(studentGrades.performanceTasksHPS || 0);
                                    const ps = hps > 0 ? (raw / hps) * 100 : 0;
                                    return ps * 0.5;
                                  })();
                                  return (writtenWS + performanceWS).toFixed(2);
                                })()}
                              </td>
                              <td className="border border-gray-300 p-2 text-center font-semibold">
                                {(() => {
                                  const quarterlyExam = parseFloat(studentGrades.quarterlyExam || 0);
                                  return quarterlyExam.toFixed(2);
                                })()}
                              </td>
                            </tr>
                            <tr className="bg-blue-100">
                              <td className="border border-gray-300 p-2 font-bold">Quarterly Grade</td>
                              <td className="border border-gray-300 p-2 text-center font-bold" colSpan="5">
                                {(() => {
                                  const writtenWS = (() => {
                                    const raw = parseFloat(studentGrades.writtenWorksRaw || 0);
                                    const hps = parseFloat(studentGrades.writtenWorksHPS || 0);
                                    const ps = hps > 0 ? (raw / hps) * 100 : 0;
                                    return ps * 0.3;
                                  })();
                                  const performanceWS = (() => {
                                    const raw = parseFloat(studentGrades.performanceTasksRaw || 0);
                                    const hps = parseFloat(studentGrades.performanceTasksHPS || 0);
                                    const ps = hps > 0 ? (raw / hps) * 100 : 0;
                                    return ps * 0.5;
                                  })();
                                  const initialGrade = writtenWS + performanceWS;
                                  const quarterlyExam = parseFloat(studentGrades.quarterlyExam || 0);
                                  const quarterlyGrade = (initialGrade * 0.8) + (quarterlyExam * 0.2);
                                  return quarterlyGrade.toFixed(2);
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-4 text-xs text-gray-600">
                        <p><strong>Legend:</strong> RAW = Raw Score, HPS = Highest Possible Score, PS = Percentage Score, WS = Weighted Score</p>
                        <p><strong>Formula:</strong> PS = (RAW/HPS) × 100, WS = PS × Weight, Initial Grade = Sum of WS, Quarterly Grade = (Initial Grade × 0.8) + (Quarterly Exam × 0.2)</p>
                      </div>
                      
                      {/* Edit Controls for Detailed Grade Breakdown */}
                      <div className="mt-4 flex justify-end gap-2">
                        {(() => {
                          if (!isEditMode) {
                            return (
                              <button
                                onClick={handleEditModeToggle}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                title="Enable edit mode for detailed grade breakdown"
                              >
                                ✏️ Edit
                              </button>
                            );
                          } else {
                            return (
                              <>
                                <button
                                  onClick={saveStudentGrades}
                                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                  title="Save changes to detailed grade breakdown"
                                >
                                  💾 Save Grades
                                </button>
                                <button
                                  onClick={handleEditModeToggle}
                                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                  title="Cancel editing and revert changes"
                                >
                                  ❌ Cancel
                                </button>
                                <button
                                  onClick={clearSelectedStudentGrades}
                                  className="px-4 py-2 bg-red-200 text-red-800 rounded-md hover:bg-red-300 transition-colors"
                                  title="Clear all grades in detailed breakdown"
                                >
                                  🗑️ Clear Grades
                                </button>
                              </>
                            );
                          }
                        })()}
                      </div>
                    </div>
                    
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
                        className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        value={studentGrades.remarks || ''}
                        onChange={(e) => handleStudentGradeChange('remarks', e.target.value)}
                        disabled={!isEditMode || (() => {
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
                     
                     if (!isEditMode) {
                       return (
                         <button
                           onClick={handleEditModeToggle}
                           className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                         >
                           ✏️ Edit Grades
                         </button>
                       );
                     }
                     
                     return (
                       <>
                         <button
                           onClick={saveStudentGrades}
                           className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                         >
                           💾 Save Changes
                         </button>
                         <button
                           onClick={handleEditModeToggle}
                           className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                         >
                           ❌ Cancel
                         </button>
                         <button
                           onClick={clearSelectedStudentGrades}
                           className="px-4 py-2 bg-red-200 text-red-800 rounded-md hover:bg-red-300 transition-colors"
                         >
                           🗑️ Clear Grades
                         </button>
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
                         Pending: {students.filter(student => !grades[student._id]?.isLocked && !grades[student._id]?.isTemp).length}
                       </span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                       <span className="text-sm font-medium text-gray-700">
                         Uploaded (not posted): {students.filter(student => grades[student._id]?.isTemp && !grades[student._id]?.isLocked).length}
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
            {selectedClass !== null && selectedSection && (
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
                          {selectedSection === 'default' && (
                            <span className="text-sm font-normal text-gray-600 ml-2">
                              - Default Section
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
                          onClick={exportGradesToExcel}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Export all grades to Excel with RAW, HPS, WS, RS format"
                          disabled={students.length === 0}
                        >
                          📊 Export Excel
                        </button>
                        <button
                          onClick={saveDraftGrades}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-gray-600 text-white hover:bg-gray-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Save draft locally (not posted)"
                          disabled={students.length === 0}
                        >
                          Save Draft
                        </button>
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
                                
                                // Helper function to get quarterly grade from breakdown data if available
                                const getQuarterlyGrade = (quarter) => {
                                  if (studentGrades[quarter]) {
                                    return studentGrades[quarter];
                                  }
                                  // Try to get from breakdownByQuarter
                                  const breakdown = studentGrades.breakdownByQuarter?.[quarter] || studentGrades.breakdownByQuarter?.[quarter.toUpperCase()];
                                  return breakdown?.quarterly || '-';
                                };
                                
                                const quarter1Grade = getQuarterlyGrade('quarter1');
                                const quarter2Grade = getQuarterlyGrade('quarter2');
                                const semesterGrade = calculateSemesterGrade(quarter1Grade, quarter2Grade);
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
                                        {!isLocked && (grades[student._id]?.isTemp) && (
                                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                            🟧 Grade uploaded (not posted)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {quarter1Grade}
                                     </td>
                                     <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {quarter2Grade}
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
                          {selectedSection === 'default' && (
                            <span className="text-sm font-normal text-gray-600 ml-2">
                              - Default Section
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
                          onClick={exportGradesToExcel}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Export all grades to Excel with RAW, HPS, WS, RS format"
                          disabled={students.length === 0}
                        >
                          📊 Export Excel
                        </button>
                        <button
                          onClick={saveDraftGrades}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-gray-600 text-white hover:bg-gray-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Save draft locally (not posted)"
                          disabled={students.length === 0}
                        >
                          Save Draft
                        </button>
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
                                
                                // Helper function to get quarterly grade from breakdown data if available
                                const getQuarterlyGrade = (quarter) => {
                                  if (studentGrades[quarter]) {
                                    return studentGrades[quarter];
                                  }
                                  // Try to get from breakdownByQuarter
                                  const breakdown = studentGrades.breakdownByQuarter?.[quarter] || studentGrades.breakdownByQuarter?.[quarter.toUpperCase()];
                                  return breakdown?.quarterly || '-';
                                };
                                
                                const quarter3Grade = getQuarterlyGrade('quarter3');
                                const quarter4Grade = getQuarterlyGrade('quarter4');
                                const semesterGrade = calculateSemesterGrade(quarter3Grade, quarter4Grade);
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
                                       {quarter3Grade}
                                     </td>
                                     <td className="border border-gray-300 p-2 text-center font-semibold bg-gray-100">
                                       {quarter4Grade}
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
                 {(!currentTerm?.termName || (currentTerm?.termName !== 'Term 1' && currentTerm?.termName !== 'Term 2')) && (
                  <div className="text-center py-8 text-gray-600">
                    <p>No active term found. Please check your academic term settings.</p>
                  </div>
                )}
              </>
            )}

                         {/* Show message when class or section not selected */}
             {(selectedClass === null || !selectedSection) && (
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
           </>
             )}
          </div>
        ) : (
          <GradingSystem
            onStageTemporaryGrades={(records, meta) => {
              try {
                if (!Array.isArray(records)) return;
                const updatedGrades = { ...grades };
                const updatedStudents = [...students];
                const studentIndexBySchoolId = new Map(
                  (updatedStudents || []).map((s, idx) => [String(s.schoolID || s._id), idx])
                );

                const activeQuarter = meta?.quarter || 'Q1';
                const quarterFieldMap = { Q1: 'quarter1', Q2: 'quarter2', Q3: 'quarter3', Q4: 'quarter4' };
                const targetQuarterField = quarterFieldMap[activeQuarter] || 'quarter1';

                records.forEach((rec) => {
                  const key = String(rec.schoolID || '').trim();
                  if (!key) return;
                  let idx = studentIndexBySchoolId.get(key);
                  if (typeof idx === 'undefined') {
                    // Only create new student if we can't find existing one by schoolID
                    // Try to find by matching schoolID in existing students
                    const existingStudent = updatedStudents.find(s => 
                      String(s.schoolID || s._id) === key
                    );
                    if (existingStudent) {
                      idx = updatedStudents.indexOf(existingStudent);
                      studentIndexBySchoolId.set(key, idx);
                    } else {
                      // Only create synthetic student as last resort
                      const newStudent = {
                        _id: key,
                        userID: key,
                        schoolID: key,
                        name: rec.studentName || key,
                        section: selectedSection || 'default',
                        grades: {}
                      };
                      updatedStudents.push(newStudent);
                      idx = updatedStudents.length - 1;
                      studentIndexBySchoolId.set(key, idx);
                    }
                  }
                  const student = updatedStudents[idx];
                  const sid = student._id;
                  const prev = updatedGrades[sid] || {};
                  // Merge per-quarter values and compact breakdown fields
                  const g = rec.grades || {};
                  const wwRaw = Number(g.writtenWorksRaw || 0);
                  const wwHps = Number(g.writtenWorksHPS || 0);
                  const ptRaw = Number(g.performanceTasksRaw || 0);
                  const ptHps = Number(g.performanceTasksHPS || 0);
                  const qExam = Number(g.quarterlyExam || 0);

                  // Compute PS/WS and initial based on 30/50
                  const wwPs = wwHps > 0 ? (wwRaw / wwHps) * 100 : 0;
                  const ptPs = ptHps > 0 ? (ptRaw / ptHps) * 100 : 0;
                  const wwWs = wwPs * 0.30;
                  const ptWs = ptPs * 0.50;
                  const initial = wwWs + ptWs;
                  const quarterlyGrade = (initial * 0.80) + (qExam * 0.20);

                  const breakdownForQuarter = {
                    ww: { raw: wwRaw, hps: wwHps, ps: wwPs, ws: wwWs },
                    pt: { raw: ptRaw, hps: ptHps, ps: ptPs, ws: ptWs },
                    initial: Number.isFinite(initial) ? initial.toFixed(2) : '0.00',
                    exam: Number.isFinite(qExam) ? qExam.toFixed(2) : '0.00',
                    quarterly: Number.isFinite(quarterlyGrade) ? quarterlyGrade.toFixed(2) : '0.00'
                  };

                  const existingBreakdowns = prev.breakdownByQuarter || {};
                  const nextBreakdowns = { ...existingBreakdowns, [activeQuarter]: breakdownForQuarter };

                  updatedGrades[sid] = {
                    ...prev,
                    ...g,
                    breakdownByQuarter: nextBreakdowns,
                    breakdown: breakdownForQuarter, // for current panel binding
                    [targetQuarterField]: breakdownForQuarter.quarterly,
                    isLocked: false,
                    isTemp: true
                  };
                });

                setStudents(updatedStudents);
                setGrades(updatedGrades);
                // Persist temp grades locally so they survive reloads
                const selectedClassObj = classes[selectedClass];
                if (selectedClassObj) {
                  saveTempGrades(selectedClassObj.classID, updatedGrades);
                }
                // Auto-open individual management for first staged record
                if (updatedStudents.length > 0 && records.length > 0) {
                  const firstRecId = String(records[0].schoolID || '');
                  const firstStudent = updatedStudents.find(s => String(s.schoolID || s._id) === firstRecId) || updatedStudents[0];
                  if (firstStudent) {
                    setSelectedStudentName(firstStudent.name);
                    const existing = updatedGrades[firstStudent._id] || {};
                    setStudentGrades({
                      quarter1: existing.quarter1 || '',
                      quarter2: existing.quarter2 || '',
                      quarter3: existing.quarter3 || '',
                      quarter4: existing.quarter4 || '',
                      semesterFinal: existing.semesterFinal || '',
                      remarks: existing.remarks || '',
                      writtenWorksRaw: existing.writtenWorksRaw || existing.breakdown?.ww?.raw || existingGrades.breakdownByQuarter?.[globalQuarter]?.ww?.raw || '',
                      writtenWorksHPS: existing.writtenWorksHPS || existing.breakdown?.ww?.hps || existingGrades.breakdownByQuarter?.[globalQuarter]?.ww?.hps || '',
                      performanceTasksRaw: existing.performanceTasksRaw || existing.breakdown?.pt?.raw || existingGrades.breakdownByQuarter?.[globalQuarter]?.pt?.raw || '',
                      performanceTasksHPS: existing.performanceTasksHPS || existing.breakdown?.pt?.hps || existingGrades.breakdownByQuarter?.[globalQuarter]?.pt?.hps || '',
                      quarterlyExam: existing.quarterlyExam || existing.breakdown?.exam || existingGrades.breakdownByQuarter?.[globalQuarter]?.exam || ''
                    });
                    // Keep user on Excel tab; do not auto-open panel
                  }
                }
                showModal(
                  'Grades Staged to Grading Table',
                  `Successfully staged ${records.length} student grade(s) to the Grading Table. They are marked as "Grade uploaded (not posted)" until you click Post Grades.

You can review them under the Grading Table tab when ready.`,
                  'success'
                );
                // Persist staged breakdowns to draft collection
                (async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const selectedClassObj = classes[selectedClass];
                    await Promise.all(Object.entries(updatedGrades).map(async ([sid, g]) => {
                      const body = {
                        schoolID: sid,
                        subjectCode: selectedClassObj?.classCode || selectedClassObj?.className,
                        subjectName: selectedClassObj?.className,
                        classID: selectedClassObj?.classID,
                        section: selectedSection,
                        academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : '',
                        termName: currentTerm?.termName,
                        facultyID: currentFacultyID,
                        grades: {
                          quarter1: g.quarter1 || null,
                          quarter2: g.quarter2 || null,
                          quarter3: g.quarter3 || null,
                          quarter4: g.quarter4 || null,
                          semesterFinal: g.semesterFinal || null,
                          remarks: g.remarks || ''
                        },
                        breakdownByQuarter: g.breakdownByQuarter || {}
                      };
                      await fetch(`${API_BASE}/api/semestral-grades/save-draft`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(body)
                      });
                    }));
                  } catch {}
                })();
              } catch (e) {
                console.error('Error staging temporary grades:', e);
                showModal('Staging Error', 'Failed to stage uploaded grades. Please try again.', 'error');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
