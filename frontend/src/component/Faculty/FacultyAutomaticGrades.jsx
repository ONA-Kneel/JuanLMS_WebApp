import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './FacultyTraditionalGrades.css';
import ValidationModal from './ValidationModal';

const FacultyAutomaticGrades = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [studentScores, setStudentScores] = useState({});
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  const API_BASE = "https://juanlms-webapp-server.onrender.com";

  useEffect(() => {
    fetchAcademicYear();
  }, []);

  useEffect(() => {
    if (academicYear) {
      fetchActiveTerm();
    }
  }, [academicYear]);

  useEffect(() => {
    if (academicYear && currentTerm) {
      fetchFacultyClasses();
    }
  }, [academicYear, currentTerm]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  const fetchAcademicYear = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/schoolyears/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setAcademicYear(response.data);
      }
    } catch (error) {
      console.error('Error fetching academic year:', error);
    }
  };

  const fetchActiveTerm = async () => {
    try {
      const token = localStorage.getItem('token');
      const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
      const response = await axios.get(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        const active = response.data.find(term => term.status === 'active');
        setCurrentTerm(active || null);
      }
    } catch (error) {
      console.error('Error fetching active term:', error);
    }
  };

  const fetchFacultyClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_BASE}/classes/my-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        // Filter classes for current academic year and term
        const filteredClasses = response.data.filter(cls => 
          cls.isArchived !== true &&
          cls.academicYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
          cls.termName === currentTerm.termName
        );
        setClasses(filteredClasses);
      }
    } catch (error) {
      console.error('Error fetching faculty classes:', error);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to fetch classes. Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const selectedClassData = classes.find(c => c._id === selectedClass);
      if (!selectedClassData) return;

      const response = await axios.get(`${API_BASE}/classes/${selectedClassData.classID}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.students) {
        const transformedStudents = response.data.students.map(student => ({
          _id: student._id,
          firstname: student.firstname,
          lastname: student.lastname,
          middlename: student.middlename,
          schoolID: student.schoolID || student.userID,
          name: `${student.lastname}, ${student.firstname} ${student.middlename || ''}`.trim()
        }));
        setStudents(transformedStudents);
        
        // Fetch assignments and quizzes after students are loaded
        await fetchAssignmentsAndQuizzes(selectedClassData);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to fetch students. Please try again later.'
      });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentsAndQuizzes = async (selectedClassData) => {
    try {
      const token = localStorage.getItem('token');

      // Fetch assignments
      const assignmentsResponse = await axios.get(`${API_BASE}/assignments?classID=${selectedClassData.classID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (assignmentsResponse.data) {
        setAssignments(assignmentsResponse.data);
      }

      // Fetch quizzes
      const quizzesResponse = await axios.get(`${API_BASE}/api/quizzes?classID=${selectedClassData.classID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (quizzesResponse.data) {
        setQuizzes(quizzesResponse.data);
      }

      // Fetch student scores
      await fetchStudentScores(assignmentsResponse.data || [], quizzesResponse.data || []);
      
    } catch (error) {
      console.error('Error fetching assignments and quizzes:', error);
    }
  };

  const fetchStudentScores = async (assignmentsData = [], quizzesData = []) => {
    try {
      const token = localStorage.getItem('token');
      const assignmentScores = {};

      // Process assignments
      for (const assignment of assignmentsData) {
        // Only process assignments that are posted (postAt is in the past)
        const isFuturePost = new Date(assignment.postAt) > new Date();
        if (isFuturePost) continue;

        try {
          const response = await axios.get(`${API_BASE}/assignments/${assignment._id}/submissions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data) {
            response.data.forEach(submission => {
              const studentId = submission.studentId?._id || submission.studentId || submission.student?._id || submission.student;
              if (!assignmentScores[studentId]) {
                assignmentScores[studentId] = { assignments: [], quizzes: [] };
              }
              assignmentScores[studentId].assignments.push({
                score: submission.score || submission.totalScore || submission.grade || 0,
                totalScore: assignment.points || 100
              });
            });
          }
        } catch (error) {
          console.error(`Failed to fetch submissions for assignment ${assignment._id}:`, error);
        }
      }

      // Process quizzes
      for (const quiz of quizzesData) {
        // Only process quizzes that are posted (postAt is in the past)
        const isFuturePost = new Date(quiz.postAt) > new Date();
        if (isFuturePost) continue;

        try {
          const response = await axios.get(`${API_BASE}/api/quizzes/${quiz._id}/responses`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data) {
            response.data.forEach(quizResponse => {
              const studentId = quizResponse.studentId?._id || quizResponse.studentId || quizResponse.student?._id || quizResponse.student;
              if (!assignmentScores[studentId]) {
                assignmentScores[studentId] = { assignments: [], quizzes: [] };
              }
              assignmentScores[studentId].quizzes.push({
                score: quizResponse.score || quizResponse.totalScore || quizResponse.grade || 0,
                totalScore: quiz.points || 100
              });
            });
          }
        } catch (error) {
          console.error(`Failed to fetch responses for quiz ${quiz._id}:`, error);
        }
      }

      setStudentScores(assignmentScores);
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

    const writtenWorksRAW = studentScore.assignments.reduce((sum, assignment) => sum + assignment.score, 0);
    const writtenWorksHPS = studentScore.assignments.reduce((sum, assignment) => sum + assignment.totalScore, 0);
    const performanceTasksRAW = studentScore.quizzes.reduce((sum, quiz) => sum + quiz.score, 0);
    const performanceTasksHPS = studentScore.quizzes.reduce((sum, quiz) => sum + quiz.totalScore, 0);

    return {
      writtenWorksRAW,
      writtenWorksHPS,
      performanceTasksRAW,
      performanceTasksHPS
    };
  };

  const getSubjectTrackAndPercentages = (className) => {
    // Determine if subject is Academic or TVL track based on class name
    const academicSubjects = ['Mathematics', 'Science', 'English', 'Filipino', 'Social Studies', 'PE', 'MAPEH'];
    const tvlSubjects = ['ICT', 'Computer', 'Programming', 'Business', 'Marketing', 'Tourism', 'Cookery', 'Dressmaking'];
    
    const isAcademic = academicSubjects.some(subject => 
      className.toLowerCase().includes(subject.toLowerCase())
    );
    const isTVL = tvlSubjects.some(subject => 
      className.toLowerCase().includes(subject.toLowerCase())
    );

    if (isTVL) {
      return {
        track: 'TVL',
        percentages: {
          written: 20,
          performance: 60,
          quarterly: 20
        }
      };
    } else {
      return {
        track: 'Academic',
        percentages: {
          written: 40,
          performance: 40,
          quarterly: 20
        }
      };
    }
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
    const finalGrade = initialGrade + (quarterlyScore * quarterly / 100);
    
    return Math.round(finalGrade * 100) / 100;
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setStudents([]);
    setAssignments([]);
    setQuizzes([]);
    setStudentScores({});
  };

  const refreshData = async () => {
    if (selectedClass) {
      const selectedClassData = classes.find(c => c._id === selectedClass);
      if (selectedClassData) {
        await fetchAssignmentsAndQuizzes(selectedClassData);
        toast.success('Data refreshed successfully');
      }
    }
  };

  return (
    <div className="faculty-traditional-grades">
      <div className="grades-header">
        <h2>Automatic Grades Management</h2>
        <p>View and manage student grades with automatic RAW scores and HPS calculation from system data</p>
      </div>

      {/* Academic Period Display */}
      <div className="academic-period">
        <div className="period-info">
          <div className="info-item">
            <label>Academic Year:</label>
            <span>{academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : 'Loading...'}</span>
          </div>
          <div className="info-item">
            <label>Term:</label>
            <span>{currentTerm ? currentTerm.termName : 'Loading...'}</span>
          </div>
        </div>
      </div>

      {/* Class Selection */}
      <div className="selection-section">
        <div className="form-group">
          <label htmlFor="class-select">Select Class & Section:</label>
          <select
            id="class-select"
            value={selectedClass}
            onChange={handleClassChange}
            disabled={loading}
          >
            <option value="">Choose a class...</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.className} - {cls.section || 'No Section'} ({cls.trackName || 'N/A'} | {cls.strandName || 'N/A'} | {cls.gradeLevel || 'N/A'})
              </option>
            ))}
          </select>
        </div>

        {selectedClass && (
          <div className="template-actions">
            <button 
              onClick={refreshData}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Refreshing...' : 'Refresh System Data'}
            </button>
          </div>
        )}
      </div>

      {/* Grades Table */}
      {selectedClass && students.length > 0 && (
        <div className="grades-table-container">
          <h3>Student Grades - {classes.find(c => c._id === selectedClass)?.className}</h3>
          <div className="table-responsive">
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student No.</th>
                  <th>Written Works RAW</th>
                  <th>Written Works HPS</th>
                  <th>Written Works PS</th>
                  <th>Written Works WS</th>
                  <th>Performance Tasks RAW</th>
                  <th>Performance Tasks HPS</th>
                  <th>Performance Tasks PS</th>
                  <th>Performance Tasks WS</th>
                  <th>Quarterly Exam</th>
                  <th>Initial Grade</th>
                  <th>Final Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const scores = calculateRawScoresAndHPS(student._id);
                  const selectedClassData = classes.find(c => c._id === selectedClass);
                  const trackInfo = getSubjectTrackAndPercentages(selectedClassData?.className);
                  
                  const writtenPS = scores.writtenWorksHPS > 0 ? (scores.writtenWorksRAW / scores.writtenWorksHPS) * 100 : 0;
                  const writtenWS = writtenPS * trackInfo.percentages.written / 100;
                  
                  const performancePS = scores.performanceTasksHPS > 0 ? (scores.performanceTasksRAW / scores.performanceTasksHPS) * 100 : 0;
                  const performanceWS = performancePS * trackInfo.percentages.performance / 100;
                  
                  const initialGrade = writtenWS + performanceWS;
                  
                  return (
                    <tr key={student._id}>
                      <td>{student.name}</td>
                      <td>{student.schoolID}</td>
                      <td className="text-center">{scores.writtenWorksRAW}</td>
                      <td className="text-center">{scores.writtenWorksHPS}</td>
                      <td className="text-center">{scores.writtenWorksHPS > 0 ? Math.round(writtenPS * 100) / 100 : ''}</td>
                      <td className="text-center">{Math.round(writtenWS * 100) / 100}</td>
                      <td className="text-center">{scores.performanceTasksRAW}</td>
                      <td className="text-center">{scores.performanceTasksHPS}</td>
                      <td className="text-center">{scores.performanceTasksHPS > 0 ? Math.round(performancePS * 100) / 100 : ''}</td>
                      <td className="text-center">{Math.round(performanceWS * 100) / 100}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Enter score"
                          className="grade-input"
                          onChange={(e) => {
                            const quarterlyScore = parseFloat(e.target.value) || 0;
                            const finalGrade = calculateFinalGrade(student._id, selectedClassData?.className, quarterlyScore);
                            // You can add state management here to store quarterly scores
                          }}
                        />
                      </td>
                      <td className="text-center">{Math.round(initialGrade * 100) / 100}</td>
                      <td className="text-center">
                        {/* Final grade will be calculated when quarterly exam is entered */}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Track Information */}
          <div className="track-info">
            <h4>Track Information</h4>
            <p><strong>Subject Track:</strong> {getSubjectTrackAndPercentages(classes.find(c => c._id === selectedClass)?.className).track}</p>
            <p><strong>Written Works:</strong> {getSubjectTrackAndPercentages(classes.find(c => c._id === selectedClass)?.className).percentages.written}%</p>
            <p><strong>Performance Tasks:</strong> {getSubjectTrackAndPercentages(classes.find(c => c._id === selectedClass)?.className).percentages.performance}%</p>
            <p><strong>Quarterly Exam:</strong> {getSubjectTrackAndPercentages(classes.find(c => c._id === selectedClass)?.className).percentages.quarterly}%</p>
          </div>
        </div>
      )}

      {selectedClass && students.length === 0 && (
        <div className="no-data">
          <p>No students found in this class.</p>
        </div>
      )}

      {!selectedClass && (
        <div className="no-data">
          <p>Please select a class to view grades.</p>
        </div>
      )}
      
      {/* Validation Modal */}
      <ValidationModal
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
        type={validationModal.type}
        title={validationModal.title}
        message={validationModal.message}
      />
    </div>
  );
};

export default FacultyAutomaticGrades;
