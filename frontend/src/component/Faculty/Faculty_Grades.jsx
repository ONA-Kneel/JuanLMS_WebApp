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
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [_subjectInfo, _setSubjectInfo] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [_currentFacultyID, setCurrentFacultyID] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [studentScores, setStudentScores] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [saving, setSaving] = useState(false);

  const showModal = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: '', message: '', type: 'info' });
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Get current faculty ID from token (no need for separate API call)
        const token = localStorage.getItem('token');
        if (token) {
          // Decode token to get user info
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentFacultyID(payload._id);
        }

        // Fetch academic year
        let academicYearData = null;
        let currentTermData = null;
        
        const academicYearResponse = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (academicYearResponse.ok) {
          academicYearData = await academicYearResponse.json();
          setAcademicYear(academicYearData);
          
          // Fetch active term after academic year is set (using same approach as Faculty_Dashboard)
          const schoolYearName = `${academicYearData.schoolYearStart}-${academicYearData.schoolYearEnd}`;
          const termResponse = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (termResponse.ok) {
            const terms = await termResponse.json();
            const activeTerm = terms.find((t) => t.status === "active");
            currentTermData = activeTerm || null;
            setCurrentTerm(currentTermData);
          } else {
            console.error('Error fetching terms:', termResponse.status, termResponse.statusText);
            setCurrentTerm(null);
          }
        }

        // Fetch classes and filter them immediately
        const classesResponse = await fetch(`${API_BASE}/classes/my-classes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (classesResponse.ok) {
          const classesData = await classesResponse.json();
          // Filter classes immediately if we have academic year and term
          if (academicYearData && currentTermData) {
            const filtered = classesData.filter(
              (cls) =>
                cls.isArchived !== true &&
                cls.academicYear ===
                  `${academicYearData.schoolYearStart}-${academicYearData.schoolYearEnd}` &&
                cls.termName === currentTermData.termName
            );
            setClasses(filtered);
          } else {
            setClasses(classesData);
          }
        }

      } catch (error) {
        console.error('Error initializing data:', error);
        showModal('Error', 'Failed to load initial data', 'error');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []); // Remove academicYear dependency to prevent infinite loop

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
        console.log('Assignments fetched:', assignmentsData);
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
        console.log('Quizzes fetched:', quizzesData);
        setQuizzes(quizzesData);
      } else {
        console.error('Failed to fetch quizzes:', quizzesResponse.status, quizzesResponse.statusText);
      }

      // Fetch student scores using the data we already fetched
      await fetchStudentScores(assignmentsData, quizzesData);
      
    } catch (error) {
      console.error('Error fetching assignments and quizzes:', error);
    }
  }, []);

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
  }, [selectedClass, selectedSection, classes, fetchAssignmentsAndQuizzes]);


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
                assignmentScores[studentId] = { assignments: [], quizzes: [] };
                console.log('Created new student entry for assignment:', studentId);
              }
              
              const scoreData = {
                score: submission.score || submission.totalScore || submission.grade || 0,
                totalScore: assignment.points || 100
              };
              console.log('Adding assignment score:', scoreData);
              assignmentScores[studentId].assignments.push(scoreData);
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
                assignmentScores[studentId] = { assignments: [], quizzes: [] };
                console.log('Created new student entry for quiz:', studentId);
              }
              
              const scoreData = {
                score: quizResponse.score || quizResponse.totalScore || quizResponse.grade || 0,
                totalScore: quiz.points || 100
              };
              console.log('Adding quiz score:', scoreData);
              assignmentScores[studentId].quizzes.push(scoreData);
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
    const writtenWorksRAW = studentScore.assignments.reduce((sum, assignment) => sum + assignment.score, 0);
    const performanceTasksRAW = studentScore.quizzes.reduce((sum, quiz) => sum + quiz.score, 0);

    // Calculate HPS from all activities (should be the same for all students)
    const writtenWorksHPS = assignments
      .filter(assignment => {
        const isFuturePost = new Date(assignment.postAt) > new Date();
        return !isFuturePost;
      })
      .reduce((sum, assignment) => sum + (assignment.points || 100), 0);

    const performanceTasksHPS = quizzes
      .filter(quiz => {
        const isFuturePost = new Date(quiz.postAt) > new Date();
        return !isFuturePost;
      })
      .reduce((sum, quiz) => sum + (quiz.points || 100), 0);

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

  // Load saved grades when class and section are selected
  useEffect(() => {
    if (selectedClass && selectedSection && students.length > 0) {
      loadSavedGrades();
    }
  }, [selectedClass, selectedSection, students]);

  const handleGradeChange = (studentId, gradeType, value) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [gradeType]: value
      }
    }));
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

      // Prepare grades data for saving
      const gradesData = {
        classId: selectedClassData.classID,
        className: selectedClassData.className,
        section: selectedSection,
        academicYear: academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : null,
        termName: currentTerm?.termName || null,
        quarter: 'Q1', // You can make this dynamic if needed
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
        const saveResponse = await response.json();
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

  const loadSavedGrades = async () => {
    if (!selectedClass || !selectedSection) return;

    try {
      const token = localStorage.getItem('token');
      const selectedClassData = classes.find(c => c._id === selectedClass);
      
      if (!selectedClassData) {
        console.log('No selected class data found for loading grades');
        return;
      }

      // Load saved grades from database
      const response = await fetch(`${API_BASE}/api/grades/load?classId=${selectedClassData.classID}&section=${selectedSection}&quarter=Q1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const savedGradesData = await response.json();
        
        if (savedGradesData.success && savedGradesData.data && savedGradesData.data.grades) {
          // Convert saved grades back to local state format
          const loadedGrades = {};
          savedGradesData.data.grades.forEach(grade => {
            loadedGrades[grade.studentId] = {
              quarterlyExam: grade.quarterlyExam || ''
            };
          });
          setGrades(loadedGrades);
          console.log('✅ Loaded saved grades successfully');
        }
      }
    } catch (error) {
      console.error('❌ Error loading saved grades:', error);
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
  const calculateFinalGrade = (studentId, className, quarterlyScore = 0) => {
    const trackInfo = getSubjectTrackAndPercentages(className);
    const { quarterly } = trackInfo.percentages;
    const scores = calculateRawScoresAndHPS(studentId);
    
    const writtenPS = scores.writtenWorksHPS > 0 ? (scores.writtenWorksRAW / scores.writtenWorksHPS) * 100 : 0;
    const writtenWS = writtenPS * trackInfo.percentages.written / 100;
    
    const performancePS = scores.performanceTasksHPS > 0 ? (scores.performanceTasksRAW / scores.performanceTasksHPS) * 100 : 0;
    const performanceWS = performancePS * trackInfo.percentages.performance / 100;
    
    const initialGrade = writtenWS + performanceWS;
    const finalGrade = initialGrade + (quarterlyScore * quarterly / 100);
    
    return Math.round(finalGrade * 100) / 100; // Round to 2 decimal places
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          
          {selectedClass && selectedSection && (
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={async () => {
                  const selectedClassData = classes.find(c => c._id === selectedClass);
                  if (selectedClassData) {
                    await fetchAssignmentsAndQuizzes(selectedClassData);
                    showModal('Success', 'System data refreshed successfully!', 'success');
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
                  <span className="font-semibold">Quarter:</span> Q1
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Grades for {classes.find(c => c._id === selectedClass)?.className} - {selectedSection}
              </h2>
              <button
                onClick={saveGrades}
                disabled={saving || Object.keys(grades).length === 0}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? '💾 Saving...' : '💾 Save Grades'}
              </button>
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
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Grade Management</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Student ID</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Students</th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold" colSpan="2">Quarter</th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold">Semester Final Grade</th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold">Remarks</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-2"></th>
                    <th className="border border-gray-300 px-2 py-2"></th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold">1</th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold">2</th>
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
                        <input
                          type="number"
                          className="w-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={grades[student._id]?.quarter1 || ''}
                          onChange={(e) => handleGradeChange(student._id, 'quarter1', e.target.value)}
                          placeholder="-"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <input
                          type="number"
                          className="w-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={grades[student._id]?.quarter2 || ''}
                          onChange={(e) => handleGradeChange(student._id, 'quarter2', e.target.value)}
                          placeholder="-"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                        {(() => {
                          const studentGrade = grades[student._id];
                          if (studentGrade?.quarter1 && studentGrade?.quarter2) {
                            const q1 = parseFloat(studentGrade.quarter1);
                            const q2 = parseFloat(studentGrade.quarter2);
                            const semesterFinal = (q1 + q2) / 2;
                            return Math.round(semesterFinal * 100) / 100;
                          }
                          return '0.00';
                        })()}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                        {(() => {
                          const studentGrade = grades[student._id];
                          if (studentGrade?.quarter1 && studentGrade?.quarter2) {
                            const q1 = parseFloat(studentGrade.quarter1);
                            const q2 = parseFloat(studentGrade.quarter2);
                            const semesterFinal = (q1 + q2) / 2;
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
    </div>
  );
}
