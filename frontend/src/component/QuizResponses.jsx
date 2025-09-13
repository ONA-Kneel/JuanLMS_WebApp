import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { toast } from 'react-toastify';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import ValidationModal from './ValidationModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE = import.meta.env.VITE_API_URL || 'https://juanlms-webapp-server.onrender.com';

// Image Component with Fallback URLs
function QuestionImage({ imageUrl, alt, className, style }) {
  const [currentUrl, setCurrentUrl] = useState(() => {
    // Construct the proper URL based on the imageUrl format
    if (!imageUrl) return null;
    
    console.log('Processing image URL:', imageUrl);
    
    // If it's already a full URL, check if it's a Cloudinary URL or local URL
    if (imageUrl.startsWith('http')) {
      // Check if it's a Cloudinary URL
      if (imageUrl.includes('cloudinary.com')) {
        console.log('Using Cloudinary URL:', imageUrl);
        return imageUrl;
      }
      
      // Check if it's a local URL with a Cloudinary public ID pattern
      if (imageUrl.includes('/uploads/quiz-images/juanlms/quiz-images/')) {
        const publicId = imageUrl.split('/uploads/quiz-images/juanlms/quiz-images/')[1];
        if (publicId && !publicId.includes('.') && /^[a-zA-Z0-9]+$/.test(publicId)) {
          const cloudinaryUrl = `https://res.cloudinary.com/drfoswtsk/image/upload/v1/juanlms/quiz-images/${publicId}`;
          console.log('Detected Cloudinary public ID in local URL, constructing Cloudinary URL:', cloudinaryUrl);
          return cloudinaryUrl;
        }
      }
      
      console.log('Using local server URL:', imageUrl);
      return imageUrl;
    }
    
    // If it looks like a Cloudinary public ID (no slashes, no extensions, alphanumeric)
    if (!imageUrl.includes('/') && !imageUrl.includes('.') && /^[a-zA-Z0-9]+$/.test(imageUrl)) {
      const cloudinaryUrl = `https://res.cloudinary.com/drfoswtsk/image/upload/v1/juanlms/quiz-images/${imageUrl}`;
      console.log('Constructed Cloudinary URL:', cloudinaryUrl);
      return cloudinaryUrl;
    }
    
    // If it's a relative path, construct local server URL
    if (imageUrl.startsWith('/')) {
      const localUrl = `${API_BASE}${imageUrl}`;
      console.log('Constructed local URL:', localUrl);
      return localUrl;
    }
    
    // Default: treat as local file
    const defaultUrl = `${API_BASE}/uploads/quiz-images/${imageUrl}`;
    console.log('Using default local URL:', defaultUrl);
    return defaultUrl;
  });
  const [attempts, setAttempts] = useState(0);
  
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  const handleError = () => {
    console.log('Image failed to load:', currentUrl);
    
    if (attempts < extensions.length) {
      // Try next extension
      const baseUrl = currentUrl.replace(/\.[^/.]+$/, ''); // Remove existing extension
      const newUrl = baseUrl + extensions[attempts];
      console.log('Trying extension:', extensions[attempts], 'New URL:', newUrl);
      setCurrentUrl(newUrl);
      setAttempts(prev => prev + 1);
    } else {
      // All attempts failed, hide the image
      console.log('All attempts failed, hiding image');
      setCurrentUrl(null);
    }
  };
  
  if (!currentUrl) return null;
  
  return (
    <img 
      src={currentUrl}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      onLoad={() => console.log('Image loaded successfully:', currentUrl)}
    />
  );
}

// Quiz Questions Pagination Component
function QuizQuestionsPagination({ questions }) {
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5; // Show 5 questions per page
  
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = questions.slice(startIndex, endIndex);
  
  const goToPage = (page) => {
    setCurrentPage(page);
  };
  
  const goToPrevious = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const goToNext = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
  return (
    <div>
      {/* Questions Display */}
      <div className="space-y-4">
        {currentQuestions.map((question, index) => {
          const globalIndex = startIndex + index;
          return (
            <div key={globalIndex} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 text-sm font-bold px-2 py-1 rounded-full min-w-[2rem] text-center">
                  {globalIndex + 1}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-2">{question.question}</div>
                  {question.image && (
                    <div className="mb-3">
                      <QuestionImage
                        imageUrl={question.image}
                        alt={`Question ${globalIndex + 1}`}
                        className="max-w-full h-auto rounded-lg border"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    {question.type === 'multiple' && question.choices && question.choices.map((choice, optIndex) => {
                      // Handle both single correct answer and multiple correct answers
                      const isCorrect = Array.isArray(question.correctAnswers) 
                        ? question.correctAnswers.includes(optIndex)
                        : optIndex === question.correctAnswer;
                      
                      return (
                        <div key={optIndex} className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCorrect 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <span className={`text-sm ${
                            isCorrect 
                              ? 'text-green-800 font-medium' 
                              : 'text-gray-700'
                          }`}>
                            {choice}
                          </span>
                          {isCorrect && (
                            <span className="text-green-600 text-xs font-medium">✓ Correct Answer</span>
                          )}
                        </div>
                      );
                    })}
                    
                    {question.type === 'truefalse' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            question.correctAnswer === true 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            T
                          </span>
                          <span className={`text-sm ${
                            question.correctAnswer === true 
                              ? 'text-green-800 font-medium' 
                              : 'text-gray-700'
                          }`}>
                            True
                          </span>
                          {question.correctAnswer === true && (
                            <span className="text-green-600 text-xs font-medium">✓ Correct Answer</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            question.correctAnswer === false 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            F
                          </span>
                          <span className={`text-sm ${
                            question.correctAnswer === false 
                              ? 'text-green-800 font-medium' 
                              : 'text-gray-700'
                          }`}>
                            False
                          </span>
                          {question.correctAnswer === false && (
                            <span className="text-green-600 text-xs font-medium">✓ Correct Answer</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {question.type === 'identification' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="text-sm text-green-800 font-medium">Correct Answer:</div>
                        <div className="text-sm text-green-700 mt-1">{question.correctAnswer || 'No correct answer specified'}</div>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Points: {question.points || 1}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, questions.length)} of {questions.length} questions
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-1 text-sm border rounded ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={goToNext}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateStats(responses, quiz) {
  const scores = responses.map(r => typeof r.score === 'number' ? r.score : 0);
  const total = quiz?.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 1;
  if (!scores.length) return { avg: 0, median: 0, range: [0, 0], dist: {}, total };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];
  const range = [Math.min(...scores), Math.max(...scores)];
  const dist = {};
  for (let s of scores) dist[s] = (dist[s] || 0) + 1;
  return { avg, median, range, dist, total };
}

export default function QuizResponses() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('toGrade');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editScoreIdx, setEditScoreIdx] = useState(null);
  const [editScoreValue, setEditScoreValue] = useState(0);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });
  // Add members state
  const [members, setMembers] = useState([]);
  const [showViolationsModal, setShowViolationsModal] = useState(false);
  const [filteredResponses, setFilteredResponses] = useState(responses); // New state for filtered responses
  
  // Enhanced filter states
  const [filters, setFilters] = useState({
    status: 'all',
    gradeRange: { min: '', max: '' },
    violations: { min: '', max: '' },
    timeSpent: { min: '', max: '' },
    searchTerm: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Real-time search filtering
  useEffect(() => {
    let filtered = [...responses];
    
    // Search filter (real-time)
    if (filters.searchTerm.trim()) {
      filtered = filtered.filter(resp => 
        resp.studentId?.firstname?.toLowerCase().includes(filters.searchTerm.toLowerCase()) || 
        resp.studentId?.lastname?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }
    
    setFilteredResponses(filtered);
    setSelectedIdx(0);
  }, [filters.searchTerm, responses]);

  // Function to apply all filters (for other filters like status, grade range, etc.)
  const applyFilters = () => {
    let filtered = [...responses];
    
    // Search filter
    if (filters.searchTerm.trim()) {
      filtered = filtered.filter(resp => 
        resp.studentId?.firstname?.toLowerCase().includes(filters.searchTerm.toLowerCase()) || 
        resp.studentId?.lastname?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (filters.status === 'graded') {
      filtered = filtered.filter(resp => resp.graded);
    } else if (filters.status === 'not-graded') {
      filtered = filtered.filter(resp => !resp.graded);
    }
    
    // Grade range filter
    if (filters.gradeRange.min !== '' || filters.gradeRange.max !== '') {
      filtered = filtered.filter(resp => {
        const score = typeof resp.score === 'number' ? resp.score : 0;
        const min = filters.gradeRange.min !== '' ? Number(filters.gradeRange.min) : 0;
        const max = filters.gradeRange.max !== '' ? Number(filters.gradeRange.max) : stats.total;
        return score >= min && score <= max;
      });
    }
    
    // Violations filter
    if (filters.violations.min !== '' || filters.violations.max !== '') {
      filtered = filtered.filter(resp => {
        const violations = resp.violationCount || 0;
        const min = filters.violations.min !== '' ? Number(filters.violations.min) : 0;
        const max = filters.violations.max !== '' ? Number(filters.violations.max) : 999;
        return violations >= min && violations <= max;
      });
    }
    
    // Time spent filter (average time per question)
    if (filters.timeSpent.min !== '' || filters.timeSpent.max !== '') {
      filtered = filtered.filter(resp => {
        if (!Array.isArray(resp.questionTimes) || resp.questionTimes.length === 0) return true;
        const avgTime = resp.questionTimes.reduce((sum, time) => sum + time, 0) / resp.questionTimes.length;
        const min = filters.timeSpent.min !== '' ? Number(filters.timeSpent.min) : 0;
        const max = filters.timeSpent.max !== '' ? Number(filters.timeSpent.max) : 999;
        return avgTime >= min && avgTime <= max;
      });
    }
    
    setFilteredResponses(filtered);
    
    // Reset selected index if it's out of bounds or if no results
    if (filtered.length === 0) {
      setSelectedIdx(0);
    } else if (selectedIdx >= filtered.length) {
      setSelectedIdx(0);
    }
  };

  // Function to clear all filters
  const clearFilters = () => {
    setFilters({
      status: 'all',
      gradeRange: { min: '', max: '' },
      violations: { min: '', max: '' },
      timeSpent: { min: '', max: '' },
      searchTerm: ''
    });
    setFilteredResponses(responses);
    setSelectedIdx(0);
  };

  const handleScoreEdit = idx => {
    setEditScoreIdx(idx);
    setEditScoreValue(typeof filteredResponses[idx]?.score === 'number' ? filteredResponses[idx]?.score : 0);
  };
  const handleScoreSave = async idx => {
    const resp = filteredResponses[idx];
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quizId}/responses/${resp._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ score: editScoreValue })
      });
      if (res.ok) {
        const updated = await res.json();
        // Update both responses and filteredResponses
        setResponses(r => r.map((item, i) => item._id === resp._id ? { ...item, score: updated.score } : item));
        setFilteredResponses(fr => fr.map((item, i) => item._id === resp._id ? { ...item, score: updated.score } : item));
        setEditScoreIdx(null);
        toast.success(`Score updated successfully to ${updated.score}`);
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.error || 'Failed to update score.';
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: errorMessage
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to update score due to network error. Please try again.'
      });
    }
  };
  const handleScoreCancel = () => setEditScoreIdx(null);

  const handleMarkAllAsGraded = async () => {
    if (!window.confirm('Are you sure you want to mark all quiz responses as graded? This will move all responses to the "Graded" tab.')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quizId}/responses/mark-all-graded`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (res.ok) {
        // Refresh the responses list
        const updatedResponses = responses.map(resp => ({
          ...resp,
          graded: true
        }));
        setResponses(updatedResponses);
        setFilteredResponses(updatedResponses);
        
        toast.success('All quiz responses have been marked as graded!');
      } else {
        const err = await res.json();
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Mark Failed',
          message: `Failed to mark responses as graded: ${err.error || 'Unknown error'}`
        });
      }
    } catch (err) {
      // Error marking responses as graded
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Network error. Please check your connection and try again.'
      });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Fetch quiz, responses, and members
    Promise.all([
      fetch(`${API_BASE}/api/quizzes/${quizId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_BASE}/api/quizzes/${quizId}/responses`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ]).then(async ([quizData, respData]) => {
      // Always try to fetch class information if we have a classID
      console.log('🚀 QUIZ DATA FETCHED - STARTING CLASS FETCHING DEBUG');
      console.log('=== CLASS FETCHING DEBUG ===');
      console.log('Quiz data received:', quizData);
      console.log('assignedTo:', quizData?.assignedTo);
      console.log('First assigned item:', quizData?.assignedTo?.[0]);
      console.log('classID:', quizData?.assignedTo?.[0]?.classID);
      
      if (quizData && quizData.assignedTo && quizData.assignedTo[0] && quizData.assignedTo[0].classID) {
        const classID = quizData.assignedTo[0].classID;
        console.log('✅ Attempting to fetch class information for classID:', classID);
        
        try {
          // Try the faculty-classes endpoint first
          const classRes = await fetch(`${API_BASE}/classes/faculty-classes`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('Class API response status:', classRes.status);
          
          if (classRes.ok) {
            const allClasses = await classRes.json();
            console.log('✅ Fetched all classes:', allClasses);
            console.log('Looking for classID:', classID);
            
            // Find the specific class by classID
            const classData = allClasses.find(cls => cls.classID === classID);
            console.log('Search result:', classData);
            
            if (classData) {
              console.log('✅ Found class data:', classData);
              const className = classData.className || classData.name;
              quizData.className = className;
              console.log('✅ Updated quiz data with className:', className);
            } else {
              console.log('❌ Class not found in faculty-classes for classID:', classID);
              console.log('Available classIDs:', allClasses.map(cls => cls.classID));
            }
          } else {
            console.log('❌ Class API response not ok:', classRes.status, classRes.statusText);
          }
        } catch (error) {
          console.log('❌ Failed to fetch class information:', error);
        }
      } else {
        console.log('❌ Class fetching conditions not met:', {
          hasQuizData: !!quizData,
          hasAssignedTo: !!quizData?.assignedTo,
          hasFirstAssigned: !!quizData?.assignedTo?.[0],
          hasClassID: !!quizData?.assignedTo?.[0]?.classID
        });
      }
      
      console.log('=== END CLASS FETCHING DEBUG ===');
      
      setQuiz(quizData);
      let responsesArray = Array.isArray(respData) ? respData : [];
      
      // Fetch all students from the class to properly populate student information
      let membersData = [];
      const assignedIDs = quizData?.assignedTo?.[0]?.studentIDs || [];
      
      if (assignedIDs.length > 0) {
        try {
          const res = await fetch(`${API_BASE}/api/quizzes/students/by-ids`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: assignedIDs })
          });
          const data = await res.json();
          membersData = Array.isArray(data.students) ? data.students : [];
          
          // Create a map of student IDs to student objects for quick lookup
          const studentMap = {};
          membersData.forEach(student => {
            // Handle both _id and userID formats
            if (student._id) studentMap[student._id] = student;
            if (student.userID) studentMap[student.userID] = student;
          });
          
          // Populate student information in responses
          responsesArray = responsesArray.map(response => {
            let studentId = response.studentId;
            
            // Handle different student ID formats
            if (typeof studentId === 'string') {
              // If studentId is a string, try to find the student
              const student = studentMap[studentId];
              if (student) {
                return { ...response, studentId: student };
              }
            } else if (studentId && typeof studentId === 'object') {
              // If studentId is already an object, check if it has the right structure
              if (studentId._id && (studentId.firstname || studentId.lastname)) {
                return response; // Already properly populated
              } else if (studentId._id) {
                // Has _id but missing name fields, try to populate
                const student = studentMap[studentId._id];
                if (student) {
                  return { ...response, studentId: student };
                }
              }
            }
            
            // If we can't find the student, log it for debugging
            // Could not find student for response
            return response;
          });
          
        } catch (error) {
          // Error fetching students
          membersData = [];
        }
      }
      
      setResponses(responsesArray);
      setFilteredResponses(responsesArray); // Initialize filtered responses
      setMembers(membersData);
      setLoading(false);
    }).catch((error) => {
      // Error loading quiz data
      setError('Failed to load quiz or responses.');
      setLoading(false);
    });
  }, [quizId]);

  if (loading) return <div className="p-8 text-center">Loading responses...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const stats = calculateStats(responses, quiz);
  const distLabels = Object.keys(stats.dist).sort((a, b) => Number(a) - Number(b));
  const distData = distLabels.map(k => stats.dist[k]);

  return (
    <div className="min-h-screen min-w-screen bg-gray-100 flex">
      {/* Sidebar Navigation */}
      <Faculty_Navbar />
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-start py-8 px-8 ml-0 md:ml-64 font-poppinsr">
        <button className="mb-4 text-blue-800 text-base hover:underline" onClick={() => window.history.back()}>&larr; Back</button>
        <div className="flex items-center justify-between w-full mb-2">
          <h1 className="text-3xl font-extrabold text-blue-900">{quiz?.title || 'Quiz Responses'}</h1>
          <span className="text-base font-semibold text-gray-700">Points: {stats.total}</span>
        </div>
        <div className="flex gap-8 border-b border-gray-300 mb-6 mt-4 w-full">
          <button className={`pb-2 px-2 text-lg font-semibold ${tab === 'assignment' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={() => setTab('assignment')}>Details</button>
          <button className={`pb-2 px-2 text-lg font-semibold ${tab === 'toGrade' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={() => setTab('toGrade')}>Submissions</button>
          <button className={`pb-2 px-2 text-lg font-semibold ${tab === 'insights' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={() => setTab('insights')}>Insights</button>
        </div>
        {/* Assignment Tab */}
        {tab === 'assignment' && (
          <div className="w-full space-y-6">
            {/* Quiz Overview */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Quiz Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-lg font-semibold text-gray-900">{quiz?.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Points</label>
                  <p className="text-lg font-semibold text-blue-600">{stats.total}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Due Date</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {quiz?.dueDate ? new Date(quiz.dueDate).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'No due date set'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quiz Type</label>
                  <p className="text-lg font-semibold text-gray-900">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      quiz?.assignmentType === 'performance' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {quiz?.assignmentType === 'performance' ? 'Performance Task' : 'Written Works'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Instructions
              </h2>
              <div className="text-gray-800 whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                {quiz?.instructions || quiz?.description || 'No instructions provided'}
              </div>
            </div>


            {/* Quiz Questions */}
            {quiz?.questions && quiz.questions.length > 0 && (
              <div className="bg-white border rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Quiz Questions ({quiz.questions.length} questions)
                </h2>
                <QuizQuestionsPagination questions={quiz.questions} />
              </div>
            )}

            {/* Quiz Settings */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Quiz Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Time Limit</label>
                  <p className="text-gray-900">
                    {quiz?.timing?.timeLimit ? `${quiz.timing.timeLimit} minutes` : 'No time limit'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Question Shuffling</label>
                  <p className="text-gray-900">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      quiz?.questionBehaviour?.shuffle || quiz?.shuffleQuestions
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {quiz?.questionBehaviour?.shuffle || quiz?.shuffleQuestions ? 'Enabled' : 'Disabled'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created Date</label>
                  <p className="text-gray-900">
                    {quiz?.createdAt ? new Date(quiz.createdAt).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-gray-900">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      quiz?.postAt && new Date(quiz.postAt) <= new Date()
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {quiz?.postAt && new Date(quiz.postAt) <= new Date() ? 'Posted' : 'Not Posted'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Class</label>
                  <p className="text-gray-900">
                    {(() => {
                      const className = quiz?.className || quiz?.classInfo?.className || quiz?.assignedTo?.[0]?.className || 'Unknown Class';
                      console.log('Quiz class data:', {
                        className: quiz?.className,
                        classInfo: quiz?.classInfo,
                        assignedTo: quiz?.assignedTo,
                        finalClassName: className
                      });
                      return className;
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Attachment Link */}
            {quiz?.attachmentLink && (
              <div className="bg-white border rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                  </svg>
                  Attachment Link
                </h2>
                <a 
                  href={quiz.attachmentLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {quiz.attachmentLink}
                </a>
              </div>
            )}
          </div>
        )}
        {/* To Grade Tab (default) */}
        {tab === 'toGrade' && responses.length > 0 && (
          <div className="w-full">
            {/* Search and Filter Section */}
            <div className="mb-4">
              <div className="flex gap-4 items-center mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search students by name..."
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                <button
                  onClick={clearFilters}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
                >
                  Clear Filters
                </button>
                <div className="text-sm text-gray-600">
                  {filteredResponses?.length || responses.length} of {responses.length} responses
                </div>
              </div>
              
              {/* Enhanced Filters Panel */}
              {showFilters && (
                <div className="bg-white border rounded-lg p-4 mb-4 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="all">All Status</option>
                        <option value="graded">Graded</option>
                        <option value="not-graded">Not Graded</option>
                      </select>
                    </div>
                    
                    {/* Grade Range Filter */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Grade Range</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          min="0"
                          max={stats.total}
                          className="w-1/2 border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                          value={filters.gradeRange.min}
                          onChange={(e) => setFilters(prev => ({ 
                            ...prev, 
                            gradeRange: { ...prev.gradeRange, min: e.target.value } 
                          }))}
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          min="0"
                          max={stats.total}
                          className="w-1/2 border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                          value={filters.gradeRange.max}
                          onChange={(e) => setFilters(prev => ({ 
                            ...prev, 
                            gradeRange: { ...prev.gradeRange, max: e.target.value } 
                          }))}
                        />
                      </div>
                    </div>
                    
                    {/* Violations Filter */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Violations</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          min="0"
                          className="w-1/2 border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                          value={filters.violations.min}
                          onChange={(e) => setFilters(prev => ({ 
                            ...prev, 
                            violations: { ...prev.violations, min: e.target.value } 
                          }))}
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          min="0"
                          className="w-1/2 border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                          value={filters.violations.max}
                          onChange={(e) => setFilters(prev => ({ 
                            ...prev, 
                            violations: { ...prev.violations, max: e.target.value } 
                          }))}
                        />
                      </div>
                    </div>
                    
                    {/* Time Spent Filter */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Avg Time/Question (sec)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          min="0"
                          className="w-1/2 border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                          value={filters.timeSpent.min}
                          onChange={(e) => setFilters(prev => ({ 
                            ...prev, 
                            timeSpent: { ...prev.timeSpent, min: e.target.value } 
                          }))}
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          min="0"
                          className="w-1/2 border rounded px-2 py-2 text-sm focus:outline-none focus:ring-blue-200"
                          value={filters.timeSpent.max}
                          onChange={(e) => setFilters(prev => ({ 
                            ...prev, 
                            timeSpent: { ...prev.timeSpent, max: e.target.value } 
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Apply Filters Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={applyFilters}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Show "No results found" message when filters return no results */}
            {filteredResponses.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-2">No results found for the selected filters</div>
                <div className="text-gray-400 text-sm mb-4">Try adjusting your filter criteria or clear all filters</div>
                <button
                  onClick={clearFilters}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <button disabled={selectedIdx === 0} onClick={() => setSelectedIdx(i => i - 1)} className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50">&lt;</button>
                    <span> {selectedIdx + 1} of {filteredResponses.length} </span>
                    <button disabled={selectedIdx === filteredResponses.length - 1} onClick={() => setSelectedIdx(i => i + 1)} className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50">&gt;</button>
                  </div>
                </div>
                <div className="mb-2 text-2xl font-bold text-blue-900">
                  {filteredResponses[selectedIdx]?.studentId?.firstname && filteredResponses[selectedIdx]?.studentId?.lastname 
                    ? `${filteredResponses[selectedIdx].studentId.firstname} ${filteredResponses[selectedIdx].studentId.lastname}`
                    : filteredResponses[selectedIdx]?.studentId?.firstname 
                    ? filteredResponses[selectedIdx].studentId.firstname
                    : filteredResponses[selectedIdx]?.studentId?.lastname
                    ? filteredResponses[selectedIdx].studentId.lastname
                    : filteredResponses[selectedIdx]?.studentId?._id || filteredResponses[selectedIdx]?.studentId
                    ? `Student ID: ${filteredResponses[selectedIdx].studentId._id || filteredResponses[selectedIdx].studentId}`
                    : 'Unknown Student'
                  }
                </div>
                <div className="mb-2 text-lg text-gray-700">
                  Submitted: {filteredResponses[selectedIdx]?.submittedAt ? new Date(filteredResponses[selectedIdx].submittedAt).toLocaleString() : 'Unknown time'}
                </div>
                
                <div className="mb-4 flex items-center gap-4">
                  <span className="text-2xl text-gray-800 font-bold">Score: </span>
                  {editScoreIdx === selectedIdx ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={stats.total}
                        step="0.01"
                        className="border-2 border-blue-400 rounded px-3 py-1 text-2xl w-24 text-center font-bold mr-2"
                        value={editScoreValue}
                        onChange={e => {
                          let val = Number(e.target.value);
                          // Handle NaN case
                          if (isNaN(val)) val = 0;
                          // Ensure score is within valid range
                          if (val > stats.total) val = stats.total;
                          if (val < 0) val = 0;
                          setEditScoreValue(val);
                        }}
                        onBlur={e => {
                          // Ensure the value is properly formatted on blur
                          let val = Number(e.target.value);
                          if (isNaN(val)) val = 0;
                          if (val > stats.total) val = stats.total;
                          if (val < 0) val = 0;
                          setEditScoreValue(val);
                        }}
                      />
                      <span className="text-2xl font-bold">/ {stats.total}</span>
                      <div className="text-xs text-gray-600 mt-1">Note: 0 is a valid score for students who did not pass anything</div>
                      <button className="ml-2 px-3 py-1 bg-green-600 text-white rounded font-semibold" onClick={() => handleScoreSave(selectedIdx)}>Save</button>
                      <button className="ml-2 px-3 py-1 bg-gray-400 text-white rounded font-semibold" onClick={handleScoreCancel}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-blue-800">{typeof filteredResponses[selectedIdx]?.score === 'number' ? filteredResponses[selectedIdx]?.score : 0}</span>
                      <span className="text-2xl font-bold">/ {stats.total}</span>
                      <button className="ml-4 px-4 py-1 bg-blue-700 text-white rounded font-semibold hover:bg-blue-900 transition" onClick={() => handleScoreEdit(selectedIdx)}>Edit</button>
                    </>
                  )}
                  {/* Show violation count and button */}
                  <span className="ml-8 text-base text-red-600 font-semibold">Tab/Focus Violations: {filteredResponses[selectedIdx]?.violationCount || 0}</span>
                  <button
                    className="ml-4 px-4 py-1 bg-red-600 text-white rounded font-semibold hover:bg-red-800 transition"
                    onClick={() => setShowViolationsModal(true)}
                  >
                    View Violations ({filteredResponses[selectedIdx]?.violationEvents?.length || 0})
                  </button>
                </div>
                {filteredResponses[selectedIdx]?.feedback && <div className="mb-2 text-green-700">Feedback: {filteredResponses[selectedIdx]?.feedback}</div>}
                {/* Answers list with time spent per question on the right */}
                <div className="border rounded p-4 bg-gray-50 mb-4">
                  <ol className="list-decimal ml-6">
                    {quiz.questions.map((q, idx) => {
                      const ans = filteredResponses[selectedIdx]?.answers.find(a => (a.questionId === (q._id || idx) || (a.questionId?._id === (q._id || idx))));
                      const timeSpent = Array.isArray(filteredResponses[selectedIdx]?.questionTimes) ? filteredResponses[selectedIdx]?.questionTimes[idx] : null;
                      
                      // Debug logging
                      console.log(`Question ${idx + 1}:`, {
                        question: q.question,
                        type: q.type,
                        answer: ans,
                        allAnswers: filteredResponses[selectedIdx]?.answers
                      });
                      return (
                        <li key={q._id || idx} className="mb-3 flex justify-between items-start">
                          <div>
                            <div className="font-bold">{q.question}</div>
                            {q.image && (
                              <div className="mb-2">
                                <QuestionImage
                                  imageUrl={q.image}
                                  alt="Question"
                                  className="max-h-32 rounded border"
                                />
                              </div>
                            )}
                            <div className="ml-2">
                              <span className="italic">Student Answer: </span>
                              {q.type === 'multiple' && (
                                <div>
                                  {Array.isArray(ans?.answer) ? (
                                    <ul className="list-disc ml-4">
                                      {ans.answer.map((i, idx) => <li key={idx}>{q.choices && q.choices[i] ? q.choices[i] : `Choice ${i}`}</li>)}
                                    </ul>
                                  ) : (
                                    <span>{ans?.answer !== null && ans?.answer !== undefined ? (q.choices && q.choices[ans.answer] ? q.choices[ans.answer] : `Choice ${ans.answer}`) : 'No answer'}</span>
                                  )}
                                </div>
                              )}
                              {q.type === 'truefalse' && (
                                <span>{ans?.answer === true ? 'True' : ans?.answer === false ? 'False' : 'No answer'}</span>
                              )}
                              {q.type === 'identification' && (
                                <span>{ans?.answer || 'No answer'}</span>
                              )}
                              {!q.type && (
                                <span>{ans?.answer || 'No answer'}</span>
                              )}
                            </div>
                          </div>
                          {/* Time spent per question on the far right with label */}
                          {timeSpent !== null && (
                            <div className="ml-8 text-xs text-blue-700 whitespace-nowrap self-center text-center">
                              <div className="font-semibold">Time Spent</div>
                              {timeSpent} seconds
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </>
            )}
          </div>
        )}
        {tab === 'toGrade' && responses.length === 0 && (
          <div className="text-gray-600">No responses yet.</div>
        )}
        {/* Insights Tab */}
        {tab === 'insights' && (
          <div className="w-full px-2">
            <div className="mb-4 flex flex-col md:flex-row gap-4 md:gap-8">
              <div className="bg-gray-50 p-4 rounded shadow text-center flex-1">
                <div className="text-xs text-gray-500">Average</div>
                <div className="text-lg font-bold">{stats.avg.toFixed(2)} / {stats.total} points</div>
              </div>
              <div className="bg-gray-50 p-4 rounded shadow text-center flex-1">
                <div className="text-xs text-gray-500">Median</div>
                <div className="text-lg font-bold">{stats.median} / {stats.total} points</div>
              </div>
              <div className="bg-gray-50 p-4 rounded shadow text-center flex-1">
                <div className="text-xs text-gray-500">Range</div>
                <div className="text-lg font-bold">{stats.range[0]} - {stats.range[1]} points</div>
              </div>
            </div>
            <div className="my-8">
              <div className="font-semibold mb-2">Total points distribution</div>
              <div className="w-full max-7xl ">
                <Bar
                  data={{
                    labels: distLabels,
                    datasets: [{
                      label: '# of respondents',
                      data: distData,
                      backgroundColor: 'rgba(99, 102, 241, 0.7)'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      title: { display: false }
                    },
                    scales: {
                      x: { title: { display: true, text: 'Points scored' } },
                      y: { title: { display: true, text: '# of respondents' }, beginAtZero: true, precision: 0 }
                    }
                  }}
                  height={250}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <ValidationModal
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
        type={validationModal.type}
        title={validationModal.title}
        message={validationModal.message}
      />
      {/* Modal for violation events */}
      {showViolationsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center border-2 border-red-500">
            <h3 className="text-2xl font-bold mb-4 text-red-700">Tab/Focus Violation Timeline</h3>
            <ul className="text-left mb-4">
              {filteredResponses[selectedIdx]?.violationEvents.map((v, i) => (
                <li key={i} className="mb-2 flex items-center">
                  <span className="mr-2 text-red-600">⛔</span>
                  <span>
                    <span className="font-semibold">Stopped viewing the quiz-taking page</span>
                    {v.question && <> (Question {v.question})</>}
                    <span className="ml-2 text-gray-500 text-xs">{new Date(v.time).toLocaleString()}</span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              className="mt-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded"
              onClick={() => setShowViolationsModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}