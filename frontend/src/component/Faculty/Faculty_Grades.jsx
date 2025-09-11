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
  const [userEditedQuarterlyExam, setUserEditedQuarterlyExam] = useState(() => {
    // Try to restore the flag from localStorage
    try {
      const saved = localStorage.getItem('userEditedQuarterlyExam');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [selectedStudentSchoolID, setSelectedStudentSchoolID] = useState(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  
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

  // Update studentGrades when quarter changes (for individual management)
  useEffect(() => {
    if (selectedStudentName && globalQuarter) {
      const student = students.find(s => s.name === selectedStudentName);
      if (student) {
        const schoolID = student.schoolID;
        const existingGrades = grades[schoolID] || {};
        
        // Get current quarter breakdown data
        const currentQuarterBreakdown = existingGrades.breakdownByQuarter?.[globalQuarter] || {};
        
        // Check if user has edited the quarterly exam
        const hasUserEdited = userEditedQuarterlyExam || localStorage.getItem('userEditedQuarterlyExam') === 'true';
        
        if (hasUserEdited) {
          console.log('🔄 useEffect skipped - user has edited quarterly exam, preserving changes');
          // Restore the saved quarterly exam value
          try {
            const savedValue = localStorage.getItem('quarterlyExamValue');
            if (savedValue !== null) {
              console.log('🔄 Restoring saved quarterly exam value:', savedValue);
              setStudentGrades(prev => ({
                ...prev,
                // Update detailed breakdown data for current quarter
                writtenWorksRaw: currentQuarterBreakdown.ww?.raw || existingGrades.writtenWorksRaw || '',
                writtenWorksHPS: currentQuarterBreakdown.ww?.hps || existingGrades.writtenWorksHPS || '',
                performanceTasksRaw: currentQuarterBreakdown.pt?.raw || existingGrades.performanceTasksRaw || '',
                performanceTasksHPS: currentQuarterBreakdown.pt?.hps || existingGrades.performanceTasksHPS || '',
                // Use saved quarterly exam value
                quarterlyExam: savedValue
              }));
            }
          } catch (e) {
            console.log('Failed to restore quarterly exam value:', e);
          }
        } else {
          console.log('🔄 useEffect running - updating studentGrades from database');
          setStudentGrades(prev => ({
            ...prev,
            // Update detailed breakdown data for current quarter
            writtenWorksRaw: currentQuarterBreakdown.ww?.raw || existingGrades.writtenWorksRaw || '',
            writtenWorksHPS: currentQuarterBreakdown.ww?.hps || existingGrades.writtenWorksHPS || '',
            performanceTasksRaw: currentQuarterBreakdown.pt?.raw || existingGrades.performanceTasksRaw || '',
            performanceTasksHPS: currentQuarterBreakdown.pt?.hps || existingGrades.performanceTasksHPS || '',
            // Only update quarterlyExam if user hasn't edited it (preserve user input)
            quarterlyExam: currentQuarterBreakdown.exam || existingGrades.quarterlyExam || ''
          }));
        }
      }
    }
  }, [globalQuarter, selectedStudentName, students, grades, userEditedQuarterlyExam]);

  // Debug: Monitor studentGrades changes
  useEffect(() => {
    console.log('🔄 studentGrades changed:', studentGrades);
  }, [studentGrades]);

  // Debug: Monitor user edit flag changes
  useEffect(() => {
    console.log('🔄 userEditedQuarterlyExam changed:', userEditedQuarterlyExam);
    if (userEditedQuarterlyExam === false) {
      console.log('⚠️ userEditedQuarterlyExam was reset to false - this may cause value to be overridden');
    }
  }, [userEditedQuarterlyExam]);

  // Debug: Monitor selected student school ID changes
  useEffect(() => {
    console.log('🔄 selectedStudentSchoolID changed:', selectedStudentSchoolID);
  }, [selectedStudentSchoolID]);

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
                console.log('🔍 isLocked from database:', studentGradeRecord.isLocked);
                // Store grades with both student._id and schoolID to ensure UI can find them
                const gradeData = {
                  ...updatedGrades[student._id],
                  ...studentGradeRecord.grades,
                  isLocked: studentGradeRecord.isLocked || false
                };
                updatedGrades[student._id] = gradeData;
                // Also store with schoolID if it's different
                if (student.schoolID && student.schoolID !== student._id) {
                  updatedGrades[student.schoolID] = gradeData;
                }
                console.log('🔍 Final isLocked value:', updatedGrades[student._id].isLocked);
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
      console.log('🔍 loadTempGrades - Key:', key);
      const raw = localStorage.getItem(key);
      console.log('🔍 loadTempGrades - Raw localStorage data:', raw);
      if (!raw) {
        console.log('🔍 loadTempGrades - No temp grades found in localStorage');
        return;
      }
      const temp = JSON.parse(raw || '{}');
      console.log('🔍 loadTempGrades - Parsed temp data:', temp);
      if (!temp || typeof temp !== 'object') return;
      
      setGrades(prev => {
        const merged = { ...prev };
        
        // Create a mapping of all possible student identifiers
        const studentMappings = new Map();
        (studentsList || []).forEach(student => {
          // Map by _id
          studentMappings.set(student._id, student);
          // Map by schoolID if different
          if (student.schoolID && student.schoolID !== student._id) {
            studentMappings.set(student.schoolID, student);
          }
          // Map by userID if different
          if (student.userID && student.userID !== student._id && student.userID !== student.schoolID) {
            studentMappings.set(student.userID, student);
          }
        });
        
        console.log('🔍 loadTempGrades - Student mappings:', Array.from(studentMappings.entries()));
        
        Object.entries(temp).forEach(([sid, g]) => {
          console.log('🔍 loadTempGrades - Processing temp grade for ID:', sid);
          
          // Try to find the student by any of their identifiers
          let student = studentMappings.get(sid);
          
          if (!student) {
            // Try to find by schoolID in the students list
            student = studentsList.find(s => s.schoolID === sid);
          }
          
          if (!student) {
            // Try to find by _id in the students list
            student = studentsList.find(s => s._id === sid);
          }
          
          if (student) {
            console.log('🔍 loadTempGrades - Found student:', student.name, 'for ID:', sid);
            
            // Use the student's schoolID as the key for consistency
            const studentKey = student.schoolID;
            
            // Check if grades are already locked (posted) for this student
            const existingGrades = merged[studentKey] || {};
            const isAlreadyLocked = existingGrades.isLocked;
            
            console.log('🔍 loadTempGrades - Student:', student.name, 'isLocked:', isAlreadyLocked);
            
            if (!isAlreadyLocked) {
              console.log('🔍 Loading temp grades for student:', student.name, 'with key:', studentKey);
              merged[studentKey] = { ...existingGrades, ...(g || {}), isTemp: true, isLocked: false };
            } else {
              console.log('🔍 Skipping temp grades for locked student:', student.name);
            }
          } else {
            console.log('🔍 loadTempGrades - No student found for ID:', sid);
          }
        });
        
        console.log('🔍 Final merged grades after loadTempGrades:', merged);
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
      
      // Safety check for studentsList
      if (!studentsList || !Array.isArray(studentsList)) {
        console.warn('⚠️ studentsList is not a valid array:', studentsList);
        return;
      }
      
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
                updatedGrades[studentSchoolID] = {
                  ...updatedGrades[studentSchoolID],
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
    setUserEditedQuarterlyExam(false);
    setSelectedStudentSchoolID(null);
    try {
      localStorage.removeItem('userEditedQuarterlyExam');
      localStorage.removeItem('quarterlyExamValue');
    } catch (e) {
      console.log('Failed to clear userEditedQuarterlyExam flag:', e);
    }
  };

  const handleSectionChange = (e) => {
    const section = e.target.value;
    setSelectedSection(section);
    setSelectedStudent(null);
    setSelectedStudentName('');
    setStudentGrades({});
    setShowIndividualManagement(false);
    setUserEditedQuarterlyExam(false);
    setSelectedStudentSchoolID(null);
    try {
      localStorage.removeItem('userEditedQuarterlyExam');
      localStorage.removeItem('quarterlyExamValue');
    } catch (e) {
      console.log('Failed to clear userEditedQuarterlyExam flag:', e);
    }
  };



  const handleStudentGradeChange = (field, value) => {
    console.log('🔄 handleStudentGradeChange called:', field, value);
    
    // Allow empty values - don't validate empty strings
    if (value === '' || value === null || value === undefined) {
      console.log('🔄 Empty value detected, allowing it');
      // Don't return early for empty values, let them pass through
    } else if (field.includes('quarter') && value !== '') {
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
    
    // Validate grade breakdown fields (but allow empty values)
    if ((field.includes('Raw') || field.includes('HPS') || field === 'quarterlyExam') && value !== '' && value !== null && value !== undefined) {
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
        // Show warning but allow the value to be entered
        console.log('⚠️ Warning: Quarterly exam grade is greater than 100:', value);
        // Don't return early - let the value be entered but show a warning
      }
      
      // Limit to 2 decimal places
      value = gradeNum.toFixed(2);
    }
    
    // Special handling for quarterly exam - allow empty values
    if (field === 'quarterlyExam' && (value === '' || value === null || value === undefined)) {
      console.log('🔄 Quarterly exam cleared, allowing empty value');
      setUserEditedQuarterlyExam(true); // Mark as user-edited
      // Save the flag and value to localStorage to persist across reloads
      try {
        localStorage.setItem('userEditedQuarterlyExam', 'true');
        localStorage.setItem('quarterlyExamValue', value);
        console.log('🔄 Saved cleared quarterly exam value to localStorage:', value);
      } catch (e) {
        console.log('Failed to save userEditedQuarterlyExam flag:', e);
      }
      // Don't return early, let the empty value pass through
    }
    
    // Mark quarterly exam as user-edited when changed
    if (field === 'quarterlyExam') {
      setUserEditedQuarterlyExam(true);
      // Save the flag and value to localStorage to persist across reloads
      try {
        localStorage.setItem('userEditedQuarterlyExam', 'true');
        localStorage.setItem('quarterlyExamValue', value);
        console.log('🔄 Saved quarterly exam value to localStorage:', value);
      } catch (e) {
        console.log('Failed to save userEditedQuarterlyExam flag:', e);
      }
      console.log('🔄 Quarterly exam marked as user-edited');
    }

    setStudentGrades(prevGrades => {
      console.log('🔄 setStudentGrades called with:', { field, value, prevGrades });
      const updatedGrades = {
        ...prevGrades,
        [field]: value
      };
      console.log('🔄 updatedGrades after setting field:', updatedGrades);
      
      // If quarterly exam is changed, recalculate the quarterly grade
      if (field === 'quarterlyExam') {
        const wwRaw = parseFloat(prevGrades.writtenWorksRaw || 0);
        const wwHps = parseFloat(prevGrades.writtenWorksHPS || 0);
        const ptRaw = parseFloat(prevGrades.performanceTasksRaw || 0);
        const ptHps = parseFloat(prevGrades.performanceTasksHPS || 0);
        const qExam = parseFloat(value || 0);
        
        // Calculate PS and WS
        const wwPs = wwHps > 0 ? (wwRaw / wwHps) * 100 : 0;
        const ptPs = ptHps > 0 ? (ptRaw / ptHps) * 100 : 0;
        const wwWs = wwPs * 0.30;
        const ptWs = ptPs * 0.50;
        const initial = wwWs + ptWs;
        
        // Update the current quarter grade
        const quarterFieldMap = {
          'Q1': 'quarter1',
          'Q2': 'quarter2', 
          'Q3': 'quarter3',
          'Q4': 'quarter4'
        };
        const currentQuarterField = quarterFieldMap[globalQuarter];
        
        if (currentQuarterField) {
          // If quarterly exam is empty, clear the quarter grade
          if (value === '' || value === null || value === undefined) {
            updatedGrades[currentQuarterField] = '';
            console.log('🔄 Quarterly exam cleared, clearing quarter grade');
          } else {
            // Cap the quarterly exam at 100 for calculation purposes
            const cappedQExam = Math.min(qExam, 100);
            const quarterlyGrade = (initial * 0.80) + (cappedQExam * 0.20);
            updatedGrades[currentQuarterField] = quarterlyGrade.toFixed(2);
            console.log('🔄 Quarterly exam changed, recalculated grade:', {
              wwRaw, wwHps, ptRaw, ptHps, qExam, cappedQExam,
              wwPs, ptPs, wwWs, ptWs, initial,
              quarterlyGrade: quarterlyGrade.toFixed(2),
              currentQuarterField
            });
          }
        }
      }
      
      // Calculate semester final grade based on current term
      if (currentTerm?.termName === 'Term 1') {
        // Term 1: Calculate average of Q1 and Q2
        if (field === 'quarter1' || field === 'quarter2') {
          const quarter1 = field === 'quarter1' ? value : prevGrades.quarter1;
          const quarter2 = field === 'quarter2' ? value : prevGrades.quarter2;
          
          // Handle empty values properly - clear semester final if any quarter is empty
          if (quarter1 === '' || quarter2 === '' || quarter1 === null || quarter2 === null) {
            updatedGrades.semesterFinal = '';
            updatedGrades.remarks = '';
          } else {
            const q1Num = parseFloat(quarter1) || 0;
            const q2Num = parseFloat(quarter2) || 0;
            
            const semesterGrade = (q1Num + q2Num) / 2;
            let remarks = 'REPEAT';
            
            if (semesterGrade >= 75) {
              remarks = 'PASSED';
            } else if (semesterGrade >= 59) {
              remarks = 'FAILED';
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
          
          // Handle empty values properly - clear semester final if any quarter is empty
          if (quarter3 === '' || quarter4 === '' || quarter3 === null || quarter4 === null) {
            updatedGrades.semesterFinal = '';
            updatedGrades.remarks = '';
          } else {
            const q3Num = parseFloat(quarter3) || 0;
            const q4Num = parseFloat(quarter4) || 0;
            
            const semesterGrade = (q3Num + q4Num) / 2;
            let remarks = 'REPEAT';
            
            if (semesterGrade >= 75) {
              remarks = 'PASSED';
            } else if (semesterGrade >= 59) {
              remarks = 'FAILED';
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
          
          // Handle empty values properly - clear semester final if any quarter is empty
          if (quarter3 === '' || quarter4 === '' || quarter3 === null || quarter4 === null) {
            updatedGrades.semesterFinal = '';
            updatedGrades.remarks = '';
          } else {
            const q3Num = parseFloat(quarter3) || 0;
            const q4Num = parseFloat(quarter4) || 0;
            
            const semesterGrade = (q3Num + q4Num) / 2;
            let remarks = 'REPEAT';
            
            if (semesterGrade >= 75) {
              remarks = 'PASSED';
            } else if (semesterGrade >= 59) {
              remarks = 'FAILED';
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
          
          // Handle empty values properly - clear semester final if any quarter is empty
          if (quarter1 === '' || quarter2 === '' || quarter1 === null || quarter2 === null) {
            updatedGrades.semesterFinal = '';
            updatedGrades.remarks = '';
          } else {
            const q1Num = parseFloat(quarter1) || 0;
            const q2Num = parseFloat(quarter2) || 0;
            
            const semesterGrade = (q1Num + q2Num) / 2;
            let remarks = 'REPEAT';
            
            if (semesterGrade >= 75) {
              remarks = 'PASSED';
            } else if (semesterGrade >= 59) {
              remarks = 'FAILED';
            }
            
            // Ensure semester final is always computed and not user-editable
            updatedGrades.semesterFinal = semesterGrade.toFixed(2);
            updatedGrades.remarks = remarks;
          }
        }
      }
      
      console.log('🔄 Final updatedGrades before return:', updatedGrades);
      return updatedGrades;
    });
    
    // Also update the main grades state to sync with the table
    if (selectedStudentName) {
      // Find the student by name to get their ID
      const student = students.find(s => s.name === selectedStudentName);
      if (student) {
        const schoolID = student.schoolID;
        setGrades(prevGrades => {
          const updatedMainGrades = {
            ...prevGrades,
            [schoolID]: {
              ...prevGrades[schoolID],
              [field]: value,
              // Preserve the isLocked status - don't allow editing if grades are posted
              isLocked: prevGrades[schoolID]?.isLocked || false
            }
          };
          
          // If quarterly exam is changed, also update the current quarter grade in main grades
          if (field === 'quarterlyExam') {
            const quarterFieldMap = {
              'Q1': 'quarter1',
              'Q2': 'quarter2', 
              'Q3': 'quarter3',
              'Q4': 'quarter4'
            };
            const currentQuarterField = quarterFieldMap[globalQuarter];
            if (currentQuarterField) {
              // If quarterly exam is empty, clear the quarter grade in main grades too
              if (value === '' || value === null || value === undefined) {
                updatedMainGrades[schoolID][currentQuarterField] = '';
                
                // Also clear the breakdownByQuarter structure
                if (updatedMainGrades[schoolID].breakdownByQuarter && updatedMainGrades[schoolID].breakdownByQuarter[globalQuarter]) {
                  updatedMainGrades[schoolID].breakdownByQuarter[globalQuarter].exam = '';
                }
                
                console.log('🔄 Quarterly exam cleared, clearing main grades quarter grade');
              } else {
                // Get the recalculated grade from studentGrades state
                const currentStudentGrades = studentGrades;
                const wwRaw = parseFloat(currentStudentGrades.writtenWorksRaw || 0);
                const wwHps = parseFloat(currentStudentGrades.writtenWorksHPS || 0);
                const ptRaw = parseFloat(currentStudentGrades.performanceTasksRaw || 0);
                const ptHps = parseFloat(currentStudentGrades.performanceTasksHPS || 0);
                const qExam = parseFloat(value || 0);
                
                const wwPs = wwHps > 0 ? (wwRaw / wwHps) * 100 : 0;
                const ptPs = ptHps > 0 ? (ptRaw / ptHps) * 100 : 0;
                const wwWs = wwPs * 0.30;
                const ptWs = ptPs * 0.50;
                const initial = wwWs + ptWs;
                // Cap the quarterly exam at 100 for calculation purposes
                const cappedQExam = Math.min(qExam, 100);
                const quarterlyGrade = (initial * 0.80) + (cappedQExam * 0.20);
                
                updatedMainGrades[schoolID][currentQuarterField] = quarterlyGrade.toFixed(2);
                
                // Also update the breakdownByQuarter structure
                if (!updatedMainGrades[schoolID].breakdownByQuarter) {
                  updatedMainGrades[schoolID].breakdownByQuarter = {};
                }
                if (!updatedMainGrades[schoolID].breakdownByQuarter[globalQuarter]) {
                  updatedMainGrades[schoolID].breakdownByQuarter[globalQuarter] = {};
                }
                updatedMainGrades[schoolID].breakdownByQuarter[globalQuarter].exam = value;
                
                console.log('🔄 Updated main grades with new quarterly grade:', {
                  currentQuarterField,
                  newGrade: quarterlyGrade.toFixed(2),
                  originalQExam: qExam,
                  cappedQExam: cappedQExam,
                  breakdownByQuarter: updatedMainGrades[schoolID].breakdownByQuarter[globalQuarter]
                });
              }
            }
          }
          
          return updatedMainGrades;
        });
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
              // Preserve the isLocked status - don't overwrite posted grades
              isLocked: prevGrades[student._id]?.isLocked || false,
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
          quarter1: studentGrades.quarter1 || null,
          quarter2: studentGrades.quarter2 || null,
          quarter3: studentGrades.quarter3 || null,
          quarter4: studentGrades.quarter4 || null,
          semesterFinal: studentGrades.semesterFinal || null
          // remarks will be calculated by the backend based on semesterFinal
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
        setUserEditedQuarterlyExam(false);
        setSelectedStudentSchoolID(null);
        try {
          localStorage.removeItem('userEditedQuarterlyExam');
          localStorage.removeItem('quarterlyExamValue');
        } catch (e) {
          console.log('Failed to clear userEditedQuarterlyExam flag:', e);
        }

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
    console.log('🔄 Edit mode toggle clicked. Current isEditMode:', isEditMode);
    
    if (isEditMode) {
      // If currently in edit mode, cancel and reset to original values
      const student = students.find(s => s.name === selectedStudentName);
      if (student) {
        const schoolID = student.schoolID;
        const existingGrades = grades[schoolID] || {};
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
    
    const newEditMode = !isEditMode;
    console.log('🔄 Setting edit mode to:', newEditMode);
    setIsEditMode(newEditMode);
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
      const schoolID = student.schoolID || student._id;
      const current = grades[schoolID] || {};
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
        [schoolID]: {
          ...(prev[schoolID] || {}),
          ...empty,
          // Preserve the isLocked status - don't allow clearing posted grades
          isLocked: prev[schoolID]?.isLocked || false
        }
      }));

      // Remove from persisted temp storage if present
      const selectedClassObj = classes[selectedClass];
      if (selectedClassObj) {
        try {
          const key = getTempKey(selectedClassObj.classID);
          const raw = localStorage.getItem(key);
          const obj = raw ? JSON.parse(raw) : {};
          delete obj[schoolID];
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
            let remarks = 'REPEAT';
            
            if (semesterGrade >= 75) {
              remarks = 'PASSED';
            } else if (semesterGrade >= 59) {
              remarks = 'FAILED';
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
            let remarks = 'REPEAT';
            
            if (semesterGrade >= 75) {
              remarks = 'PASSED';
            } else if (semesterGrade >= 59) {
              remarks = 'FAILED';
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
            let remarks = 'REPEAT';
            
            if (semesterGrade >= 75) {
              remarks = 'PASSED';
            } else if (semesterGrade >= 59) {
              remarks = 'FAILED';
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
    
    if (grade >= 75) {
      return 'PASSED';
    } else if (grade >= 59) {
      return 'FAILED';
    } else {
      return 'REPEAT';
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







  // Save specific quarter grades to backend
  const saveQuarterGrades = async (quarter) => {
    console.log(`🔍 Post ${quarter} Grades debug:`, {
      selectedClass,
      subjectsLength: subjects.length,
      subjects: subjects,
      studentsLength: students.length
    });
    
    if (selectedClass === null || selectedClass === undefined || subjects.length === 0) {
      showModal('Cannot Post Grades', `Cannot post ${quarter} grades.\n\nSelected Class: ${selectedClass !== null ? classes[selectedClass]?.className || 'Invalid' : 'None'}\nSubjects: ${subjects.length}\n\nPlease ensure a class is selected and subjects are loaded.`, 'warning');
      return;
    }
    
    // Show confirmation dialog first
    console.log(`🔍 Showing confirmation dialog for ${quarter}...`);
    const confirmed = window.confirm(
      `⚠️ CONFIRMATION REQUIRED\n\n` +
      `Are you sure you want to save and post ${quarter} grades for ${classes[selectedClass]?.className}?\n\n` +
      `📊 This will:\n` +
      `• Save ${quarter} grades to the database (Semestral_Grades_Collection)\n` +
      `• Post ${quarter} grades to the Report on Learning Progress and Achievement table\n` +
      `• Make ${quarter} grades visible to all students\n` +
      `• Lock ${quarter} grades permanently (cannot be edited anymore)\n\n` +
      `Click "OK" to proceed or "Cancel" to abort.`
    );
    
    console.log(`🔍 Confirmation result for ${quarter}:`, confirmed);
    
    if (!confirmed) {
      console.log(`🔍 User cancelled posting ${quarter} grades`);
      return;
    }
    
    try {
      const selectedClassObj = classes[selectedClass];
      
      // Validate specific quarter grades before saving
      const invalidGrades = [];
      students.forEach((student, index) => {
        const schoolID = student.schoolID || student._id;
        const studentGrades = grades[schoolID] || {};
        
        if (studentGrades[quarter] && studentGrades[quarter] !== '') {
          const gradeNum = parseFloat(studentGrades[quarter]);
          if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
            invalidGrades.push(`Student ${student.name} - ${quarter}: ${studentGrades[quarter]}`);
          }
        }
      });
      
      if (invalidGrades.length > 0) {
        showModal(
          'Invalid Grades Detected',
          `All ${quarter} grades must be between 0 and 100.\n\nInvalid grades:\n${invalidGrades.join('\n')}\n\nPlease correct these grades before posting.`,
          'error'
        );
        return;
      }
      
      // Prepare grades data for specific quarter
      const gradesData = {
        classID: selectedClassObj.classID,
        className: selectedClassObj.className,
        academicYear: `${academicYear?.schoolYearStart}-${academicYear?.schoolYearEnd}`,
        termName: currentTerm?.termName,
        facultyID: currentFacultyID,
        section: selectedSection,
        quarter: quarter, // Specify which quarter we're posting
        students: students.map(student => {
          const schoolID = student.schoolID || student._id;
          const studentGrades = grades[schoolID] || {};
          
          return {
            studentID: student._id,
            schoolID: schoolID,
            studentName: student.name,
            subjectCode: selectedClassObj.classCode || selectedClassObj.className,
            subjectName: selectedClassObj.className,
            grades: {
              [quarter]: studentGrades[quarter] || '', // Only include the specific quarter
              // Keep existing grades for other quarters if they exist
              quarter1: studentGrades.quarter1 || '',
              quarter2: studentGrades.quarter2 || '',
              quarter3: studentGrades.quarter3 || '',
              quarter4: studentGrades.quarter4 || '',
              semesterFinal: studentGrades.semesterFinal || '',
              remarks: studentGrades.remarks || ''
            },
            breakdownByQuarter: studentGrades.breakdownByQuarter || {}
          };
        })
      };

      // Save to database using the Semestral_Grades_Collection
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/semestral-grades/save-quarter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gradesData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Build a concise summary of posted grades for this quarter
        const summaryLines = (gradesData.students || []).map(s => `• ${s.studentName}: ${s.grades[quarter] || 'N/A'}`);
        const summaryText = [
          `${quarter} grades have been saved to the database (Semestral_Grades_Collection) and posted to the Report on Learning Progress and Achievement table.`,
          '',
          `Posted Summary (Name: ${quarter} Grade):`,
          ...summaryLines,
          '',
          `👥 These ${quarter} grades are now visible to all students and cannot be edited anymore.`,
          `🔒 ${quarter} grades are now locked and read-only.`,
          '🎯 Students can now view their grades in their student dashboard using their School ID.',
          '💾 Data is securely stored with proper encryption.'
        ].join('\n');
        showModal(`${quarter} Grades Posted Successfully`, summaryText, 'success');
        
        // Mark specific quarter grades as locked/read-only
        setGrades(prevGrades => {
          const updatedGrades = {};
          Object.keys(prevGrades).forEach(studentId => {
            updatedGrades[studentId] = {
              ...prevGrades[studentId],
              [`${quarter}Locked`]: true, // Mark specific quarter as locked
              isTemp: false
            };
          });
          return updatedGrades;
        });

      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save grades to database');
      }

    } catch (error) {
      console.error(`Error saving ${quarter} grades:`, error);
      showModal(
        'Save Failed',
        `Failed to save ${quarter} grades: ${error.message || 'Unknown error'}\n\nPlease check your connection and try again.`,
        'error'
      );
    }
  };

  // Save grades to backend
  const saveGrades = async () => {
    console.log('🔍 Post Grades debug:', {
      selectedClass,
      subjectsLength: subjects.length,
      subjects: subjects,
      studentsLength: students.length
    });
    
    if (selectedClass === null || selectedClass === undefined || subjects.length === 0) {
      showModal('Cannot Post Grades', `Cannot post grades.\n\nSelected Class: ${selectedClass !== null ? classes[selectedClass]?.className || 'Invalid' : 'None'}\nSubjects: ${subjects.length}\n\nPlease ensure a class is selected and subjects are loaded.`, 'warning');
      return;
    }
    
    // Show confirmation dialog first
    console.log('🔍 Showing confirmation dialog...');
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
    
    console.log('🔍 Confirmation result:', confirmed);
    
    if (!confirmed) {
      console.log('🔍 User cancelled posting grades');
      return;
    }
    
    try {
      const selectedClassObj = classes[selectedClass];
      
      // Validate all grades before saving
      const invalidGrades = [];
      students.forEach((student, index) => {
        const schoolID = student.schoolID || student._id;
        const studentGrades = grades[schoolID] || {};
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
          const schoolID = student.schoolID || student._id;
        const studentGrades = grades[schoolID] || {};
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
    console.log('🔍 Export debug:', {
      selectedClass,
      studentsLength: students.length,
      students: students,
      grades: grades
    });
    
    if (selectedClass === null || selectedClass === undefined || students.length === 0) {
      showModal('No Data', `No students or grades to export.\n\nSelected Class: ${selectedClass !== null ? classes[selectedClass]?.className || 'Invalid' : 'None'}\nStudents: ${students.length}\n\nPlease select a class and ensure students are loaded.`, 'warning');
      return;
    }

    try {
      const selectedClassObj = classes[selectedClass];
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Prepare CSV content matching the exact template structure
      const headers = [
        'Student No.',
        'STUDENT\'S NAME (Alphabetical Order with Middle)',
        // Written Works 40% - nested structure
        'WRITTEN WORKS 40%',
        '', // Empty for RAW sub-header
        '', // Empty for HPS sub-header  
        '', // Empty for PS sub-header
        '', // Empty for WS sub-header
        // Performance Tasks 60% - nested structure
        'PERFORMANCE TASKS 60%',
        '', // Empty for RAW sub-header
        '', // Empty for HPS sub-header
        '', // Empty for PS sub-header  
        '', // Empty for WS sub-header
        // Remove INITIAL GRA QUARTERLY header - just leave empty
        '',
        '' // Empty for second quarterly column
      ];

      // Add sub-headers row for the nested structure
      const subHeaders = [
        '', '', // Student info columns
        'RAW', 'HPS', 'PS', 'WS', // Written Works sub-headers
        'RAW', 'HPS', 'PS', 'WS', // Performance Tasks sub-headers
        '**Initial**', '**Final**' // Bold the Initial and Final headers
      ];

      const csvRows = [
        headers.join(','),
        subHeaders.join(',')
      ];

      students.forEach(student => {
        const schoolID = student.schoolID || student._id;
        const studentGrades = grades[schoolID] || {};
        const breakdown = studentGrades.breakdownByQuarter?.[globalQuarter] || {};
        
        // Calculate PS (Percentage Score) and WS (Weighted Score) with template weights
        const wwRaw = parseFloat(breakdown.ww?.raw || studentGrades.writtenWorksRaw || 0);
        const wwHPS = parseFloat(breakdown.ww?.hps || studentGrades.writtenWorksHPS || 0);
        const wwPS = wwHPS > 0 ? (wwRaw / wwHPS) * 100 : 0;
        const wwWS = wwPS * 0.4; // 40% weight (matching template)

        const ptRaw = parseFloat(breakdown.pt?.raw || studentGrades.performanceTasksRaw || 0);
        const ptHPS = parseFloat(breakdown.pt?.hps || studentGrades.performanceTasksHPS || 0);
        const ptPS = ptHPS > 0 ? (ptRaw / ptHPS) * 100 : 0;
        const ptWS = ptPS * 0.6; // 60% weight (matching template)

        const exam = parseFloat(breakdown.exam || studentGrades.quarterlyExam || 0);
        const examPS = exam; // Exam is already a percentage
        const examWS = examPS * 0.2; // 20% weight

        const initialGrade = wwWS + ptWS;
        const quarterlyGrade = (initialGrade * 0.8) + (exam * 0.2);

        // Get the quarter final grade from the student's grades data
        // Map Q1 -> quarter1, Q2 -> quarter2, etc.
        const quarterFieldMap = {
          'Q1': 'quarter1',
          'Q2': 'quarter2', 
          'Q3': 'quarter3',
          'Q4': 'quarter4'
        };
        const currentQuarterField = quarterFieldMap[globalQuarter];
        let quarterFinalGrade = currentQuarterField ? studentGrades[currentQuarterField] || '' : '';
        
        // Fallback: try to get from breakdownByQuarter if direct access fails
        if (!quarterFinalGrade && studentGrades.breakdownByQuarter && studentGrades.breakdownByQuarter[globalQuarter]) {
          quarterFinalGrade = studentGrades.breakdownByQuarter[globalQuarter].quarterlyGrade || '';
        }
        

        const row = [
          student.schoolID || student._id,
          `"${student.name}"`,
          // Written Works 40% breakdown
          wwRaw || '',
          wwHPS || '',
          wwPS.toFixed(2),
          wwWS.toFixed(2),
          // Performance Tasks 60% breakdown
          ptRaw || '',
          ptHPS || '',
          ptPS.toFixed(2),
          ptWS.toFixed(2),
          // Initial Grade Quarterly (two columns)
          initialGrade.toFixed(2),
          quarterFinalGrade || quarterlyGrade.toFixed(2) // Show quarter final grade if available, otherwise calculated grade
        ];

        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      
      // Create and download file with proper UTF-8 encoding
      const BOM = '\uFEFF'; // Byte Order Mark for UTF-8
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
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
        `Successfully exported ${students.length} student grades to Excel format.\n\nFile includes:\n• RAW scores and HPS values\n• Calculated PS (Percentage Score)\n• Calculated WS (Weighted Score)\n• Initial Grade and ${globalQuarter} Final Grade\n\nFile saved as: ${selectedClassObj?.className || 'Grades'}_${globalQuarter}_${currentDate}.csv`,
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
      
      // Only save draft for non-locked grades (don't overwrite posted grades)
      const draft = {};
      Object.entries(grades || {}).forEach(([sid, g]) => {
        // Only include grades that are not locked (not posted)
        if (!g.isLocked) {
          draft[sid] = { ...g, isTemp: true, isLocked: false };
        }
      });
      
      // Only update grades state if there are draft grades to save
      if (Object.keys(draft).length > 0) {
        setGrades(prev => {
          const updated = { ...prev };
          Object.entries(draft).forEach(([sid, g]) => {
            updated[sid] = g;
          });
          return updated;
        });
      }
      saveTempGrades(selectedClassObj.classID, draft);
      
      // Save to backend semestral_draft_collections
      const token = localStorage.getItem("token");
      const facultyID = localStorage.getItem('userID') || 'unknown';
      
      // Prepare draft data for all students
      const draftData = students.map(student => {
        const schoolID = student.schoolID || student._id;
        const studentGrades = grades[schoolID] || {};
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
        if (!res.ok) {
          console.log('❌ Failed to load drafts:', res.status, res.statusText);
          return;
        }
        const data = await res.json();
        if (!data?.success) {
          console.log('❌ No drafts found or API error:', data);
          return;
        }
        console.log('📊 Loaded drafts from database:', data.drafts);
               const latestByStudent = {};
               (data.drafts || []).forEach(d => {
                 // Use only schoolID to avoid confusion
                 const key = d.schoolID;
                 if (!key) return; // Skip if no schoolID
                 
                 const prev = latestByStudent[key];
                 if (!prev || new Date(d.updatedAt || d.lastUpdated || d.createdAt || 0) > new Date(prev.updatedAt || prev.lastUpdated || prev.createdAt || 0)) {
                   latestByStudent[key] = d;
                 }
               });
        const merged = { ...grades };
        Object.values(latestByStudent).forEach(d => {
          const studentKey = d.schoolID;
          if (!studentKey) return; // Skip if no schoolID
          
          const existingGrades = merged[studentKey] || {};
          
          // Only load draft grades if the grades are not already locked (posted)
          if (!existingGrades.isLocked) {
            const draftTimestamp = new Date(d.updatedAt || d.lastUpdated || d.createdAt || 0);
            const existingTimestamp = existingGrades.draftTimestamp ? new Date(existingGrades.draftTimestamp) : new Date(0);
            
            // Only load if this draft is newer than what's already loaded
            if (draftTimestamp >= existingTimestamp) {
              const draftGradeData = {
                ...existingGrades,
                ...d.grades,
                breakdownByQuarter: d.breakdownByQuarter || {},
                isTemp: true,
                isLocked: false,
                // Ensure the draft timestamp is preserved for comparison
                draftTimestamp: d.updatedAt || d.lastUpdated || d.createdAt
              };
              
              // Store with both schoolID and _id keys to ensure compatibility
              merged[studentKey] = draftGradeData;
              console.log(`📊 Loaded draft for schoolID ${studentKey}:`, draftGradeData);
            } else {
              console.log(`⏰ Skipping older draft for ${studentKey}:`, {
                draftTime: draftTimestamp,
                existingTime: existingTimestamp
              });
            }
          }
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
                              const schoolID = student.schoolID || student._id;
        const existingGrades = grades[schoolID] || {};
                              
                              // Get current quarter breakdown data
                              const currentQuarterBreakdown = existingGrades.breakdownByQuarter?.[globalQuarter] || {};
                              
                              // Don't set studentGrades here - let the useEffect handle it
                              // This prevents overriding user changes
                              // Clear the search input after selection
                              setSelectedStudent('');
                              // Show the individual management section
                              setShowIndividualManagement(true);
                              // Reset edit mode for new student
                              setIsEditMode(false);
                              // Only reset user edit flag if selecting a different student
                              if (selectedStudentSchoolID !== student.schoolID) {
                                console.log('🔄 Different student selected, resetting edit flag');
                                setUserEditedQuarterlyExam(false);
                                try {
                                  localStorage.removeItem('userEditedQuarterlyExam');
                                  localStorage.removeItem('quarterlyExamValue');
                                  console.log('🔄 Cleared localStorage values for new student');
                                } catch (e) {
                                  console.log('Failed to clear userEditedQuarterlyExam flag:', e);
                                }
                              } else {
                                console.log('🔄 Same student selected, preserving edit flag');
                              }
                              setSelectedStudentSchoolID(student.schoolID);
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
                       {!isEditMode && (
                         <div className="mt-2 px-3 py-1 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-600">
                           🔒 View Mode - Click "Edit Grades" to enable editing
                         </div>
                       )}
                     </div>
                     <div className="flex items-center gap-2">
                       <button
                         onClick={async () => {
                           // Save only this student's current grades as a draft (local temp)
                           const student = students.find(s => s.name === selectedStudentName);
                           if (!student) return;
                           const sid = student.schoolID;
                           const next = {
                             ...(grades[sid] || {}),
                             ...studentGrades,
                             isTemp: true,
                             // Preserve the isLocked status - don't overwrite posted grades
                             isLocked: grades[sid]?.isLocked || false
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
                     const studentGradesData = grades[student?.schoolID] || {};
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
                  
                  {/* Student Grade Inputs - Show only current quarter */}
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    {(() => {
                      const student = students.find(s => s.name === selectedStudentName);
                      const studentGradesData = grades[student?.schoolID] || {};
                      const isLocked = studentGradesData.isLocked;
                      
                      // Map globalQuarter to quarter field names
                      const quarterFieldMap = {
                        'Q1': 'quarter1',
                        'Q2': 'quarter2', 
                        'Q3': 'quarter3',
                        'Q4': 'quarter4'
                      };
                      
                      const currentQuarterField = quarterFieldMap[globalQuarter];
                      const currentQuarterLabel = globalQuarter === 'Q1' ? '1st Quarter' : 
                                                globalQuarter === 'Q2' ? '2nd Quarter' :
                                                globalQuarter === 'Q3' ? '3rd Quarter' : '4th Quarter';
                      
                      if (isLocked) {
                        // Show read-only grade when locked
                        return (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{currentQuarterLabel}</label>
                            <input
                              type="text"
                              readOnly
                              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 font-semibold"
                              value={studentGrades[currentQuarterField] || studentGradesData[currentQuarterField] || ''}
                            />
                            <p className="text-xs text-gray-500 mt-1">Grades locked - cannot edit</p>
                          </div>
                        );
                      }

                      // Show editable input for current quarter
                      return (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {currentQuarterLabel}
                            {studentGrades[`${currentQuarterField}Locked`] && <span className="text-green-600 ml-2">🔒 Posted</span>}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="Grade"
                            disabled={!isEditMode || studentGrades[`${currentQuarterField}Locked`]}
                            className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              !isEditMode || studentGrades[`${currentQuarterField}Locked`] ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                            value={studentGrades[currentQuarterField] || ''}
                            onChange={(e) => {
                              console.log('🔄 Input changed:', currentQuarterField, 'new value:', e.target.value, 'isEditMode:', isEditMode);
                              handleStudentGradeChange(currentQuarterField, e.target.value);
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {studentGrades[`${currentQuarterField}Locked`] ? '🔒 Grade posted - cannot edit' : 'Valid range: 0.00 - 100.00'}
                          </p>
                          {studentGrades[currentQuarterField] && (
                            <p className={`text-xs mt-1 ${isValidGrade(studentGrades[currentQuarterField]) ? 'text-green-600' : 'text-red-600'}`}>
                              {isValidGrade(studentGrades[currentQuarterField]) ? '✅ Valid grade' : '❌ Invalid grade'}
                            </p>
                          )}
                        </div>
                      );
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
                              <td className="border border-gray-300 p-2 text-center bg-gray-50">
                                <span className="font-semibold">{studentGrades.writtenWorksRaw || '0'}</span>
                              </td>
                              <td className="border border-gray-300 p-2 text-center bg-gray-50">
                                <span className="font-semibold">{studentGrades.writtenWorksHPS || '0'}</span>
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
                                  className={`w-full text-center border border-blue-300 bg-blue-50 focus:bg-white focus:border-blue-500 ${!isEditMode ? 'cursor-not-allowed bg-gray-100' : 'bg-blue-50'}`}
                                  value={studentGrades.quarterlyExam ?? ''}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    console.log('🔄 Quarterly exam input changed:', newValue, 'type:', typeof newValue, 'length:', newValue.length);
                                    handleStudentGradeChange('quarterlyExam', newValue);
                                  }}
                                  onBlur={(e) => {
                                    console.log('🔄 Quarterly exam onBlur:', e.target.value);
                                  }}
                                  onFocus={(e) => {
                                    console.log('🔄 Quarterly exam onFocus:', e.target.value);
                                  }}
                                />
                                <p className="text-xs text-blue-600 mt-1">✏️ Editable</p>
                                {studentGrades.quarterlyExam && parseFloat(studentGrades.quarterlyExam) > 100 && (
                                  <p className="text-xs text-red-600 mt-1">⚠️ Warning: Grade exceeds 100</p>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 p-2 font-medium">Performance Tasks (50%)</td>
                              <td className="border border-gray-300 p-2 text-center bg-gray-50">
                                <span className="font-semibold">{studentGrades.performanceTasksRaw || '0'}</span>
                              </td>
                              <td className="border border-gray-300 p-2 text-center bg-gray-50">
                                <span className="font-semibold">{studentGrades.performanceTasksHPS || '0'}</span>
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
                        <p><strong>Note:</strong> RAW, HPS, PS, and WS values are from the system (Excel upload) and cannot be edited. Only the <strong>Quarterly Exam</strong> can be modified, which will automatically recalculate the final quarterly grade.</p>
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
                          const studentGradesData = grades[student?.schoolID] || {};
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
                     const studentGradesData = grades[student?.schoolID] || {};
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
                         Posted to Students: {(() => {
                           const postedCount = students.filter(student => {
                             // Use schoolID for grade lookup instead of database _id
                             const schoolID = student.schoolID || student._id;
                             return grades[schoolID]?.isLocked;
                           }).length;
                           console.log('🔍 UI Status Calculation - Posted count:', postedCount);
                           console.log('🔍 UI Status Calculation - Students:', students.map(s => ({ 
                             name: s.name, 
                             schoolID: s.schoolID, 
                             dbID: s._id, 
                             isLocked: grades[s.schoolID]?.isLocked 
                           })));
                           console.log('🔍 UI Status Calculation - Grades object:', grades);
                           return postedCount;
                         })()}
                       </span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                       <span className="text-sm font-medium text-gray-700">
                         Pending: {students.filter(student => {
                           const schoolID = student.schoolID || student._id;
                           return !grades[schoolID]?.isLocked && !grades[schoolID]?.isTemp;
                         }).length}
                       </span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                       <span className="text-sm font-medium text-gray-700">
                         Uploaded (not posted): {students.filter(student => {
                           const schoolID = student.schoolID || student._id;
                           return grades[schoolID]?.isTemp && !grades[schoolID]?.isLocked;
                         }).length}
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
                        {/* Quarter-specific posting buttons */}
                        {currentTerm?.termName === 'Term 1' ? (
                          <>
                            <button
                              onClick={() => saveQuarterGrades('quarter1')}
                              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                                students.length > 0 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              }`}
                              title="Post 1st Quarter grades only"
                              disabled={students.length === 0}
                            >
                              📊 Post Q1
                            </button>
                            <button
                              onClick={() => saveQuarterGrades('quarter2')}
                              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                                students.length > 0 
                                  ? 'bg-green-600 text-white hover:bg-green-700' 
                                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              }`}
                              title="Post 2nd Quarter grades only"
                              disabled={students.length === 0}
                            >
                              📊 Post Q2
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => saveQuarterGrades('quarter3')}
                              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                                students.length > 0 
                                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              }`}
                              title="Post 3rd Quarter grades only"
                              disabled={students.length === 0}
                            >
                              📊 Post Q3
                            </button>
                            <button
                              onClick={() => saveQuarterGrades('quarter4')}
                              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                                students.length > 0 
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              }`}
                              title="Post 4th Quarter grades only"
                              disabled={students.length === 0}
                            >
                              📊 Post Q4
                            </button>
                          </>
                        )}
                        <button
                          onClick={saveGrades}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-orange-600 text-white hover:bg-orange-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Post all grades at once"
                          disabled={students.length === 0}
                        >
                          📊 Post All
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
                                const schoolID = student.schoolID;
                                const studentGrades = grades[schoolID] || {};
                                
                                // Helper function to get quarterly grade from breakdown data if available
                                const getQuarterlyGrade = (quarter) => {
                                  // First try direct access (same as individual management)
                                  if (studentGrades[quarter]) {
                                    return studentGrades[quarter];
                                  }
                                  
                                  // Map quarter names to the correct keys in breakdownByQuarter
                                  const quarterKeyMap = {
                                    'quarter1': 'Q1',
                                    'quarter2': 'Q2', 
                                    'quarter3': 'Q3',
                                    'quarter4': 'Q4'
                                  };
                                  
                                  const quarterKey = quarterKeyMap[quarter] || quarter.toUpperCase();
                                  const breakdown = studentGrades.breakdownByQuarter?.[quarterKey];
                                  
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
                                        {!isLocked && (grades[schoolID]?.isTemp) && (
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
                                       {remarks || '-'}
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
                        {/* Quarter-specific posting buttons */}
                        {currentTerm?.termName === 'Term 1' ? (
                          <>
                            <button
                              onClick={() => saveQuarterGrades('quarter1')}
                              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                                students.length > 0 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              }`}
                              title="Post 1st Quarter grades only"
                              disabled={students.length === 0}
                            >
                              📊 Post Q1
                            </button>
                            <button
                              onClick={() => saveQuarterGrades('quarter2')}
                              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                                students.length > 0 
                                  ? 'bg-green-600 text-white hover:bg-green-700' 
                                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              }`}
                              title="Post 2nd Quarter grades only"
                              disabled={students.length === 0}
                            >
                              📊 Post Q2
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => saveQuarterGrades('quarter3')}
                              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                                students.length > 0 
                                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              }`}
                              title="Post 3rd Quarter grades only"
                              disabled={students.length === 0}
                            >
                              📊 Post Q3
                            </button>
                            <button
                              onClick={() => saveQuarterGrades('quarter4')}
                              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                                students.length > 0 
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              }`}
                              title="Post 4th Quarter grades only"
                              disabled={students.length === 0}
                            >
                              📊 Post Q4
                            </button>
                          </>
                        )}
                        <button
                          onClick={saveGrades}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            students.length > 0 
                              ? 'bg-orange-600 text-white hover:bg-orange-700' 
                              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          }`}
                          title="Post all grades at once"
                          disabled={students.length === 0}
                        >
                          📊 Post All
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
                                const schoolID = student.schoolID;
                                const studentGrades = grades[schoolID] || {};
                                
                                // Helper function to get quarterly grade from breakdown data if available
                                const getQuarterlyGrade = (quarter) => {
                                  // First try direct access (same as individual management)
                                  if (studentGrades[quarter]) {
                                    return studentGrades[quarter];
                                  }
                                  
                                  // Map quarter names to the correct keys in breakdownByQuarter
                                  const quarterKeyMap = {
                                    'quarter1': 'Q1',
                                    'quarter2': 'Q2', 
                                    'quarter3': 'Q3',
                                    'quarter4': 'Q4'
                                  };
                                  
                                  const quarterKey = quarterKeyMap[quarter] || quarter.toUpperCase();
                                  const breakdown = studentGrades.breakdownByQuarter?.[quarterKey];
                                  
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
                                       {remarks || '-'}
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
                
                console.log('🎯 onStageTemporaryGrades called with:', {
                  recordsCount: records.length,
                  records: records,
                  meta: meta
                });
                
                const updatedGrades = { ...grades };
                const updatedStudents = [...students];
                const studentIndexBySchoolId = new Map(
                  (updatedStudents || []).map((s, idx) => [String(s.schoolID || s._id), idx])
                );

                const activeQuarter = meta?.quarter || 'Q1';
                const quarterFieldMap = { Q1: 'quarter1', Q2: 'quarter2', Q3: 'quarter3', Q4: 'quarter4' };
                const targetQuarterField = quarterFieldMap[activeQuarter] || 'quarter1';
                
                console.log('🎯 Quarter mapping:', {
                  activeQuarter,
                  targetQuarterField,
                  meta
                });

                records.forEach((rec) => {
                  const key = String(rec.schoolID || '').trim();
                  if (!key) return;
                  
                  console.log('🔍 Processing record:', { 
                    schoolID: key, 
                    studentName: rec.studentName,
                    rec: rec, // Show the entire record
                    availableStudents: updatedStudents.map(s => ({ 
                      _id: s._id, 
                      schoolID: s.schoolID, 
                      name: s.name 
                    }))
                  });
                  
                  let idx = studentIndexBySchoolId.get(key);
                  if (typeof idx === 'undefined') {
                    // Try multiple matching strategies
                    let existingStudent = null;
                    
                    // Strategy 1: Exact schoolID match
                    existingStudent = updatedStudents.find(s => 
                      String(s.schoolID || s._id) === key
                    );
                    
                    // Strategy 2: Try matching by name if schoolID fails
                    if (!existingStudent && rec.studentName) {
                      existingStudent = updatedStudents.find(s => {
                        const dbName = s.name || '';
                        const excelName = rec.studentName || '';
                        // Try both directions of name matching
                        return dbName.toLowerCase().includes(excelName.toLowerCase()) ||
                               excelName.toLowerCase().includes(dbName.toLowerCase()) ||
                               // Handle name format differences like "Last, First" vs "First Last"
                               dbName.toLowerCase().replace(/\s+/g, '') === excelName.toLowerCase().replace(/\s+/g, '').replace(/,/g, '');
                      });
                    }
                    
                    if (existingStudent) {
                      idx = updatedStudents.indexOf(existingStudent);
                      studentIndexBySchoolId.set(key, idx);
                      console.log('✅ Found student by matching:', { 
                        matchedBy: existingStudent.schoolID === key ? 'schoolID' : 'name',
                        student: existingStudent.name,
                        index: idx
                      });
                    } else {
                      console.log('⚠️ Creating new student record for:', key);
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
                  const sid = student.schoolID;
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
                  
                  console.log('🧮 Grade calculation for', rec.studentName, ':', {
                    wwRaw, wwHps, wwPs, wwWs,
                    ptRaw, ptHps, ptPs, ptWs,
                    qExam, initial, quarterlyGrade,
                    targetQuarter: activeQuarter,
                    targetField: targetQuarterField
                  });

                  const breakdownForQuarter = {
                    ww: { raw: wwRaw, hps: wwHps, ps: wwPs, ws: wwWs },
                    pt: { raw: ptRaw, hps: ptHps, ps: ptPs, ws: ptWs },
                    initial: Number.isFinite(initial) ? initial.toFixed(2) : '0.00',
                    exam: Number.isFinite(qExam) ? qExam.toFixed(2) : '0.00',
                    quarterly: Number.isFinite(quarterlyGrade) ? quarterlyGrade.toFixed(2) : '0.00'
                  };

                  const existingBreakdowns = prev.breakdownByQuarter || {};
                  const nextBreakdowns = { ...existingBreakdowns, [activeQuarter]: breakdownForQuarter };

                  const updatedGrade = {
                    ...prev,
                    ...g,
                    breakdownByQuarter: nextBreakdowns,
                    breakdown: breakdownForQuarter, // for current panel binding
                    // Explicitly set the target quarter grade to ensure it overwrites the old one
                    [targetQuarterField]: breakdownForQuarter.quarterly,
                    // Preserve the isLocked status - don't overwrite posted grades
                    isLocked: prev.isLocked || false,
                    isTemp: true
                  };
                  
                  console.log('🔄 Grade update details:', {
                    studentName: rec.studentName,
                    targetQuarterField,
                    oldGrade: prev[targetQuarterField],
                    newGrade: breakdownForQuarter.quarterly,
                    updatedGrade: updatedGrade[targetQuarterField]
                  });
                  
                  // Use only schoolID to avoid confusion and grade overwrites
                  updatedGrades[key] = updatedGrade;
                  
                  console.log('📊 Updated grades for student:', {
                    studentName: student.name,
                    studentID: sid,
                    schoolID: key,
                    targetQuarter: activeQuarter,
                    targetField: targetQuarterField,
                    newGrade: breakdownForQuarter.quarterly,
                    allGrades: updatedGrade
                  });
                });

                setStudents(updatedStudents);
                setGrades(updatedGrades);
                
                // Force a re-render of the main table by updating the grades state
                console.log('🔄 Force updating main table with new grades...');
                setTimeout(() => {
                  setGrades(prev => {
                    console.log('🔄 Main table refresh - current grades:', prev);
                    // Create a completely new object to force React to re-render
                    const newGrades = { ...prev };
                    Object.keys(updatedGrades).forEach(key => {
                      newGrades[key] = { ...updatedGrades[key] };
                    });
                    console.log('🔄 New grades object:', newGrades);
                    return newGrades;
                  });
                  // Force table re-render
                  setTableRefreshKey(prev => prev + 1);
                }, 100);
                
                // Persist temp grades locally so they survive reloads
                const selectedClassObj = classes[selectedClass];
                if (selectedClassObj) {
                  console.log('💾 Saving temp grades for class:', selectedClassObj.classID);
                  saveTempGrades(selectedClassObj.classID, updatedGrades);
                  
                  // Also save to database as draft
                  const token = localStorage.getItem("token");
                  const draftData = {
                    classID: selectedClassObj.classID,
                    academicYear: globalAcademicYear || (academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : ''),
                    termName: currentTerm?.termName,
                    drafts: records.map(rec => ({
                      schoolID: rec.schoolID,
                      studentId: rec.schoolID, // Use schoolID as studentId for now
                      studentName: rec.studentName,
                      subjectCode: selectedClassObj.classCode || selectedClassObj.className,
                      subjectName: selectedClassObj.className,
                      classID: selectedClassObj.classID,
                      section: selectedSection,
                      academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : '',
                      termName: currentTerm?.termName,
                      facultyID: currentFacultyID,
                      grades: rec.grades || {},
                      breakdownByQuarter: rec.breakdownByQuarter || {}
                    }))
                  };
                  
                  console.log('💾 Saving draft to database:', draftData);
                  
                  fetch(`${API_BASE}/api/semestral-grades/save-draft-bulk`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(draftData)
                  }).then(response => {
                    if (response.ok) {
                      console.log('✅ Draft saved to database successfully');
                    } else {
                      console.error('❌ Failed to save draft to database:', response.status);
                    }
                  }).catch(error => {
                    console.error('❌ Error saving draft to database:', error);
                  });
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
                      writtenWorksRaw: existing.writtenWorksRaw || existing.breakdown?.ww?.raw || existing.breakdownByQuarter?.[globalQuarter]?.ww?.raw || '',
                      writtenWorksHPS: existing.writtenWorksHPS || existing.breakdown?.ww?.hps || existing.breakdownByQuarter?.[globalQuarter]?.ww?.hps || '',
                      performanceTasksRaw: existing.performanceTasksRaw || existing.breakdown?.pt?.raw || existing.breakdownByQuarter?.[globalQuarter]?.pt?.raw || '',
                      performanceTasksHPS: existing.performanceTasksHPS || existing.breakdown?.pt?.hps || existing.breakdownByQuarter?.[globalQuarter]?.pt?.hps || '',
                      quarterlyExam: existing.quarterlyExam || existing.breakdown?.exam || existing.breakdownByQuarter?.[globalQuarter]?.exam || ''
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
                
                // Refresh the grades to show the updated Q2 grades
                if (selectedClass !== null && classes[selectedClass]) {
                  console.log('🔄 Refreshing grades after Excel upload...');
                  loadGradesByIndividualStudents(students);
                }
                // Persist staged breakdowns to draft collection
                (async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const selectedClassObj = classes[selectedClass];
                    
                    console.log('🔍 Debugging selectedClassObj:', {
                      selectedClass,
                      classes: classes,
                      selectedClassObj: selectedClassObj,
                      classesKeys: Object.keys(classes)
                    });
                    
                    if (!selectedClassObj) {
                      console.error('❌ selectedClassObj is undefined! Cannot save draft.');
                      return;
                    }
                    
                    await Promise.all(Object.entries(updatedGrades).map(async ([sid, g]) => {
                      const body = {
                        schoolID: sid,
                        subjectCode: selectedClassObj?.classCode || selectedClassObj?.className,
                        subjectName: selectedClassObj?.className,
                        classID: selectedClassObj?.classID,
                        section: selectedSection,
                        academicYear: globalAcademicYear || (academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : ''),
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
                      console.log('🔍 Sending to save-draft:', body);
                      const response = await fetch(`${API_BASE}/api/semestral-grades/save-draft`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(body)
                      });
                      if (!response.ok) {
                        console.error('❌ save-draft failed:', response.status, response.statusText);
                        const errorText = await response.text();
                        console.error('❌ Error response:', errorText);
                      }
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
