import Faculty_Navbar from "./Faculty_Navbar";
import ProfileModal from "../ProfileModal";
import ProfileMenu from "../ProfileMenu";
import React, { useEffect, useState } from 'react';
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
  const [subjectInfo, setSubjectInfo] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [_currentFacultyID, setCurrentFacultyID] = useState(null);

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
      } else {
        console.error('Error fetching students:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
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

  const handleGradeChange = (studentId, gradeType, value) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [gradeType]: value
      }
    }));
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

  // Function to calculate final grade based on Weight Scores (WS)
  const calculateFinalGrade = (studentGrades, className) => {
    const trackInfo = getSubjectTrackAndPercentages(className);
    const { quarterly } = trackInfo.percentages;
    
    const writtenHPS = parseFloat(studentGrades.writtenWorksHPS) || 0;
    const writtenRAW = parseFloat(studentGrades.writtenWorksRAW) || 0;
    const performanceHPS = parseFloat(studentGrades.performanceTasksHPS) || 0;
    const performanceRAW = parseFloat(studentGrades.performanceTasksRAW) || 0;
    const quarterlyScore = parseFloat(studentGrades.quarterlyExam) || 0;
    
    // Calculate Weight Scores (WS) for Written Works and Performance Tasks
    const writtenPS = writtenHPS > 0 ? (writtenRAW / writtenHPS) * 100 : 0;
    const writtenWS = writtenPS * trackInfo.percentages.written / 100;
    
    const performancePS = performanceHPS > 0 ? (performanceRAW / performanceHPS) * 100 : 0;
    const performanceWS = performancePS * trackInfo.percentages.performance / 100;
    
    // Calculate Initial Grade (Sum of WS components)
    const initialGrade = writtenWS + performanceWS;
    
    // Add Quarterly Exam score (already weighted)
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

            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Grades for {classes.find(c => c._id === selectedClass)?.className} - {selectedSection}
            </h2>
            
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
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">FINAL GRADE</th>
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
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold">FINAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-2 py-2">{student.schoolID}</td>
                        <td className="border border-gray-300 px-2 py-2">
                          {student.lastname}, {student.firstname} {student.middlename || ''}
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            className="w-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={grades[student._id]?.writtenWorksHPS || ''}
                            onChange={(e) => handleGradeChange(student._id, 'writtenWorksHPS', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            className="w-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={grades[student._id]?.writtenWorksRAW || ''}
                            onChange={(e) => handleGradeChange(student._id, 'writtenWorksRAW', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                          {(() => {
                            const studentGrade = grades[student._id];
                            if (studentGrade?.writtenWorksHPS && studentGrade?.writtenWorksRAW) {
                              const hps = parseFloat(studentGrade.writtenWorksHPS);
                              const raw = parseFloat(studentGrade.writtenWorksRAW);
                              return hps > 0 ? Math.round((raw / hps) * 100 * 100) / 100 : '';
                            }
                            return '';
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                          {(() => {
                            const selectedClassData = classes.find(c => c._id === selectedClass);
                            const trackInfo = getSubjectTrackAndPercentages(selectedClassData?.className);
                            const studentGrade = grades[student._id];
                            if (studentGrade?.writtenWorksHPS && studentGrade?.writtenWorksRAW) {
                              const hps = parseFloat(studentGrade.writtenWorksHPS);
                              const raw = parseFloat(studentGrade.writtenWorksRAW);
                              const ps = hps > 0 ? (raw / hps) * 100 : 0;
                              const ws = ps * trackInfo.percentages.written / 100;
                              return Math.round(ws * 100) / 100;
                            }
                            return '';
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            className="w-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={grades[student._id]?.performanceTasksHPS || ''}
                            onChange={(e) => handleGradeChange(student._id, 'performanceTasksHPS', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            className="w-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={grades[student._id]?.performanceTasksRAW || ''}
                            onChange={(e) => handleGradeChange(student._id, 'performanceTasksRAW', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                          {(() => {
                            const studentGrade = grades[student._id];
                            if (studentGrade?.performanceTasksHPS && studentGrade?.performanceTasksRAW) {
                              const hps = parseFloat(studentGrade.performanceTasksHPS);
                              const raw = parseFloat(studentGrade.performanceTasksRAW);
                              return hps > 0 ? Math.round((raw / hps) * 100 * 100) / 100 : '';
                            }
                            return '';
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-semibold bg-gray-100">
                          {(() => {
                            const selectedClassData = classes.find(c => c._id === selectedClass);
                            const trackInfo = getSubjectTrackAndPercentages(selectedClassData?.className);
                            const studentGrade = grades[student._id];
                            if (studentGrade?.performanceTasksHPS && studentGrade?.performanceTasksRAW) {
                              const hps = parseFloat(studentGrade.performanceTasksHPS);
                              const raw = parseFloat(studentGrade.performanceTasksRAW);
                              const ps = hps > 0 ? (raw / hps) * 100 : 0;
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
                            const studentGrade = grades[student._id];
                            if (studentGrade?.writtenWorksHPS && studentGrade?.writtenWorksRAW && 
                                studentGrade?.performanceTasksHPS && studentGrade?.performanceTasksRAW) {
                              const writtenHPS = parseFloat(studentGrade.writtenWorksHPS);
                              const writtenRAW = parseFloat(studentGrade.writtenWorksRAW);
                              const performanceHPS = parseFloat(studentGrade.performanceTasksHPS);
                              const performanceRAW = parseFloat(studentGrade.performanceTasksRAW);
                              
                              const writtenPS = writtenHPS > 0 ? (writtenRAW / writtenHPS) * 100 : 0;
                              const writtenWS = writtenPS * trackInfo.percentages.written / 100;
                              
                              const performancePS = performanceHPS > 0 ? (performanceRAW / performanceHPS) * 100 : 0;
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
                            if (studentGrade) {
                              const finalGrade = calculateFinalGrade(studentGrade, selectedClassData?.className);
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

        {/* Placeholder for future grade functionality */}
        {selectedClass && selectedSection && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Grade Management</h2>
            <div className="text-center py-8 text-gray-600">
              <p>Grade management functionality will be implemented here.</p>
              <p className="text-sm mt-2">Selected: {students.length} students in {classes.find(c => c._id === selectedClass)?.className} - {selectedSection}</p>
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
