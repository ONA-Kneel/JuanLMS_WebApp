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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  // Function to apply all filters
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
        toast.error(`Failed to mark responses as graded: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error marking responses as graded:', err);
      toast.error('Network error. Please check your connection and try again.');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Fetch quiz, responses, and members
    Promise.all([
      fetch(`${API_BASE}/api/quizzes/${quizId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_BASE}/api/quizzes/${quizId}/responses`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ]).then(async ([quizData, respData]) => {
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
          console.log("Loaded assigned members:", membersData);
          
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
            console.warn('Could not find student for response:', response);
            return response;
          });
          
        } catch (error) {
          console.error('Error fetching students:', error);
          membersData = [];
        }
      }
      
      setResponses(responsesArray);
      setFilteredResponses(responsesArray); // Initialize filtered responses
      setMembers(membersData);
      setLoading(false);
    }).catch((error) => {
      console.error('Error loading quiz data:', error);
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
          <button className={`pb-2 px-2 text-lg font-semibold ${tab === 'status' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={() => setTab('status')}>Status</button>
          <button className={`pb-2 px-2 text-lg font-semibold ${tab === 'insights' ? 'border-b-2 border-blue-800 text-blue-900' : 'text-gray-600'}`} onClick={() => setTab('insights')}>Insights</button>
        </div>
        {/* Assignment Tab */}
        {tab === 'assignment' && (
          <div className="w-full">
            <div className="mb-6">
              <div className="font-bold text-lg mb-1">Instructions</div>
              <div className="mb-4 text-gray-700">{quiz?.instructions || quiz?.description}</div>
              <div className="font-bold text-lg mb-1">Description</div>
              <div className="mb-4 text-gray-700">{quiz?.description}</div>
            </div>
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
                  <button
                    onClick={handleMarkAllAsGraded}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <span>✓</span>
                    Mark All as Graded
                  </button>
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
                      return (
                        <li key={q._id || idx} className="mb-3 flex justify-between items-start">
                          <div>
                            <div className="font-bold">{q.question}</div>
                            {q.image && <img src={q.image} alt="Question" className="max-h-32 mb-2" />}
                            <div className="ml-2">
                              <span className="italic">Student Answer: </span>
                              {q.type === 'multiple' && Array.isArray(ans?.answer) && (
                                <ul className="list-disc ml-4">
                                  {ans.answer.map(i => <li key={i}>{q.choices[i]}</li>)}
                                </ul>
                              )}
                              {q.type === 'truefalse' && (
                                <span>{ans?.answer === true ? 'True' : ans?.answer === false ? 'False' : 'No answer'}</span>
                              )}
                              {q.type === 'identification' && (
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
        {/* Status Tab */}
        {tab === 'status' && (
          <div className="w-full">
            <h2 className="text-lg font-semibold mb-4">Student Quiz Status</h2>
            
            {/* Quiz Completion Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-blue-800">Quiz Completion Summary</span>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-green-700">
                    Graded: {responses.filter(r => r.graded).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span className="text-yellow-700">
                    Not Graded: {responses.filter(r => !r.graded).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span className="text-blue-700">
                    Total Responses: {responses.length}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 border">Name</th>
                    <th className="p-3 border">Status</th>
                    <th className="p-3 border">Score</th>
                    {/* Removed Feedback column */}
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(members) && members.length > 0 ? (
                    members
                      .filter(student => {
                        const assignedIDs = quiz?.assignedTo?.[0]?.studentIDs || [];
                        return assignedIDs.includes(student._id) || assignedIDs.includes(student.userID);
                      })
                      .map(student => {
                        const response = responses.find(r =>
                          r.studentId?._id === student._id ||
                          r.studentId === student._id ||
                          r.studentId?.userID === student.userID
                        );
                        let status = "Not Yet Viewed";
                        if (response) {
                          if (response.graded) {
                            status = "Graded";
                          } else {
                            status = "Submitted";
                          }
                        } else if (quiz?.views && quiz.views.map(String).includes(String(student._id))) {
                          status = "Viewed";
                        }
                        return (
                          <tr key={student._id}>
                            <td className="p-3 border">{student.lastname}, {student.firstname}</td>
                            <td className={`p-3 border ${
                              status === "Graded" ? "bg-green-100 text-green-800 font-semibold" : 
                              status === "Submitted" ? "bg-blue-100 text-blue-800" : 
                              status === "Viewed" ? "bg-yellow-100 text-yellow-800" : 
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {status}
                            </td>
                            <td className="p-3 border">{response && typeof response.score === 'number' ? response.score : "-"}</td>
                            {/* Removed Feedback cell */}
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td className="p-3 border text-center" colSpan={3}>No students found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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