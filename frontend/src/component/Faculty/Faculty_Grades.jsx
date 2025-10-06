import Faculty_Navbar from "./Faculty_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState, useCallback } from 'react';
import { useQuarter } from "../../context/QuarterContext.jsx";

/**
 * Faculty Grades Component
 * 
 * Basic structure for grade management
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
  // Get quarter context (keeping for future use)
  const { globalQuarter: _globalQuarter, globalTerm: _globalTerm, globalAcademicYear: _globalAcademicYear } = useQuarter();
  
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [quarterlyGrades, setQuarterlyGrades] = useState({}); // Store quarterly grades for each quarter
  const [quarterData, setQuarterData] = useState({}); // Store separate data for each quarter
  const [posting, setPosting] = useState(false); // For posting grades to students
  const [_subjectInfo, _setSubjectInfo] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [_currentFacultyID, setCurrentFacultyID] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [studentScores, setStudentScores] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [saving, setSaving] = useState(false);
  const [quarterStatus, setQuarterStatus] = useState({}); // Store quarter status for each quarter
  const [confirmRepost, setConfirmRepost] = useState({ isOpen: false, quarter: null, callback: null });

  const showModal = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: '', message: '', type: 'info' });
  };

  // Check if grades have already been posted for a quarter
  const checkIfGradesPosted = async (quarter) => {
    try {
      const token = localStorage.getItem('token');
      const selectedClassData = classes.find(c => c._id === selectedClass);
      
      if (!selectedClassData) return false;

      const response = await fetch(`${API_BASE}/api/grades/check-posted?classId=${selectedClassData.classID}&section=${selectedSection}&quarter=${quarter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        return result.posted || false;
      }
      return false;
    } catch (error) {
      console.error('Error checking if grades are posted:', error);
      return false;
    }
  };

  // Fetch quarter status for the current academic year
  const fetchQuarterStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!academicYear) return;

      const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
      const response = await fetch(`${API_BASE}/api/quarters/schoolyear/${schoolYearName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const quarters = await response.json();
        const statusMap = {};
        
        quarters.forEach(quarter => {
          // Map quarter names to status
          if (quarter.quarterName === 'Quarter 1') {
            statusMap['Q1'] = quarter.status;
          } else if (quarter.quarterName === 'Quarter 2') {
            statusMap['Q2'] = quarter.status;
          } else if (quarter.quarterName === 'Quarter 3') {
            statusMap['Q3'] = quarter.status;
          } else if (quarter.quarterName === 'Quarter 4') {
            statusMap['Q4'] = quarter.status;
          }
        });
        
        setQuarterStatus(statusMap);
        console.log('Quarter status fetched:', statusMap);
      }
    } catch (error) {
      console.error('Error fetching quarter status:', error);
    }
  }, [academicYear]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Get current faculty ID from token (no need for separate API call)
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found');
          showModal('Authentication Error', 'Please log in again', 'error');
          return;
        }

        // Decode token to get user info
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentFacultyID(payload._id);
        } catch (tokenError) {
          console.error('Error decoding token:', tokenError);
          showModal('Authentication Error', 'Invalid token. Please log in again', 'error');
          return;
        }

        // Fetch academic year
        let academicYearData = null;
        let currentTermData = null;
        
        try {
          const academicYearResponse = await fetch(`${API_BASE}/api/schoolyears/active`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (academicYearResponse.ok) {
            academicYearData = await academicYearResponse.json();
            setAcademicYear(academicYearData);
            console.log('Fetched academic year:', academicYearData);
            
            // Fetch active term after academic year is set
            const schoolYearName = `${academicYearData.schoolYearStart}-${academicYearData.schoolYearEnd}`;
            const termResponse = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (termResponse.ok) {
              const terms = await termResponse.json();
              const activeTerm = terms.find((t) => t.status === "active");
              currentTermData = activeTerm || null;
              setCurrentTerm(currentTermData);
              console.log('Fetched active term:', currentTermData);
            } else {
              console.error('Error fetching terms:', termResponse.status, termResponse.statusText);
              setCurrentTerm(null);
            }
          } else {
            console.error('Error fetching academic year:', academicYearResponse.status, academicYearResponse.statusText);
            setAcademicYear(null);
          }
        } catch (fetchError) {
          console.error('Error fetching academic data:', fetchError);
          setAcademicYear(null);
          setCurrentTerm(null);
        }

        // Fetch classes
        try {
          const classesResponse = await fetch(`${API_BASE}/classes/my-classes`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (classesResponse.ok) {
            const classesData = await classesResponse.json();
            console.log('Fetched classes:', classesData);
            
            // Filter classes if we have academic year and term
            if (academicYearData && currentTermData) {
              const filtered = classesData.filter(
                (cls) =>
                  cls.isArchived !== true &&
                  cls.academicYear ===
                    `${academicYearData.schoolYearStart}-${academicYearData.schoolYearEnd}` &&
                  cls.termName === currentTermData.termName
              );
              setClasses(filtered);
              console.log('Filtered classes:', filtered);
            } else {
              setClasses(classesData);
            }
          } else {
            console.error('Error fetching classes:', classesResponse.status, classesResponse.statusText);
            setClasses([]);
          }
        } catch (classesError) {
          console.error('Error fetching classes:', classesError);
          setClasses([]);
        }

      } catch (error) {
        console.error('Error initializing data:', error);
        showModal('Error', 'Failed to load initial data. Please refresh the page.', 'error');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []); // Remove fetchQuarterStatus dependency to prevent infinite loop

  // Fetch quarter status when academic year changes (only once)
  useEffect(() => {
    if (academicYear) {
      fetchQuarterStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]); // Intentionally exclude fetchQuarterStatus to prevent infinite loop

  const fetchAssignmentsAndQuizzes = useCallback(async (selectedClassData) => {
    try {
      const token = localStorage.getItem('token');
      let assignmentsData = [];
      let quizzesData = [];

      // Fetch assignments
      const assignmentsResponse = await fetch(`${API_BASE}/assignments?classID=${selectedClassData.classID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (assignmentsResponse.ok) {
        assignmentsData = await assignmentsResponse.json();
        // Filter assignments by selected quarter (handle both Q1/Q2 and Quarter 1/Quarter 2 formats)
        assignmentsData = assignmentsData.filter(assignment => {
          const assignmentQuarter = assignment.quarter;
          const normalizedAssignmentQuarter = assignmentQuarter === 'Quarter 1' ? 'Q1' :
                                           assignmentQuarter === 'Quarter 2' ? 'Q2' :
                                           assignmentQuarter === 'Quarter 3' ? 'Q3' :
                                           assignmentQuarter === 'Quarter 4' ? 'Q4' :
                                           assignmentQuarter;
          return normalizedAssignmentQuarter === selectedQuarter;
        });
        console.log(`Assignments fetched for ${selectedQuarter}:`, assignmentsData);
        setAssignments(assignmentsData);
      } else {
        console.error('Failed to fetch assignments:', assignmentsResponse.status, assignmentsResponse.statusText);
      }

      // Fetch quizzes
      const quizzesResponse = await fetch(`${API_BASE}/api/quizzes?classID=${selectedClassData.classID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (quizzesResponse.ok) {
        quizzesData = await quizzesResponse.json();
        // Filter quizzes by selected quarter (handle both Q1/Q2 and Quarter 1/Quarter 2 formats)
        quizzesData = quizzesData.filter(quiz => {
          const quizQuarter = quiz.quarter;
          const normalizedQuizQuarter = quizQuarter === 'Quarter 1' ? 'Q1' :
                                      quizQuarter === 'Quarter 2' ? 'Q2' :
                                      quizQuarter === 'Quarter 3' ? 'Q3' :
                                      quizQuarter === 'Quarter 4' ? 'Q4' :
                                      quizQuarter;
          return normalizedQuizQuarter === selectedQuarter;
        });
        console.log(`Quizzes fetched for ${selectedQuarter}:`, quizzesData);
        setQuizzes(quizzesData);
      } else {
        console.error('Failed to fetch quizzes:', quizzesResponse.status, quizzesResponse.statusText);
      }

      // Fetch student scores using the data we already fetched
      await fetchStudentScores(assignmentsData, quizzesData);
      
    } catch (error) {
      console.error('Error fetching assignments and quizzes:', error);
    }
  }, [selectedQuarter]);

  // Auto-refresh grades every 30 seconds when a class is selected
  useEffect(() => {
    if (!selectedClass || !selectedSection) return;

    const interval = setInterval(async () => {
      const selectedClassData = classes.find(c => c._id === selectedClass);
      if (selectedClassData) {
        console.log('Auto-refreshing grades data...');
        await fetchAssignmentsAndQuizzes(selectedClassData);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [selectedClass, selectedSection, classes, selectedQuarter, fetchAssignmentsAndQuizzes]);



  const fetchSubjects = async () => {
    if (!selectedClass || !currentTerm) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Get subjects for the current term
      const response = await fetch(`${API_BASE}/api/subjects/termId/${currentTerm._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        await response.json();
        // Subjects data fetched but not stored in state since not used in current UI
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Get the class data to find the classID
      const selectedClassData = classes.find(c => c._id === selectedClass);
      if (!selectedClassData) {
        console.error('Selected class data not found');
        return;
      }
      
      const response = await fetch(`${API_BASE}/classes/${selectedClassData.classID}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const membersData = await response.json();
        // The API returns { faculty: [...], students: [...] }
        const studentsData = membersData.students || [];
        console.log('Students data:', studentsData);
        setStudents(studentsData);
        
        // Fetch assignments and quizzes after students are loaded
        await fetchAssignmentsAndQuizzes(selectedClassData);
        
        // Load saved grades after students are loaded (with a small delay to ensure everything is ready)
        setTimeout(async () => {
          await loadSavedGrades();
        }, 1000);
      } else {
        console.error('Error fetching students:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchStudentScores = async (assignmentsData = [], quizzesData = []) => {
    try {
      const token = localStorage.getItem('token');
      const assignmentScores = {};

      console.log('Processing assignments:', assignmentsData.length);
      console.log('Processing quizzes:', quizzesData.length);

      // Process assignments
      for (const assignment of assignmentsData) {
        console.log(`Processing assignment: ${assignment.title}, postAt: ${assignment.postAt}`);
        
        // Only process assignments that are posted (postAt is in the past)
        const isFuturePost = new Date(assignment.postAt) > new Date();
        console.log(`Assignment ${assignment.title}: isFuturePost=${isFuturePost}`);
        
        if (isFuturePost) {
          console.log(`Skipping assignment ${assignment.title} - postAt is in the future`);
          continue;
        }

        console.log(`Processing assignment ${assignment.title} - postAt is in the past`);
        
        try {
          const response = await fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const submissions = await response.json();
            console.log(`Assignment ${assignment._id} submissions:`, submissions);
            
            submissions.forEach(submission => {
              console.log('Assignment submission structure:', submission);
              const studentId = submission.studentId?._id || submission.studentId || submission.student?._id || submission.student;
              console.log('Extracted studentId from assignment:', studentId);
              
              if (!assignmentScores[studentId]) {
                assignmentScores[studentId] = { writtenWorks: [], performanceTasks: [] };
                console.log('Created new student entry for assignment:', studentId);
              }
              
              const scoreData = {
                score: submission.score || submission.totalScore || submission.grade || 0,
                totalScore: assignment.points || 100
              };
              console.log('Adding assignment score:', scoreData);
              
              // Categorize by activityType
              if (assignment.activityType === 'performance') {
                assignmentScores[studentId].performanceTasks.push(scoreData);
              } else {
                assignmentScores[studentId].writtenWorks.push(scoreData);
              }
            });
          } else {
            console.error(`Failed to fetch submissions for assignment ${assignment._id}:`, response.status);
          }
        } catch (error) {
          console.error(`Failed to fetch submissions for assignment ${assignment._id}:`, error);
        }
      }

      // Process quizzes
      for (const quiz of quizzesData) {
        console.log(`Processing quiz: ${quiz.title}, postAt: ${quiz.postAt}`);
        
        // Only process quizzes that are posted (postAt is in the past)
        const isFuturePost = new Date(quiz.postAt) > new Date();
        console.log(`Quiz ${quiz.title}: isFuturePost=${isFuturePost}`);
        
        if (isFuturePost) {
          console.log(`Skipping quiz ${quiz.title} - postAt is in the future`);
          continue;
        }

        console.log(`Processing quiz ${quiz.title} - postAt is in the past`);
        
        try {
          const response = await fetch(`${API_BASE}/api/quizzes/${quiz._id}/responses`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const responses = await response.json();
            console.log(`Quiz ${quiz._id} responses:`, responses);
            
            responses.forEach(quizResponse => {
              console.log('Quiz response structure:', quizResponse);
              const studentId = quizResponse.studentId?._id || quizResponse.studentId || quizResponse.student?._id || quizResponse.student;
              console.log('Extracted studentId from quiz:', studentId);
              
              if (!assignmentScores[studentId]) {
                assignmentScores[studentId] = { writtenWorks: [], performanceTasks: [] };
                console.log('Created new student entry for quiz:', studentId);
              }
              
              const scoreData = {
                score: quizResponse.score || quizResponse.totalScore || quizResponse.grade || 0,
                totalScore: quiz.points || 100
              };
              console.log('Adding quiz score:', scoreData);
              
              // Categorize by activityType
              if (quiz.activityType === 'performance') {
                assignmentScores[studentId].performanceTasks.push(scoreData);
              } else {
                assignmentScores[studentId].writtenWorks.push(scoreData);
              }
            });
          } else {
            console.error(`Failed to fetch responses for quiz ${quiz._id}:`, response.status);
          }
        } catch (error) {
          console.error(`Failed to fetch responses for quiz ${quiz._id}:`, error);
        }
      }

      console.log('Final student scores object:', assignmentScores);
      console.log('Student scores keys:', Object.keys(assignmentScores));
      console.log('Total students with scores:', Object.keys(assignmentScores).length);
      
      if (Object.keys(assignmentScores).length === 0) {
        console.log('⚠️ No student scores found! This could mean:');
        console.log('1. All assignments/quizzes are still "upcoming" (not posted yet)');
        console.log('2. No students have submitted responses yet');
        console.log('3. The assignment/quiz IDs are incorrect');
      }

      setStudentScores(assignmentScores);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching student scores:', error);
    }
  };

  const calculateRawScoresAndHPS = (studentId) => {
    const studentScore = studentScores[studentId];
    if (!studentScore) {
      return {
        writtenWorksRAW: 0,
        writtenWorksHPS: 0,
        performanceTasksRAW: 0,
        performanceTasksHPS: 0
      };
    }

    // Calculate RAW scores for this student
    const writtenWorksRAW = studentScore.writtenWorks.reduce((sum, activity) => sum + activity.score, 0);
    const performanceTasksRAW = studentScore.performanceTasks.reduce((sum, activity) => sum + activity.score, 0);

    // Calculate HPS from all activities (should be the same for all students)
    // Written Works: assignments and quizzes with activityType === 'written'
    const writtenWorksHPS = [...assignments, ...quizzes]
      .filter(activity => {
        const isFuturePost = new Date(activity.postAt) > new Date();
        return !isFuturePost && activity.activityType === 'written';
      })
      .reduce((sum, activity) => sum + (activity.points || 100), 0);

    // Performance Tasks: assignments and quizzes with activityType === 'performance'
    const performanceTasksHPS = [...assignments, ...quizzes]
      .filter(activity => {
        const isFuturePost = new Date(activity.postAt) > new Date();
        return !isFuturePost && activity.activityType === 'performance';
      })
      .reduce((sum, activity) => sum + (activity.points || 100), 0);

    return {
      writtenWorksRAW,
      writtenWorksHPS,
      performanceTasksRAW,
      performanceTasksHPS
    };
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setSelectedSection(null);
    setStudents([]);
    
    
    if (classId) {
      fetchSubjects();
    }
  };

  const handleSectionChange = (e) => {
    const section = e.target.value;
    setSelectedSection(section);
    setStudents([]);
    setGrades({});
    
    if (section) {
      fetchStudents();
    }
  };

  // Set default quarter based on term
  useEffect(() => {
    if (currentTerm?.termName === 'Term 1') {
      setSelectedQuarter('Q1');
    } else if (currentTerm?.termName === 'Term 2') {
      setSelectedQuarter('Q3');
    }
  }, [currentTerm]);

  const loadQuarterData = useCallback(() => {
    // Load the data for the selected quarter
    const quarterKey = `${selectedClass}_${selectedSection}_${selectedQuarter}`;
    const savedData = quarterData[quarterKey] || {};
    setGrades(savedData);
  }, [selectedClass, selectedSection, selectedQuarter, quarterData]);

  const loadQuarterlyGradesFromDatabase = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const selectedClassData = classes.find(c => c._id === selectedClass);
      
      if (!selectedClassData) return;
      
      const response = await fetch(`${API_BASE}/api/grades/load-quarterly?classId=${selectedClassData.classID}&section=${selectedSection}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          const loadedQuarterlyGrades = {};
          result.data.forEach(grade => {
            if (!loadedQuarterlyGrades[grade.studentId]) {
              loadedQuarterlyGrades[grade.studentId] = {};
            }
            loadedQuarterlyGrades[grade.studentId][grade.quarter] = grade.quarterlyGrade;
          });
          
          setQuarterlyGrades(loadedQuarterlyGrades);
          
          const updatedGrades = { ...grades };
          result.data.forEach(grade => {
            if (grade.quarter === selectedQuarter) {
              if (!updatedGrades[grade.studentId]) {
                updatedGrades[grade.studentId] = {};
              }
              if (!updatedGrades[grade.studentId].quarterlyExam) {
                updatedGrades[grade.studentId].quarterlyExam = grade.quarterlyGrade.toString();
              }
            }
          });
          setGrades(updatedGrades);
          console.log('✅ Updated grades state with quarterly exam scores:', updatedGrades);
        } else {
          console.log('⚠️ No quarterly grades found in database');
        }
      } else {
        console.error('❌ Failed to load quarterly grades:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading quarterly grades from database:', error);
    }
  }, [selectedClass, selectedSection, selectedQuarter, classes, grades]);

  const loadSavedGrades = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;

    try {
      const token = localStorage.getItem('token');
      const selectedClassData = classes.find(c => c._id === selectedClass);
      
      if (!selectedClassData) return;

      const response = await fetch(`${API_BASE}/api/grades/load?classId=${selectedClassData.classID}&section=${selectedSection}&quarter=${selectedQuarter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const savedGradesData = await response.json();
        
        if (savedGradesData.success && savedGradesData.data && savedGradesData.data.grades) {
          const loadedGrades = {};
          savedGradesData.data.grades.forEach(grade => {
            loadedGrades[grade.studentId] = {
              quarterlyExam: grade.quarterlyExam || ''
            };
          });
          setGrades(loadedGrades);
        }
      }
    } catch (error) {
      console.error('Error loading saved grades:', error);
    }
  }, [selectedClass, selectedSection, selectedQuarter, classes]);

  // Load quarter-specific data when quarter changes
  useEffect(() => {
    if (selectedClass && selectedSection && selectedQuarter) {
      loadQuarterData();
    }
  }, [selectedQuarter, selectedClass, selectedSection, loadQuarterData]);

  // Load saved grades when class and section are selected
  useEffect(() => {
    if (selectedClass && selectedSection && students.length > 0) {
      loadSavedGrades();
      loadQuarterlyGradesFromDatabase();
    }
  }, [selectedClass, selectedSection, students, selectedQuarter, loadSavedGrades, loadQuarterlyGradesFromDatabase]);

  const saveQuarterData = () => {
    // Save the current grades data for the selected quarter
    const quarterKey = `${selectedClass}_${selectedSection}_${selectedQuarter}`;
    setQuarterData(prev => ({
      ...prev,
      [quarterKey]: grades
    }));
  };

  const handleGradeChange = (studentId, gradeType, value) => {
    // Allow quarterly exam scores up to 100, but cap other grades at 99 (San Juan grading system)
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      if (gradeType === 'quarterlyExam') {
        // Strictly cap quarterly exam scores at 100
        if (numericValue > 100) {
          value = '100';
        } else if (numericValue < 0) {
          value = '0';
        }
      } else {
        // Cap other grades at 99
        if (numericValue > 99) {
          value = '99';
        } else if (numericValue < 0) {
          value = '0';
        }
      }
    }
    
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [gradeType]: value
      }
    }));
  };

  const handleQuarterlyGradeChange = (studentId, quarter, value) => {
    setQuarterlyGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [quarter]: value
      }
    }));
  };

  const saveQuarterlyGrade = async (studentId) => {
    const studentGrade = grades[studentId];
    if (studentGrade && studentGrade.quarterlyExam) {
      const quarterlyScore = parseFloat(studentGrade.quarterlyExam);
      if (quarterlyScore > 0) {
        const selectedClassData = classes.find(c => c._id === selectedClass);
        const finalGrade = calculateFinalGrade(studentId, selectedClassData?.className, quarterlyScore);
        
        // Save the quarterly grade for this quarter
        handleQuarterlyGradeChange(studentId, selectedQuarter, finalGrade);
        console.log(`✅ Saved quarterly grade for student ${studentId}: ${finalGrade} for ${selectedQuarter}`);
        
        // Save to database
        await saveQuarterlyGradeToDatabase(studentId, finalGrade);
      }
    }
  };

  const saveQuarterlyGradeToDatabase = async (studentId, finalGrade) => {
    try {
      const token = localStorage.getItem('token');
      const selectedClassData = classes.find(c => c._id === selectedClass);
      
      const response = await fetch(`${API_BASE}/api/grades/save-quarterly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          classId: selectedClassData.classID,
          section: selectedSection,
          quarter: selectedQuarter,
          studentId: studentId,
          quarterlyGrade: finalGrade,
          academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : null,
          termName: currentTerm?.termName || null
        })
      });

      if (response.ok) {
        console.log(`✅ Quarterly grade saved to database for student ${studentId}: ${finalGrade}`);
      } else {
        console.error('❌ Failed to save quarterly grade to database');
      }
    } catch (error) {
      console.error('❌ Error saving quarterly grade to database:', error);
    }
  };

  const postQuarterlyGradesToStudents = async (quarter) => {
    if (!selectedClass || !selectedSection) {
      showModal('Error', 'Please select a class and section first', 'error');
      return;
    }

    // Check if grades have already been posted for this quarter
    const alreadyPosted = await checkIfGradesPosted(quarter);
    if (alreadyPosted) {
      // Show confirmation dialog
      setConfirmRepost({
        isOpen: true,
        quarter: quarter,
        callback: () => executePostGrades(quarter)
      });
      return;
    }

    // If not posted before, proceed directly
    await executePostGrades(quarter);
  };

  const executePostGrades = async (quarter) => {
    try {
      setPosting(true);
      const token = localStorage.getItem('token');
      const selectedClassData = classes.find(c => c._id === selectedClass);
      
      if (!selectedClassData) {
        showModal('Error', 'Class data not found', 'error');
        return;
      }

      // Prepare quarterly grades data for posting
      const gradesData = {
        classId: selectedClassData.classID,
        className: selectedClassData.className,
        section: selectedSection,
        academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : null,
        termName: currentTerm?.termName || null,
        quarter: quarter,
        grades: students.map(student => {
          const quarterlyGrade = quarterlyGrades[student._id]?.[quarter];
          const termFinalGrade = (() => {
            // For Term 1: Q2 calculates term final from Q1 + Q2
            if (quarter === 'Q2' && currentTerm?.termName === 'Term 1') {
              const q1Grade = quarterlyGrades[student._id]?.Q1;
              const q2Grade = quarterlyGrades[student._id]?.Q2;
              if (q1Grade && q2Grade) {
                const q1 = parseFloat(q1Grade);
                const q2 = parseFloat(q2Grade);
                const semesterFinal = (q1 + q2) / 2;
                return Math.round(semesterFinal * 100) / 100;
              }
            }
            // For Term 2: Q4 calculates term final from Q3 + Q4
            if (quarter === 'Q4' && currentTerm?.termName === 'Term 2') {
              const q3Grade = quarterlyGrades[student._id]?.Q3;
              const q4Grade = quarterlyGrades[student._id]?.Q4;
              if (q3Grade && q4Grade) {
                const q3 = parseFloat(q3Grade);
                const q4 = parseFloat(q4Grade);
                const semesterFinal = (q3 + q4) / 2;
                return Math.round(semesterFinal * 100) / 100;
              }
            }
            return null;
          })();
          
          return {
            studentId: student._id,
            studentName: `${student.lastname}, ${student.firstname} ${student.middlename || ''}`,
            schoolID: student.schoolID || student.userID || student._id,
            quarterlyGrade: quarterlyGrade || 0,
            termFinalGrade: termFinalGrade,
            remarks: termFinalGrade ? (termFinalGrade >= 75 ? 'PASSED' : 'REPEAT') : null,
            trackInfo: getSubjectTrackAndPercentages(selectedClassData.className),
            postedAt: new Date().toISOString()
          };
        }),
        postedAt: new Date().toISOString()
      };

      // Post grades to students
      const response = await fetch(`${API_BASE}/api/grades/post-quarterly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gradesData)
      });

      if (response.ok) {
        const _postResponse = await response.json();
        console.log(`✅ ${quarter} grades posted to students successfully`);
        const message = (quarter === 'Q2' && currentTerm?.termName === 'Term 1') || (quarter === 'Q4' && currentTerm?.termName === 'Term 2')
          ? `${quarter} grades and Term Final Grade posted to students! Students can now view their grades.`
          : `${quarter} grades posted to students! Students can now view their grades.`;
        showModal('Success', message, 'success');
      } else {
        const errorData = await response.json();
        showModal('Error', errorData.message || 'Failed to post grades to students', 'error');
      }
    } catch (error) {
      console.error('❌ Error posting grades to students:', error);
      showModal('Error', 'Failed to post grades to students. Please try again.', 'error');
    } finally {
      setPosting(false);
    }
  };

  const saveGrades = async () => {
    if (!selectedClass || !selectedSection) {
      showModal('Error', 'Please select a class and section first', 'error');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const selectedClassData = classes.find(c => c._id === selectedClass);
      
      if (!selectedClassData) {
        showModal('Error', 'Class data not found', 'error');
        return;
      }

      // Save current quarter data before saving to backend
      saveQuarterData();

      // Prepare grades data for saving
      const gradesData = {
        classId: selectedClassData.classID,
        className: selectedClassData.className,
        section: selectedSection,
        academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : null,
        termName: currentTerm?.termName || null,
        quarter: selectedQuarter, // Use the selected quarter
        grades: Object.keys(grades).map(studentId => {
          const student = students.find(s => s._id === studentId);
          const studentGrade = grades[studentId];
          const scores = calculateRawScoresAndHPS(studentId);
          
          return {
            studentId: studentId,
            studentName: student ? `${student.lastname}, ${student.firstname} ${student.middlename || ''}`.trim() : '',
            schoolID: student?.schoolID || '',
            writtenWorksRAW: scores.writtenWorksRAW,
            writtenWorksHPS: scores.writtenWorksHPS,
            writtenWorksPS: scores.writtenWorksHPS > 0 ? (scores.writtenWorksRAW / scores.writtenWorksHPS) * 100 : 0,
            writtenWorksWS: (() => {
              const trackInfo = getSubjectTrackAndPercentages(selectedClassData.className);
              const ps = scores.writtenWorksHPS > 0 ? (scores.writtenWorksRAW / scores.writtenWorksHPS) * 100 : 0;
              return ps * trackInfo.percentages.written / 100;
            })(),
            performanceTasksRAW: scores.performanceTasksRAW,
            performanceTasksHPS: scores.performanceTasksHPS,
            performanceTasksPS: scores.performanceTasksHPS > 0 ? (scores.performanceTasksRAW / scores.performanceTasksHPS) * 100 : 0,
            performanceTasksWS: (() => {
              const trackInfo = getSubjectTrackAndPercentages(selectedClassData.className);
              const ps = scores.performanceTasksHPS > 0 ? (scores.performanceTasksRAW / scores.performanceTasksHPS) * 100 : 0;
              return ps * trackInfo.percentages.performance / 100;
            })(),
            quarterlyExam: parseFloat(studentGrade?.quarterlyExam) || 0,
            initialGrade: (() => {
              const trackInfo = getSubjectTrackAndPercentages(selectedClassData.className);
              const writtenPS = scores.writtenWorksHPS > 0 ? (scores.writtenWorksRAW / scores.writtenWorksHPS) * 100 : 0;
              const writtenWS = writtenPS * trackInfo.percentages.written / 100;
              const performancePS = scores.performanceTasksHPS > 0 ? (scores.performanceTasksRAW / scores.performanceTasksHPS) * 100 : 0;
              const performanceWS = performancePS * trackInfo.percentages.performance / 100;
              return writtenWS + performanceWS;
            })(),
            finalGrade: (() => {
              const quarterlyScore = parseFloat(studentGrade?.quarterlyExam) || 0;
              if (quarterlyScore > 0) {
                return calculateFinalGrade(studentId, selectedClassData.className, quarterlyScore);
              }
              return 0;
            })(),
            trackInfo: getSubjectTrackAndPercentages(selectedClassData.className)
          };
        }),
        savedAt: new Date().toISOString()
      };

      // Save to database
      const response = await fetch(`${API_BASE}/api/grades/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gradesData)
      });

      if (response.ok) {
        const _saveResponse = await response.json();
        console.log('✅ Grades saved successfully');
        showModal('Success', 'Grades saved successfully!', 'success');
      } else {
        const errorData = await response.json();
        showModal('Error', errorData.message || 'Failed to save grades', 'error');
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      showModal('Error', 'Failed to save grades. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };


  // Function to determine track and percentages based on subject
  const getSubjectTrackAndPercentages = (className) => {
    const subjectName = className?.toLowerCase() || '';
    
    // Check if it's a research, work immersion, performance, or exhibit subject
    const isSpecialSubject = subjectName.includes('research') || 
                           subjectName.includes('work immersion') || 
                           subjectName.includes('performance') || 
                           subjectName.includes('exhibit') ||
                           subjectName.includes('practicum');
    
    // Check if it's TVL/Arts & Design/Sports track
    const isTVLTrack = subjectName.includes('tvl') || 
                      subjectName.includes('arts') || 
                      subjectName.includes('design') || 
                      subjectName.includes('sports') ||
                      subjectName.includes('culinary') ||
                      subjectName.includes('automotive') ||
                      subjectName.includes('electronics') ||
                      subjectName.includes('welding') ||
                      subjectName.includes('drafting');
    
    if (isTVLTrack) {
      if (isSpecialSubject) {
        return {
          track: 'TVL/Arts & Design/Sports - Special',
          percentages: {
            quarterly: 20,
            performance: 60,
            written: 20
          }
        };
      } else {
        return {
          track: 'TVL/Arts & Design/Sports - Regular',
          percentages: {
            quarterly: 25,
            performance: 40,
            written: 35
          }
        };
      }
    } else {
      // Academic Track
      if (isSpecialSubject) {
        return {
          track: 'Academic - Special',
          percentages: {
            quarterly: 30,
            performance: 45,
            written: 25
          }
        };
      } else {
        return {
          track: 'Academic - Regular',
          percentages: {
            quarterly: 25,
            performance: 50,
            written: 25
          }
        };
      }
    }
  };

  // Function to calculate final grade based on automatic RAW scores and HPS
  // Grade transmutation function based on DepEd rules
  const transmuteGrade = (initialGrade) => {
    const grade = parseFloat(initialGrade);
    
    // Cap maximum grade at 99 (San Juan grading system)
    if (grade >= 100) return 99;
    if (grade >= 98.40 && grade <= 99.99) return 99;
    if (grade >= 96.80 && grade <= 98.39) return 98;
    if (grade >= 95.20 && grade <= 96.79) return 97;
    if (grade >= 93.60 && grade <= 95.19) return 96;
    if (grade >= 92.00 && grade <= 93.59) return 95;
    if (grade >= 90.40 && grade <= 91.99) return 94;
    if (grade >= 88.80 && grade <= 90.39) return 93;
    if (grade >= 87.20 && grade <= 88.79) return 92;
    if (grade >= 85.60 && grade <= 87.19) return 91;
    if (grade >= 84.00 && grade <= 85.59) return 90;
    if (grade >= 82.40 && grade <= 83.99) return 89;
    if (grade >= 80.80 && grade <= 82.39) return 88;
    if (grade >= 79.20 && grade <= 80.79) return 87;
    if (grade >= 77.60 && grade <= 79.19) return 86;
    if (grade >= 76.00 && grade <= 77.59) return 85;
    if (grade >= 74.40 && grade <= 75.99) return 84;
    if (grade >= 72.80 && grade <= 74.39) return 83;
    if (grade >= 71.20 && grade <= 72.79) return 82;
    if (grade >= 69.60 && grade <= 71.19) return 81;
    if (grade >= 68.00 && grade <= 69.59) return 80;
    if (grade >= 66.40 && grade <= 67.99) return 79;
    if (grade >= 64.80 && grade <= 66.39) return 78;
    if (grade >= 63.20 && grade <= 64.79) return 77;
    if (grade >= 61.60 && grade <= 63.19) return 76;
    if (grade >= 60.00 && grade <= 61.59) return 75;
    if (grade >= 58.40 && grade <= 59.99) return 74;
    if (grade >= 56.80 && grade <= 58.39) return 73;
    if (grade >= 55.20 && grade <= 56.79) return 72;
    if (grade >= 53.60 && grade <= 55.19) return 71;
    if (grade >= 52.00 && grade <= 53.59) return 70;
    if (grade >= 50.40 && grade <= 51.99) return 69;
    if (grade >= 48.80 && grade <= 50.39) return 68;
    if (grade >= 47.20 && grade <= 48.79) return 67;
    if (grade >= 45.60 && grade <= 47.19) return 66;
    if (grade >= 44.00 && grade <= 45.59) return 65;
    if (grade >= 42.40 && grade <= 43.99) return 64;
    if (grade >= 40.80 && grade <= 42.39) return 63;
    if (grade >= 39.20 && grade <= 40.79) return 62;
    if (grade >= 37.60 && grade <= 39.19) return 61;
    if (grade >= 0 && grade <= 37.59) return 60; // Minimum grade is 60
    
    return 60; // Default minimum
  };

  const calculateFinalGrade = (studentId, className, quarterlyScore = 0) => {
    const trackInfo = getSubjectTrackAndPercentages(className);
    const { quarterly } = trackInfo.percentages;
    const scores = calculateRawScoresAndHPS(studentId);
    
    const writtenPS = scores.writtenWorksHPS > 0 ? (scores.writtenWorksRAW / scores.writtenWorksHPS) * 100 : 0;
    const writtenWS = writtenPS * trackInfo.percentages.written / 100;
    
    const performancePS = scores.performanceTasksHPS > 0 ? (scores.performanceTasksRAW / scores.performanceTasksHPS) * 100 : 0;
    const performanceWS = performancePS * trackInfo.percentages.performance / 100;
    
    const initialGrade = writtenWS + performanceWS;
    const rawFinalGrade = initialGrade + (quarterlyScore * quarterly / 100);
    
    // Apply transmutation table - minimum grade is 60
    const transmutedGrade = transmuteGrade(rawFinalGrade);
    
    return transmutedGrade;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Faculty_Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no data is loaded
  if (!academicYear || !currentTerm) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Faculty_Navbar />
        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Unable to Load Grades</h3>
              <p className="text-gray-600 mb-4">
                {!academicYear ? 'Academic year not found' : 'Active term not found'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr md:ml-64">
      <Faculty_Navbar />
      
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Grades</h2>
            <p className="text-base md:text-lg">
              {academicYear
                ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`
                : "Loading..."}{" "}
              | {currentTerm ? currentTerm.termName : "No active term"} |{" "}
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ProfileMenu />
          </div>
        </div>

        {/* Selection Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Select Class and Section</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class
              </label>
              <select
                value={selectedClass || ''}
                onChange={handleClassChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.className}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section
              </label>
              <select
                value={selectedSection || ''}
                onChange={handleSectionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedClass}
              >
                <option value="">Select Section</option>
                {selectedClass && classes.find(c => c._id === selectedClass)?.section && (
                  <option value={classes.find(c => c._id === selectedClass).section}>
                    {classes.find(c => c._id === selectedClass).section}
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quarter
              </label>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedClass || !selectedSection}
              >
                {currentTerm?.termName === 'Term 1' ? (
                  <>
                    <option value="Q1">Quarter 1</option>
                    <option value="Q2">Quarter 2</option>
                  </>
                ) : currentTerm?.termName === 'Term 2' ? (
                  <>
                    <option value="Q3">Quarter 3</option>
                    <option value="Q4">Quarter 4</option>
                  </>
                ) : (
                  <>
                    <option value="Q1">Quarter 1</option>
                    <option value="Q2">Quarter 2</option>
                    <option value="Q3">Quarter 3</option>
                    <option value="Q4">Quarter 4</option>
                  </>
                )}
              </select>
            </div>
          </div>
          
          {selectedClass && selectedSection && (
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={async () => {
                  const selectedClassData = classes.find(c => c._id === selectedClass);
                  if (selectedClassData) {
                    await fetchAssignmentsAndQuizzes(selectedClassData);
                    await fetchQuarterStatus(); // Also refresh quarter status
                    showModal('Success', 'System data and quarter status refreshed successfully!', 'success');
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                🔄 Refresh System Data
              </button>
              {lastUpdated && (
                <div className="text-sm text-gray-600">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grades Table */}
        {selectedClass && selectedSection && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Class Information Header */}
            <div className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Track:</span> {(() => {
                    const selectedClassData = classes.find(c => c._id === selectedClass);
                    const trackInfo = getSubjectTrackAndPercentages(selectedClassData?.className);
                    return trackInfo.track;
                  })()}
                </div>
                <div>
                  <span className="font-semibold">Semester:</span> {currentTerm?.termName || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">School Year:</span> {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Subject Code:</span> {classes.find(c => c._id === selectedClass)?.classCode || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Class Code:</span> {classes.find(c => c._id === selectedClass)?.classCode || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Quarter:</span> {selectedQuarter}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Grades for {classes.find(c => c._id === selectedClass)?.className} - {selectedSection} ({selectedQuarter})
              </h2>
              <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log(' Calculating final grades for', selectedQuarter);
                  let savedCount = 0;
                  students.forEach(student => {
                    if (grades[student._id]?.quarterlyExam) {
                      saveQuarterlyGrade(student._id);
                      savedCount++;
                    }
                  });
                  console.log(`Calculated final grades for ${savedCount} students`);
                  showModal('Success', `Final grades calculated and saved for ${savedCount} students in ${selectedQuarter}!`, 'success');
                }}
                className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Transfer Quarterly Grades to Grade Management
              </button>
                <button
                  onClick={saveGrades}
                  disabled={saving || Object.keys(grades).length === 0}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Grades'}
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading students...</p>
              </div>
            ) : students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Student No.</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-semibold">STUDENT'S NAME</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold" colSpan="4">
                        WRITTEN WORKS {(() => {
                          const selectedClassData = classes.find(c => c._id === selectedClass);
                          const trackInfo = getSubjectTrackAndPercentages(selectedClassData?.className);
                          return trackInfo.percentages.written;
                        })()}%
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold" colSpan="4">
                        PERFORMANCE TASKS {(() => {
                          const selectedClassData = classes.find(c => c._id === selectedClass);
                          const trackInfo = getSubjectTrackAndPercentages(selectedClassData?.className);
                          return trackInfo.percentages.performance;
                        })()}%
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">
                        QUARTERLY EXAM {(() => {
                          const selectedClassData = classes.find(c => c._id === selectedClass);
                          const trackInfo = getSubjectTrackAndPercentages(selectedClassData?.className);
                          return trackInfo.percentages.quarterly;
                        })()}%
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">QUARTERLY GRADE</th>
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-2 py-2"></th>
                      <th className="border border-gray-300 px-2 py-2"></th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">HPS</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">RAW</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">PS</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">WS</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">HPS</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">RAW</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">PS</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">WS</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">SCORE</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">INITIAL</th>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">QUARTERLY GRADE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-2 py-2">{student.schoolID}</td>
                        <td className="border border-gray-300 px-2 py-2">
                          {student.lastname}, {student.firstname} {student.middlename || ''}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-blue-50">
                          {(() => {
                            const scores = calculateRawScoresAndHPS(student._id);
                            return scores.writtenWorksHPS;
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-blue-50">
                          {(() => {
                            const scores = calculateRawScoresAndHPS(student._id);
                            return scores.writtenWorksRAW;
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                          {(() => {
                            const scores = calculateRawScoresAndHPS(student._id);
                            if (scores.writtenWorksHPS > 0) {
                              return Math.round((scores.writtenWorksRAW / scores.writtenWorksHPS) * 100 * 100) / 100;
                            }
                            return '';
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                          {(() => {
                            const selectedClassData = classes.find(c => c._id === selectedClass);
                            const trackInfo = getSubjectTrackAndPercentages(selectedClassData?.className);
                            const scores = calculateRawScoresAndHPS(student._id);
                            if (scores.writtenWorksHPS > 0) {
                              const ps = (scores.writtenWorksRAW / scores.writtenWorksHPS) * 100;
                              const ws = ps * trackInfo.percentages.written / 100;
                              return Math.round(ws * 100) / 100;
                            }
                            return '';
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-purple-50">
                          {(() => {
                            const scores = calculateRawScoresAndHPS(student._id);
                            return scores.performanceTasksHPS;
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-purple-50">
                          {(() => {
                            const scores = calculateRawScoresAndHPS(student._id);
                            return scores.performanceTasksRAW;
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                          {(() => {
                            const scores = calculateRawScoresAndHPS(student._id);
                            if (scores.performanceTasksHPS > 0) {
                              return Math.round((scores.performanceTasksRAW / scores.performanceTasksHPS) * 100 * 100) / 100;
                            }
                            return '';
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                          {(() => {
                            const selectedClassData = classes.find(c => c._id === selectedClass);
                            const trackInfo = getSubjectTrackAndPercentages(selectedClassData?.className);
                            const scores = calculateRawScoresAndHPS(student._id);
                            if (scores.performanceTasksHPS > 0) {
                              const ps = (scores.performanceTasksRAW / scores.performanceTasksHPS) * 100;
                              const ws = ps * trackInfo.percentages.performance / 100;
                              return Math.round(ws * 100) / 100;
                            }
                            return '';
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={grades[student._id]?.quarterlyExam || ''}
                            onChange={(e) => handleGradeChange(student._id, 'quarterlyExam', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                          {(() => {
                            const selectedClassData = classes.find(c => c._id === selectedClass);
                            const trackInfo = getSubjectTrackAndPercentages(selectedClassData?.className);
                            const scores = calculateRawScoresAndHPS(student._id);
                            
                            if (scores.writtenWorksHPS > 0 && scores.performanceTasksHPS > 0) {
                              const writtenPS = (scores.writtenWorksRAW / scores.writtenWorksHPS) * 100;
                              const writtenWS = writtenPS * trackInfo.percentages.written / 100;
                              
                              const performancePS = (scores.performanceTasksRAW / scores.performanceTasksHPS) * 100;
                              const performanceWS = performancePS * trackInfo.percentages.performance / 100;
                              
                              const initialGrade = writtenWS + performanceWS;
                              return Math.round(initialGrade * 100) / 100;
                            }
                            return '';
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                          {(() => {
                            const selectedClassData = classes.find(c => c._id === selectedClass);
                            const studentGrade = grades[student._id];
                            const quarterlyScore = parseFloat(studentGrade?.quarterlyExam) || 0;
                            if (selectedClassData && quarterlyScore > 0) {
                              const finalGrade = calculateFinalGrade(student._id, selectedClassData.className, quarterlyScore);
                              return finalGrade > 0 ? finalGrade : '';
                            }
                            return '';
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                <p>No students found for this class and section.</p>
              </div>
            )}
          </div>
        )}

        {/* Grade Management - Quarter Summary */}
        {selectedClass && selectedSection && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-700">Grade Management</h2>
                <div className="text-sm text-gray-600 mt-1">
                  Quarter Status: 
                  {currentTerm?.termName === 'Term 1' ? (
                    <>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        quarterStatus['Q1'] === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Q1: {quarterStatus['Q1'] || 'Loading...'}
                      </span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        quarterStatus['Q2'] === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Q2: {quarterStatus['Q2'] || 'Loading...'}
                      </span>
                    </>
                  ) : currentTerm?.termName === 'Term 2' ? (
                    <>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        quarterStatus['Q3'] === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Q3: {quarterStatus['Q3'] || 'Loading...'}
                      </span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        quarterStatus['Q4'] === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Q4: {quarterStatus['Q4'] || 'Loading...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        quarterStatus['Q1'] === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Q1: {quarterStatus['Q1'] || 'Loading...'}
                      </span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        quarterStatus['Q2'] === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Q2: {quarterStatus['Q2'] || 'Loading...'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {currentTerm?.termName === 'Term 1' ? (
                  <>
                    <button
                      onClick={() => postQuarterlyGradesToStudents('Q1')}
                      disabled={posting || !quarterlyGrades || Object.keys(quarterlyGrades).length === 0 || quarterStatus['Q1'] !== 'active'}
                      className={`px-4 py-2 rounded transition-colors ${
                        quarterStatus['Q1'] === 'active' 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                      title={quarterStatus['Q1'] !== 'active' ? 'Q1 is inactive - cannot post grades' : 'Post Q1 grades to students'}
                    >
                      {posting ? 'Posting...' : '📤 Post Q1 Grades'}
                    </button>
                    <button
                      onClick={() => postQuarterlyGradesToStudents('Q2')}
                      disabled={posting || !quarterlyGrades || Object.keys(quarterlyGrades).length === 0 || quarterStatus['Q2'] !== 'active'}
                      className={`px-4 py-2 rounded transition-colors ${
                        quarterStatus['Q2'] === 'active' 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                      title={quarterStatus['Q2'] !== 'active' ? 'Q2 is inactive - cannot post grades' : 'Post Q2 grades + Term Final to students'}
                    >
                      {posting ? 'Posting...' : '📤 Post Q2 Grades + Term Final'}
                    </button>
                  </>
                ) : currentTerm?.termName === 'Term 2' ? (
                  <>
                    <button
                      onClick={() => postQuarterlyGradesToStudents('Q3')}
                      disabled={posting || !quarterlyGrades || Object.keys(quarterlyGrades).length === 0 || quarterStatus['Q3'] !== 'active'}
                      className={`px-4 py-2 rounded transition-colors ${
                        quarterStatus['Q3'] === 'active' 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                      title={quarterStatus['Q3'] !== 'active' ? 'Q3 is inactive - cannot post grades' : 'Post Q3 grades to students'}
                    >
                      {posting ? 'Posting...' : '📤 Post Q3 Grades'}
                    </button>
                    <button
                      onClick={() => postQuarterlyGradesToStudents('Q4')}
                      disabled={posting || !quarterlyGrades || Object.keys(quarterlyGrades).length === 0 || quarterStatus['Q4'] !== 'active'}
                      className={`px-4 py-2 rounded transition-colors ${
                        quarterStatus['Q4'] === 'active' 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                      title={quarterStatus['Q4'] !== 'active' ? 'Q4 is inactive - cannot post grades' : 'Post Q4 grades + Term Final to students'}
                    >
                      {posting ? 'Posting...' : '📤 Post Q4 Grades + Term Final'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => postQuarterlyGradesToStudents('Q1')}
                      disabled={posting || !quarterlyGrades || Object.keys(quarterlyGrades).length === 0 || quarterStatus['Q1'] !== 'active'}
                      className={`px-4 py-2 rounded transition-colors ${
                        quarterStatus['Q1'] === 'active' 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                      title={quarterStatus['Q1'] !== 'active' ? 'Q1 is inactive - cannot post grades' : 'Post Q1 grades to students'}
                    >
                      {posting ? 'Posting...' : '📤 Post Q1 Grades'}
                    </button>
                    <button
                      onClick={() => postQuarterlyGradesToStudents('Q2')}
                      disabled={posting || !quarterlyGrades || Object.keys(quarterlyGrades).length === 0 || quarterStatus['Q2'] !== 'active'}
                      className={`px-4 py-2 rounded transition-colors ${
                        quarterStatus['Q2'] === 'active' 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                      title={quarterStatus['Q2'] !== 'active' ? 'Q2 is inactive - cannot post grades' : 'Post Q2 grades + Term Final to students'}
                    >
                      {posting ? 'Posting...' : '📤 Post Q2 Grades + Term Final'}
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Student ID</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Students</th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold" colSpan="2">Quarter</th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold">Term Final Grade</th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold">Remarks</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-2"></th>
                    <th className="border border-gray-300 px-2 py-2"></th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold">
                      {currentTerm?.termName === 'Term 1' ? '1' : '3'}
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold">
                      {currentTerm?.termName === 'Term 1' ? '2' : '4'}
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold"></th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-2">{student.schoolID}</td>
                      <td className="border border-gray-300 px-2 py-2">
                        {student.lastname}, {student.firstname} {student.middlename || ''}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        {(() => {
                          const quarterKey = currentTerm?.termName === 'Term 1' ? 'Q1' : 'Q3';
                          const quarterlyGrade = quarterlyGrades[student._id]?.[quarterKey];
                          return quarterlyGrade ? quarterlyGrade : '-';
                        })()}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        {(() => {
                          const quarterKey = currentTerm?.termName === 'Term 1' ? 'Q2' : 'Q4';
                          const quarterlyGrade = quarterlyGrades[student._id]?.[quarterKey];
                          return quarterlyGrade ? quarterlyGrade : '-';
                        })()}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                        {(() => {
                          const firstQuarter = currentTerm?.termName === 'Term 1' ? 'Q1' : 'Q3';
                          const secondQuarter = currentTerm?.termName === 'Term 1' ? 'Q2' : 'Q4';
                          const firstGrade = quarterlyGrades[student._id]?.[firstQuarter];
                          const secondGrade = quarterlyGrades[student._id]?.[secondQuarter];
                          if (firstGrade && secondGrade) {
                            const q1 = parseFloat(firstGrade);
                            const q2 = parseFloat(secondGrade);
                            const semesterFinal = (q1 + q2) / 2;
                            // Don't apply transmutation again - grades are already transmuted
                            return Math.round(semesterFinal * 100) / 100;
                          }
                          return '0.00';
                        })()}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                        {(() => {
                          const firstQuarter = currentTerm?.termName === 'Term 1' ? 'Q1' : 'Q3';
                          const secondQuarter = currentTerm?.termName === 'Term 1' ? 'Q2' : 'Q4';
                          const firstGrade = quarterlyGrades[student._id]?.[firstQuarter];
                          const secondGrade = quarterlyGrades[student._id]?.[secondQuarter];
                          if (firstGrade && secondGrade) {
                            const q1 = parseFloat(firstGrade);
                            const q2 = parseFloat(secondGrade);
                            const semesterFinal = (q1 + q2) / 2;
                            // Don't apply transmutation again - grades are already transmuted
                            return semesterFinal >= 75 ? 'PASSED' : 'REPEAT';
                          }
                          return 'REPEAT';
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p>Selected: {students.length} students in {classes.find(c => c._id === selectedClass)?.className} - {selectedSection}</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        type={modal.type}
      >
        <p>{modal.message}</p>
      </Modal>

      {/* Confirmation Modal for Reposting */}
      <Modal
        isOpen={confirmRepost.isOpen}
        onClose={() => setConfirmRepost({ isOpen: false, quarter: null, callback: null })}
        title="Confirm Reposting Grades"
        type="warning"
      >
        <div className="space-y-4">
          <p>
            Grades for <strong>{confirmRepost.quarter}</strong> have already been posted to students. 
            Are you sure you want to post them again?
          </p>
          <p className="text-sm text-gray-600">
            This will send another notification to students and may cause confusion.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirmRepost({ isOpen: false, quarter: null, callback: null })}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (confirmRepost.callback) {
                  confirmRepost.callback();
                }
                setConfirmRepost({ isOpen: false, quarter: null, callback: null });
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Yes, Post Again
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
