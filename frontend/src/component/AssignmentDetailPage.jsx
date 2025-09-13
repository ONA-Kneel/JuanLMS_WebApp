import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import Student_Navbar from './Student/Student_Navbar';
import ValidationModal from './ValidationModal';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const [role, setRole] = useState('');
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('assignment');
  const [submissions, setSubmissions] = useState([]);
  const [studentSubmission, setStudentSubmission] = useState(null);
  const [file, setFile] = useState(null); // now a FileList or null
  const [links, setLinks] = useState(['']); // array of up to 5 links
  const [submitLoading, setSubmitLoading] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  // Removed unused classMembers state
  const [submissionType, setSubmissionType] = useState('file'); // 'file' or 'link'
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradingStudent, setGradingStudent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const navigate = useNavigate();
  const [imageZoom, setImageZoom] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  // Add state for selected files before submission
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [deletingFile, setDeletingFile] = useState(null);
  const [submissionContext, setSubmissionContext] = useState('');
  const [filteredSubmissions, setFilteredSubmissions] = useState(submissions); // New state for filtered submissions
  const [viewTracked, setViewTracked] = useState(false); // Track if view has been recorded
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  // --- Track when a student views an assignment ---
  useEffect(() => {
    if (localStorage.getItem('role') === 'students' && assignmentId && !viewTracked) {
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/assignments/${assignmentId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(() => {
        setViewTracked(true); // Mark as tracked to prevent duplicate calls
      })
      .catch(err => {
        // Failed to track view
      });
    }
  }, [assignmentId, viewTracked]);

  // Reset view tracking when assignmentId changes
  useEffect(() => {
    setViewTracked(false);
  }, [assignmentId]);

  useEffect(() => {
    setRole(localStorage.getItem('role'));
    const token = localStorage.getItem('token');
    setLoading(true);
    setError('');

    fetch(`${API_BASE}/assignments/${assignmentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(async (data) => {
        // Try to fetch class information if we have a classID but no className
        if (data && data.classID && !data.className) {
          try {
            const classRes = await fetch(`${API_BASE}/classes/faculty-classes`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (classRes.ok) {
              const allClasses = await classRes.json();
              const classData = allClasses.find(cls => cls.classID === data.classID);
              
              if (classData) {
                data.className = classData.className || classData.name;
              }
            }
          } catch (error) {
            console.error('Failed to fetch class information:', error);
          }
        }
        
        setAssignment(data);
      })
      .catch(err => {
        let errorMessage = 'Failed to fetch assignment. Please try again.';

        if (err.message.includes('404')) {
          errorMessage = 'Assignment not found. It may have been deleted or you may not have permission to view it.';
        } else if (err.message.includes('403')) {
          errorMessage = 'You do not have permission to view this assignment.';
        } else if (err.message.includes('401')) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (err.message.includes('400')) {
          errorMessage = 'Invalid assignment ID. Please check the URL and try again.';
        } else if (err.message.includes('500')) {
          errorMessage = 'Server error occurred. Please try again later.';
        }

        setError(errorMessage);
      })
      .finally(() => setLoading(false));
  }, [assignmentId]);

  // Fetch class members and submissions for faculty
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (role === 'faculty' && assignment && assignment.classID) {
      // Fetch class members
      fetch(`${API_BASE}/classes/${assignment.classID}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(members => {
          // If the response is an object with a 'students' array, use that
          let memberList = [];
          if (Array.isArray(members)) {
            memberList = members;
          } else if (members && Array.isArray(members.students)) {
            memberList = members.students;
          } else {
            // No valid members array found
          }
          // setClassMembers(memberList); // This line is removed
          // Fetch submissions
          fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(subs => {
              if (!Array.isArray(subs)) {
                // Expected array for submissions
              }
              // Merge members and submissions
              const merged = memberList.map(member => {
                const submission = Array.isArray(subs) ? subs.find(sub => sub.student && (sub.student._id === member._id || sub.student === member._id)) : null;
                return {
                  ...member,
                  submission
                };
              });
              setSubmissions(merged);
              setFilteredSubmissions(merged); // Initialize filtered submissions
            });
        });
    } else if (role === 'students') {
      // For students, fetch only their own submission
      fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const userId = localStorage.getItem('userID');
          if (Array.isArray(data)) {
            data.forEach((s, i) => {
              if (s.student) {
              }
            });
          }
          const sub = Array.isArray(data)
            ? data.find(s => {
              if (!s.student) return false;
              return (
                String(s.student._id) === String(userId) ||
                String(s.student) === String(userId) ||
                String(s.student.userID) === String(userId)
              );
            })
            : null;
          setStudentSubmission(sub);
        });
    }
  }, [role, assignment, assignmentId, gradeLoading]);

  // Student submit handler
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const formData = new FormData();
      
      // Handle different submission types
      if (submissionType === 'file' && file) {
        for (let i = 0; i < file.length && i < 5; i++) {
          formData.append('files', file[i]);
        }
      } else if (submissionType === 'link') {
        // Filter out empty links and append to formData
        const validLinks = links.filter(link => link && link.trim());
        validLinks.forEach(link => {
          formData.append('links', link.trim());
        });
      }
      // If no submission type selected or empty submission, still submit
      // The backend will handle empty files and links arrays
      
      // Always include context if provided
      if (submissionContext) {
        formData.append('context', submissionContext);
      }
      
      const res = await fetch(`${API_BASE}/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        // Refetch the student's submission from the backend
        fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            const userId = localStorage.getItem('userID');
            const sub = Array.isArray(data) ? data.find(s => s.student && (s.student._id === userId || s.student === userId)) : null;
            setStudentSubmission(sub);
            // Seamless reload after submission
            setTimeout(() => navigate(0), 200);
          });
        setFile(null);
        setSelectedFiles([]); // After submission, clear selectedFiles
        setLinks(['']); // Reset links
        setSubmissionContext(''); // Reset context
      } else {
        setError('Failed to submit.');
      }
    } catch {
      setError('Failed to submit.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Student undo submission handler
  const handleUndoSubmission = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/assignments/${assignmentId}/submission`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      // Refetch the student's submission from the backend
      fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const userId = localStorage.getItem('userID');
          const sub = Array.isArray(data) ? data.find(s => s.student && (s.student._id === userId || s.student === userId)) : null;
          setStudentSubmission(sub);
          // Don't clear selectedFiles and file - keep them visible for resubmission
          // Don't clear links - keep them visible for resubmission
          // Don't clear context - keep it visible for resubmission
        });
    } else {
      // Handle error response
      const errorData = await res.json();
      if (res.status === 403) {
        // Submission is graded, show appropriate message
        setError('Cannot undo submission. This submission has already been graded and cannot be modified.');
      } else {
        setError(errorData.error || 'Failed to undo submission.');
      }
    }
  };

  // Handler to delete a file from submission
  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    setDeletingFile(fileToDelete.url);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/assignments/${assignmentId}/submission/file`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl: fileToDelete.url }),
      });
      if (res.ok) {
        // Refetch the student's submission from the backend
        fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            const userId = localStorage.getItem('userID');
            const sub = Array.isArray(data) ? data.find(s => s.student && (s.student._id === userId || s.student === userId || s.student.userID === userId)) : null;
            setStudentSubmission(sub);
          });
      } else {
        setError('Failed to delete file.');
      }
    } catch {
      setError('Failed to delete file.');
    } finally {
      setShowDeleteModal(false);
      setFileToDelete(null);
      setDeletingFile(null);
    }
  };

  // Mark all submissions as graded
  const handleMarkAllAsGraded = async () => {
    if (!window.confirm('Are you sure you want to mark all submissions as graded? This will move all submissions to the "Graded" tab.')) {
      return;
    }

    setGradeLoading(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE}/assignments/${assignmentId}/mark-all-graded`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        // Refresh the submissions list
        const token = localStorage.getItem("token");
        fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(submissions => {
            setSubmissions(submissions);
            setFilteredSubmissions(submissions); // Update filtered submissions
          })
          .catch(err => {
            // Error refreshing submissions
          });
        
        toast.success('All submissions have been marked as graded!');
      } else {
        const err = await res.json();
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Mark Failed',
          message: `Failed to mark submissions as graded: ${err.error || 'Unknown error'}`
        });
      }
    } catch (err) {
      // Error marking submissions as graded
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setGradeLoading(false);
    }
  };

  // Faculty grade handler
  const handleGrade = async (submissionId) => {
    setGradeLoading(true);
    setGradeError('');
    const token = localStorage.getItem('token');

    if (!gradeValue || gradeValue < 0 || gradeValue > 100) {
      setGradeError('Please enter a valid grade between 0 and 100.');
      setGradeLoading(false);
      return;
    }

    try {
      // Prepare the request body based on whether we have a submission ID or not
      const requestBody = {
        grade: gradeValue,
        feedback: feedbackValue,
      };

      if (submissionId) {
        // If we have a submission ID, use it
        requestBody.submissionId = submissionId;
      } else if (gradingStudent) {
        // If no submission ID but we have a student, use student ID
        requestBody.studentId = gradingStudent._id;
      } else {
        setGradeError('Unable to identify student for grading.');
        setGradeLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/assignments/${assignmentId}/grade`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        setGradeValue('');
        setFeedbackValue('');
        setGradeError('');

        // Refresh the submissions list to show the new grade
        if (role === 'faculty' && assignment) {
          // Fetch updated submissions
          const token = localStorage.getItem('token');
          fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(submissions => {
              // Update the submissions state
              setSubmissions(submissions);
              setFilteredSubmissions(submissions); // Update filtered submissions
            })
            .catch(err => {
            // Error refreshing submissions
          });
        }

        // Close the grading modal
        setGradingSubmission(null);
        setGradingStudent(null);

      } else {
        const err = await res.json();
        let errorMessage = err.error || `HTTP ${res.status}: ${res.statusText}`;

        if (res.status === 400) {
          errorMessage = 'Invalid grade value or submission data.';
        } else if (res.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (res.status === 403) {
          errorMessage = 'You do not have permission to grade this submission.';
        } else if (res.status === 404) {
          errorMessage = 'Submission not found.';
        } else if (res.status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        }

        setGradeError(errorMessage);
      }
    } catch (err) {
      // Grading error
      setGradeError('Network error. Please check your connection and try again.');
    } finally {
      setGradeLoading(false);
    }
  };



  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-100">Loading...</div>;
  if (error || !assignment) return <div className="flex items-center justify-center min-h-screen bg-gray-100">{error || 'Assignment not found.'}</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      {role === 'faculty' ? <Faculty_Navbar /> : <Student_Navbar />}
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">

        <div className="w-full p-0 mt-0">
          <button className="mb-6 text-blue-900 hover:underline" onClick={() => navigate(-1)}>&larr; Back</button>
          {/* Assignment Creation/Edit UI - modern style */}
          {role === 'faculty' && !assignment && (
            <form className="space-y-6">
              <input
                type="text"
                placeholder="Title"
                className="w-full border-b-2 border-blue-300 focus:border-blue-900 text-2xl font-bold px-2 py-2 outline-none bg-transparent"
              // value, onChange handlers as needed
              />
              <textarea
                placeholder="Instructions (optional)"
                className="w-full bg-gray-100 rounded-lg border border-gray-200 px-4 py-3 text-base min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
              // value, onChange handlers as needed
              />
              <div className="flex gap-4 mt-4">
                <button type="button" className="flex items-center gap-2 border border-blue-900 text-blue-900 px-4 py-2 rounded hover:bg-blue-50">
                  <span className="material-icons">attach_file</span> Add
                </button>
                <button type="submit" className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
                  <span className="material-icons">add</span> Create
                </button>
              </div>
            </form>
          )}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
            <h1 className="text-3xl font-bold text-blue-900 mb-2 md:mb-0">{assignment.title}</h1>
            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${assignment.type === 'quiz' ? 'bg-purple-200 text-purple-800' : 'bg-green-200 text-green-800'}`}>{assignment.type === 'quiz' ? 'Quiz' : 'Assignment'}</span>
          </div>
          {assignment.dueDate && <div className="text-sm text-gray-500 mb-2">Due: {new Date(assignment.dueDate).toLocaleString()}</div>}
          {assignment.points && <div className="text-sm text-gray-500 mb-2">Points: {assignment.points}</div>}

          {/* Tabs for faculty */}
          {role === 'faculty' && (
            <div className="mt-6 mb-4">
              <div className="flex gap-4 border-b mb-4">
                <button className={`pb-2 px-4 ${activeTab === 'assignment' ? 'border-b-2 border-blue-900 font-bold' : ''}`} onClick={() => setActiveTab('assignment')}>Details</button>
                <button className={`pb-2 px-4 ${activeTab === 'toGrade' ? 'border-b-2 border-blue-900 font-bold' : ''}`} onClick={() => setActiveTab('toGrade')}>To Grade</button>
                <button className={`pb-2 px-4 ${activeTab === 'graded' ? 'border-b-2 border-blue-900 font-bold' : ''}`} onClick={() => setActiveTab('graded')}>Graded</button>
              </div>
              {activeTab === 'assignment' && (
                <div className="space-y-6">
                  {/* Assignment Overview */}
                  <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      Assignment Overview
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Title</label>
                        <p className="text-lg font-semibold text-gray-900">{assignment.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Points</label>
                        <p className="text-lg font-semibold text-blue-600">{assignment.points || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Due Date</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString('en-US', {
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
                        <label className="text-sm font-medium text-gray-500">Assignment Type</label>
                        <p className="text-lg font-semibold text-gray-900">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            assignment.assignmentType === 'performance' 
                              ? 'bg-orange-100 text-orange-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {assignment.assignmentType === 'performance' ? 'Performance Task' : 'Written Works'}
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
                      {assignment.instructions || 'No instructions provided'}
                    </div>
                  </div>


                  {/* File Upload Requirements */}
                  {assignment.fileUploadRequired && (
                    <div className="bg-white border rounded-lg p-6 shadow-sm">
                      <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        File Upload Requirements
                      </h2>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Allowed File Types</label>
                          <p className="text-gray-900 font-medium">{assignment.allowedFileTypes || 'Any file type'}</p>
                        </div>
                        {assignment.fileInstructions && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">File Instructions</label>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{assignment.fileInstructions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assignment Settings */}
                  <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Assignment Settings
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Created Date</label>
                        <p className="text-gray-900">
                          {assignment.createdAt ? new Date(assignment.createdAt).toLocaleString('en-US', {
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
                            assignment.postAt && new Date(assignment.postAt) <= new Date()
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {assignment.postAt && new Date(assignment.postAt) <= new Date() ? 'Posted' : 'Not Posted'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Class</label>
                        <p className="text-gray-900">{assignment.className || assignment.classInfo?.className || assignment.assignedTo?.[0]?.className || 'Unknown Class'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Attachment Link */}
                  {assignment.attachmentLink && (
                    <div className="bg-white border rounded-lg p-6 shadow-sm">
                      <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                        Attachment Link
                      </h2>
                      <a 
                        href={assignment.attachmentLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {assignment.attachmentLink}
                      </a>
                    </div>
                  )}
                </div>
              )}
              {(activeTab === 'toGrade' || activeTab === 'graded') && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Submissions</h2>
                  </div>
                  
                  {/* Search Filter */}
                  <div className="mb-4">
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Search students by name..."
                          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          onChange={(e) => {
                            const searchTerm = e.target.value.toLowerCase();
                            // Filter submissions based on search term
                            const filtered = submissions.filter(member => 
                              member.firstname?.toLowerCase().includes(searchTerm) || 
                              member.lastname?.toLowerCase().includes(searchTerm)
                            );
                            // Update the displayed submissions
                            setFilteredSubmissions(filtered);
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setFilteredSubmissions(submissions);
                            // Reset search input
                            const searchInput = document.querySelector('input[placeholder="Search students by name..."]');
                            if (searchInput) searchInput.value = '';
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
                        >
                          Clear Filters
                        </button>
                      </div>
                      <div className="text-sm text-gray-600">
                        {filteredSubmissions?.length || submissions.length} of {submissions.length} students
                      </div>
                    </div>
                  </div>
                  
                  {/* Information about submissions */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-blue-800">Submission Information</span>
                    </div>
                    <p className="text-blue-700 text-sm">
                      Students can submit assignments with files, links, or submit empty submissions. 
                      <strong>All students can be graded regardless of submission status.</strong>
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 border">Name</th>
                          <th className="p-3 border">Status</th>
                          {activeTab === 'graded' && (
                            <>
                              <th className="p-3 border">Grade</th>
                              <th className="p-3 border">Feedback</th>
                            </>
                          )}
                          <th className="p-3 border">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmissions // Use filteredSubmissions here
                          .filter(member => {
                            if (activeTab === 'toGrade') {
                              // Show all assigned students who have not been graded yet
                              // Not graded: no submission, or submission with no grade/feedback
                              return !member.submission || ((member.submission.grade === undefined || member.submission.grade === null) && (!member.submission.feedback || member.submission.feedback === ''));
                            } else if (activeTab === 'graded') {
                              // Only show submissions that have a grade or feedback
                              return member.submission && (member.submission.grade !== undefined && member.submission.grade !== null || (member.submission.feedback && member.submission.feedback !== ''));
                            }
                            return false;
                          })
                          .map((member) => {
                            let status = "Not Submitted";
                            const userId = String(member._id); // Always use MongoDB ObjectId as string
                            const hasViewed = assignment.views && assignment.views.map(String).includes(userId);
                            
                            if (member.submission) {
                              if ((member.submission.grade !== undefined && member.submission.grade !== null) || (member.submission.feedback && member.submission.feedback !== '')) {
                                status = "Graded";
                              } else {
                                status = "Submitted";
                              }
                            } else if (hasViewed) {
                              status = "Viewed";
                            }
                            
                            // Determine submission details
                            let submissionDetails = "No submission";
                            if (member.submission) {
                              if (member.submission.files && member.submission.files.length > 0) {
                                submissionDetails = `${member.submission.files.length} file(s)`;
                              } else if (member.submission.links && member.submission.links.length > 0) {
                                submissionDetails = `${member.submission.links.length} link(s)`;
                              } else if (member.submission.context) {
                                submissionDetails = "Empty + Context";
                              } else {
                                submissionDetails = "Empty submission";
                              }
                            }
                            
                            return (
                              <tr key={member._id}>
                                <td className="p-3 border">{member.lastname}, {member.firstname}</td>
                                <td className="p-3 border">{status}</td>
                                {activeTab === 'graded' && (
                                  <>
                                    <td className="p-3 border">{member.submission && member.submission.grade !== undefined ? member.submission.grade : "-"}</td>
                                    <td className="p-3 border">{member.submission && member.submission.feedback ? member.submission.feedback : "-"}</td>
                                  </>
                                )}
                                <td className="p-3 border">
                                  <button
                                    className="bg-green-700 text-white px-2 py-1 rounded"
                                    onClick={() => {
                                      // If there's a submission, use its ID; otherwise, use student ID
                                      if (member.submission) {
                                        setGradingSubmission(member.submission._id);
                                      } else {
                                        setGradingSubmission(null); // No submission ID
                                      }
                                      setGradeValue(member.submission && member.submission.grade !== undefined ? member.submission.grade : '');
                                      setFeedbackValue(member.submission && member.submission.feedback ? member.submission.feedback : '');
                                      setGradingStudent(member);
                                    }}
                                  >
                                    Grade
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    {gradeError && <div className="text-red-600 text-sm mt-2">{gradeError}</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Student view */}
          {role !== 'faculty' && (
            <>
              <div className="flex flex-row mb-6 justify-between">
                <div className="mt-4 mb-4">
                  <h2 className="text-lg font-semibold mb-1">Instructions</h2>
                  <div className="text-gray-800 whitespace-pre-line">{assignment.instructions}</div>
                </div>

                <div className="flex flex-col mb-6 justify-between">
                  {studentSubmission?.grade == null ? (
                    <p className="text-gray-600 italic">Not yet graded.</p>
                  ) : (
                    <>
                      <p className="text-blue-900 font-bold mt-2">
                        Grade: {assignment?.points ? 
                          ((studentSubmission.grade / assignment.points) * 100).toFixed(1) : 
                          studentSubmission.grade
                        }%
                      </p>
                      {studentSubmission.feedback && (
                        <p className="text-blue-500 font-semibold mt-1">Feedback: {studentSubmission.feedback}</p>
                      )}
                    </>
                  )}

                </div>

              </div>

              {/* Always show submit UI for assignments (not quizzes) */}
              {assignment.type !== 'quiz' && (
                <div className="mb-4">
                  <h2 className="text-lg font-semibold mb-1">Submit Assignment</h2>
                  {studentSubmission && (
                    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
                      <strong className="font-bold">Already Submitted!</strong>
                      <p className="block sm:inline"> You have already submitted this assignment.</p>
                      
                      {/* Show submission details */}
                      {studentSubmission.files && studentSubmission.files.length > 0 ? (
                        <div className="mt-2">
                          <span className="font-semibold">Submitted Files: </span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {studentSubmission.files.map((file, idx) => (
                              <a 
                                key={idx}
                                href={file.url} 
                                className="text-blue-700 underline bg-blue-50 px-2 py-1 rounded text-sm" 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                {file.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : studentSubmission.links && studentSubmission.links.length > 0 ? (
                        <div className="mt-2">
                          <span className="font-semibold">Submission Type: </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                            Links ({studentSubmission.links.length})
                          </span>
                          <div className="mt-2">
                            <span className="font-semibold">Submitted Links: </span>
                            <div className="flex flex-col gap-1 mt-1">
                              {studentSubmission.links.map((link, idx) => (
                                <a 
                                  key={idx}
                                  href={link} 
                                  className="text-blue-700 underline bg-blue-50 px-2 py-1 rounded text-sm break-all" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  {link}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <span className="font-semibold">Submission Type: </span>
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                            Empty Submission
                          </span>
                          <p className="text-sm mt-1 text-gray-600">
                            You submitted without files or links. This submission can still be graded.
                          </p>
                          
                          {/* Show context if provided */}
                          {studentSubmission.context && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                              <div className="font-semibold text-blue-800 text-sm mb-1">Your Context:</div>
                              <p className="text-blue-700 text-sm whitespace-pre-line">
                                {studentSubmission.context}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Only show undo button if submission hasn't been graded */}
                      {(!studentSubmission.grade && studentSubmission.grade !== 0) && studentSubmission.status !== 'graded' ? (
                        <button
                          className="mt-3 bg-red-600 text-white px-4 py-2 rounded"
                          onClick={handleUndoSubmission}
                        >
                          Undo Submission
                        </button>
                      ) : (
                        <div className="mt-3 p-2 bg-gray-100 text-gray-600 text-sm rounded">
                          Submission cannot be undone - already graded
                        </div>
                      )}
                    </div>
                  )}
                  {/* Always show the submission form for resubmission or first submission */}
                  <form onSubmit={handleStudentSubmit} className="space-y-2" encType="multipart/form-data">
                    <label className="block text-sm font-medium mb-1">Submission Type</label>
                    <select
                      key="submission-type-select"
                      className="border rounded px-3 py-2 w-full mb-2"
                      value={submissionType}
                      onChange={e => setSubmissionType(e.target.value)}
                      disabled={!!studentSubmission}
                    >
                      <option value="file">File</option>
                      <option value="link">Link</option>
                    </select>
                    {submissionType === 'file' ? (
                      <>
                        <input
                          type="file"
                          className="border rounded px-3 py-2 w-full"
                          accept="*"
                          multiple
                          onChange={e => {
                            setFile(e.target.files);
                            setSelectedFiles(Array.from(e.target.files));
                          }}
                          required={false}
                          disabled={!!studentSubmission}
                        />
                        <div className="text-xs text-gray-600 mt-1">You can submit up to 5 files.</div>
                      </>
                    ) : submissionType === 'link' ? (
                      <>
                        {links.map((l, idx) => (
                          <input
                            key={idx}
                            type="url"
                            className="border rounded px-3 py-2 w-full mb-1"
                            placeholder={`Paste your link here (e.g. Google Drive, GitHub, etc.)`}
                            value={l}
                            onChange={e => {
                              const newLinks = [...links];
                              newLinks[idx] = e.target.value;
                              setLinks(newLinks);
                            }}
                            required={false}
                            disabled={!!studentSubmission}
                          />
                        ))}
                        {links.length < 5 && !studentSubmission && (
                          <button type="button" className="text-blue-700 underline text-xs mb-2" onClick={() => setLinks([...links, ''])}>+ Add another link</button>
                        )}
                        {links.length > 1 && !studentSubmission && (
                          <button type="button" className="text-red-600 underline text-xs mb-2 ml-2" onClick={() => setLinks(links.slice(0, -1))}>Remove last link</button>
                        )}
                        <div className="text-xs text-gray-600 mt-1">You can submit up to 5 links.</div>
                      </>
                    ) : (
                      <>
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-blue-800 text-sm">
                            <strong>Note:</strong> You can submit without any files or links. 
                            This submission will be empty but can still be graded by your instructor.
                          </p>
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium mb-1">
                            Additional Context (Optional)
                          </label>
                          <textarea
                            className="border rounded px-3 py-2 w-full"
                            rows="3"
                            placeholder="Describe your submission, presentation details, or any other relevant information... (Optional)"
                            value={submissionContext || ''}
                            onChange={e => setSubmissionContext(e.target.value)}
                            disabled={!!studentSubmission}
                          />
                          <div className="text-xs text-gray-600 mt-1">
                            This helps your instructor understand your submission better. (Optional)
                          </div>
                        </div>
                      </>
                    )}
                    {/* Show selected files before submission */}
                    {!studentSubmission && selectedFiles.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2">
                        <span className="font-semibold">Selected Files: </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedFiles.map((f, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span
                                className="bg-blue-900 text-white rounded-full px-5 py-2 font-semibold text-left"
                                style={{ minWidth: '120px' }}
                              >
                                {f.name}
                              </span>
                              <button
                                className="ml-1 text-red-600 hover:text-red-800"
                                title="Remove File"
                                onClick={() => {
                                  const newFiles = selectedFiles.filter((_, i) => i !== idx);
                                  setSelectedFiles(newFiles);
                                  // Update the FileList for submission
                                  const dt = new DataTransfer();
                                  newFiles.forEach(file => dt.items.add(file));
                                  setFile(dt.files.length > 0 ? dt.files : null);
                                }}
                                style={{ display: 'flex', alignItems: 'center' }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                                  <path fill="currentColor" d="M6 7V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1h3v2h-1v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9H2V7h3Zm2-1v1h8V6H8Zm10 3H6v12h12V9Z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Show submitted files/links here */}
                    {studentSubmission && (
                      <>
                        {studentSubmission.files && studentSubmission.files.length > 0 && (
                          <div className="mt-2 flex flex-col gap-2">
                            <span className="font-semibold">Submitted Files: </span>
                            <div className="flex flex-wrap gap-2">
                              {studentSubmission.files.map((f, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  {/* Blue pill button for file name */}
                                  <button
                                    className="bg-blue-900 text-white rounded-full px-5 py-2 font-semibold text-left hover:bg-blue-800 transition"
                                    style={{ minWidth: '120px' }}
                                    onClick={() => {
                                      const ext = f.name.split('.').pop().toLowerCase();
                                      if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) {
                                        setPreviewFile({ url: f.url, name: f.name, type: ext });
                                      } else {
                                        window.open(f.url, '_blank');
                                      }
                                    }}
                                  >
                                    {f.name}
                                  </button>
                                  {/* Only show delete icon if not submitted yet */}
                                  {!studentSubmission && (
                                    <button
                                      className="ml-1 text-red-600 hover:text-red-800"
                                      title="Delete File"
                                      onClick={() => { setFileToDelete(f); setShowDeleteModal(true); }}
                                      style={{ display: 'flex', alignItems: 'center' }}
                                      disabled={!!deletingFile}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M6 7V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1h3v2h-1v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9H2V7h3Zm2-1v1h8V6H8Zm10 3H6v12h12V9Z" />
                                      </svg>
                                    </button>
                                  )}
                                  {/* Spinner if deleting this file */}
                                  {deletingFile === f.url && (
                                    <svg className="animate-spin ml-2" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Show submitted links (up to 5) */}
                        {studentSubmission.links && studentSubmission.links.length > 0 && (
                          <div className="mt-2">
                            <span className="font-semibold">Submitted Links: </span>
                            <ul>
                              {studentSubmission.links.map((l, idx) => (
                                <li key={idx}>
                                  <a href={l} className="text-blue-700 underline" target="_blank" rel="noopener noreferrer">
                                    {l}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                    {/* Show Undo or Submit button depending on submission state */}
                    {studentSubmission ? (
                      // Only show undo button if submission hasn't been graded
                      (!studentSubmission.grade && studentSubmission.grade !== 0) && studentSubmission.status !== 'graded' ? (
                        <button
                          className="mt-3 bg-red-600 text-white px-4 py-2 rounded"
                          onClick={handleUndoSubmission}
                          type="button"
                        >
                          Undo Submission
                        </button>
                      ) : (
                        <div className="mt-3 p-2 bg-gray-100 text-gray-600 text-sm rounded">
                          Submission cannot be undone - already graded
                        </div>
                      )
                    ) : (
                      <button
                        type="submit"
                        className="bg-blue-900 text-white px-4 py-2 rounded"
                        disabled={submitLoading}
                      >
                        Submit
                      </button>
                    )}
                    {error && <div className="text-red-600 text-sm">{error}</div>}
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Grading Modal */}
      {(gradingSubmission || gradingStudent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-12 flex flex-col md:flex-row gap-12">
            {/* Left: Files */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-2xl font-extrabold mb-4 text-blue-900">Grade Submission</h3>
              <div className="font-bold text-lg mb-2">Submission Content:</div>
              <div className="flex flex-col gap-3">
                {/* Show submitted files */}
                {gradingStudent && gradingStudent.submission && gradingStudent.submission.files && gradingStudent.submission.files.length > 0 ? (
                  gradingStudent.submission.files.map((file, idx) => {
                    const ext = file.name.split('.').pop().toLowerCase();
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          className="bg-blue-900 text-white rounded-full px-5 py-2 font-semibold text-left w-full hover:bg-blue-800 transition"
                          style={{ minWidth: '120px' }}
                          onClick={() => setPreviewFile({ url: file.url, name: file.name, type: ext })}
                        >
                          {file.name}
                        </button>
                        <button
                          className="ml-1 text-blue-900 hover:text-blue-700"
                          title="Download"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 16.5a1 1 0 0 1-1-1V5a1 1 0 1 1 2 0v10.5a1 1 0 0 1-1 1Z" /><path fill="currentColor" d="M7.21 13.79a1 1 0 0 1 1.42-1.42l2.29 2.3 2.3-2.3a1 1 0 1 1 1.41 1.42l-3 3a1 1 0 0 1-1.42 0l-3-3Z" /><path fill="currentColor" d="M5 20a1 1 0 0 1 0-2h14a1 1 0 1 1 0 2H5Z" /></svg>
                        </button>
                      </div>
                    );
                  })
                ) : null}
                
                {/* Show submitted links */}
                {gradingStudent && gradingStudent.submission && gradingStudent.submission.links && gradingStudent.submission.links.length > 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <div className="font-semibold text-blue-800 mb-2">Submitted Links:</div>
                    <div className="flex flex-col gap-2">
                      {gradingStudent.submission.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline break-all hover:text-blue-900"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
                
                {/* Show legacy file submission */}
                {gradingStudent && gradingStudent.submission && !gradingStudent.submission.files?.length && !gradingStudent.submission.links?.length && gradingStudent.submission.fileUrl ? (
                  (() => {
                    const file = gradingStudent.submission;
                    const ext = file.fileName.split('.').pop().toLowerCase();
                    return (
                      <div className="flex items-center gap-2">
                        <button
                          className="bg-blue-900 text-white rounded-full px-5 py-2 font-semibold text-left w-full hover:bg-blue-800 transition"
                          style={{ minWidth: '120px' }}
                          onClick={() => setPreviewFile({ url: file.fileUrl, name: file.fileName, type: ext })}
                        >
                          {file.fileName}
                        </button>
                        <button
                          className="ml-1 text-blue-900 hover:text-blue-700"
                          title="Download"
                          onClick={() => window.open(file.fileUrl, '_blank')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 16.5a1 1 0 0 1-1-1V5a1 1 0 1 1 2 0v10.5a1 1 0 0 1-1 1Z" /><path fill="currentColor" d="M7.21 13.79a1 1 0 0 1 1.42-1.42l2.29 2.3 2.3-2.3a1 1 0 1 1 1.41 1.42l-3 3a1 1 0 0 1-1.42 0l-3-3Z" /><path fill="currentColor" d="M5 20a1 1 0 0 1 0-2h14a1 1 0 1 1 0 2H5Z" /></svg>
                        </button>
                      </div>
                    );
                  })()
                ) : null}
                
                {/* Show no file submission message */}
                {gradingStudent && gradingStudent.submission && 
                 (!gradingStudent.submission.files || gradingStudent.submission.files.length === 0) && 
                 (!gradingStudent.submission.links || gradingStudent.submission.links.length === 0) && 
                 !gradingStudent.submission.fileUrl ? (
                  <div className="bg-gray-50 border border-gray-200 rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-gray-800">Empty Submission</span>
                    </div>
                    <p className="text-gray-700 text-sm">
                      This student submitted without any files or links. 
                      <strong>You can still grade this submission.</strong>
                    </p>
                    
                    {/* Show context if provided */}
                    {gradingStudent && gradingStudent.submission && gradingStudent.submission.context && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="font-semibold text-blue-800 mb-1">Student Context:</div>
                        <p className="text-blue-700 text-sm whitespace-pre-line">
                          {gradingStudent.submission.context}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
                
                {/* Show no submission message for students who haven't submitted anything */}
                {gradingStudent && !gradingStudent.submission ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-yellow-800">No Submission</span>
                    </div>
                    <p className="text-yellow-700 text-sm">
                      This student has not submitted anything yet. 
                      <strong>You can still grade them based on other criteria (attendance, participation, etc.).</strong>
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            {/* Divider */}
            <div className="w-px bg-gray-300 mx-8 hidden md:block" style={{ minHeight: '300px' }} />
            {/* Right: Feedback/Grade */}
            <div className="flex-1 flex flex-col gap-4">
              <label className="font-bold text-lg mb-1">Feedback</label>
              <textarea
                className="border-2 border-blue-800 rounded-xl px-4 py-3 w-full mb-2 text-lg min-h-[120px]"
                placeholder="Enter feedback here..."
                value={feedbackValue}
                onChange={e => setFeedbackValue(e.target.value)}
              />
              <label className="font-bold text-lg mb-1">Grade</label>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="number"
                  className="border-2 border-blue-800 rounded-xl px-4 py-2 w-24 text-lg"
                  placeholder="Grade"
                  value={gradeValue}
                  min={0}
                  max={assignment && assignment.points ? assignment.points : 100}
                  onChange={e => {
                    let val = Number(e.target.value);
                    const maxPoints = assignment && assignment.points ? assignment.points : 100;
                    if (val > maxPoints) val = maxPoints;
                    if (val < 0) val = 0;
                    setGradeValue(val);
                  }}
                  required
                />
                <span className="text-lg font-bold">/ {assignment && assignment.points ? assignment.points : 100}</span>
              </div>
              {gradeError && <div className="text-red-600 text-sm mb-2">{gradeError}</div>}
              <div className="flex gap-4 justify-end mt-4">
                <button type="button" className="bg-gray-400 text-black px-6 py-2 rounded-lg font-semibold" onClick={() => { setGradingSubmission(null); setGradingStudent(null); }}>Cancel</button>
                <button type="button" className="bg-blue-900 text-white px-6 py-2 rounded-lg font-semibold" onClick={e => { e.preventDefault(); handleGrade(gradingSubmission); }}>Grade</button>
              </div>
            </div>
            {/* File Preview Modal */}
            {previewFile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
                {/* X button */}
                <button
                  className="absolute top-8 right-12 text-white text-4xl font-bold bg-black/60 rounded-full p-2 hover:bg-black/90 z-50"
                  onClick={() => { setPreviewFile(null); setImageZoom(1); }}
                  aria-label="Close"
                >
                  &times;
                </button>
                {/* Centered image */}
                <div className="flex flex-col items-center w-full h-full justify-center z-40">
                  {['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(previewFile.type) ? (
                    <img
                      src={previewFile.url}
                      alt={previewFile.name}
                      style={{ transform: `scale(${imageZoom})`, maxWidth: '90vw', maxHeight: '80vh', transition: 'transform 0.2s' }}
                      className="rounded border shadow-2xl bg-white"
                    />
                  ) : previewFile.type === 'pdf' ? (
                    <iframe src={previewFile.url} width="100%" height="700px" title="PDF Preview" className="border rounded mb-2" />
                  ) : (
                    <div className="text-gray-700">Cannot preview this file type.</div>
                  )}
                  <div className="text-white font-semibold mt-4">{previewFile.name}</div>
                </div>
                {/* Zoom controls - floating at bottom center */}
                {['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(previewFile.type) && (
                  <div
                    className="absolute left-1/2 bottom-12 -translate-x-1/2 flex gap-4 items-center z-50"
                    style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '2rem', padding: '0.5rem 1.5rem' }}
                  >
                    <button
                      className="bg-gray-300 text-2xl px-4 py-2 rounded-full font-bold"
                      onClick={() => setImageZoom(z => Math.max(0.5, z - 0.2))}
                    >
                      -
                    </button>
                    <span className="text-white text-lg">Zoom: {(imageZoom * 100).toFixed(0)}%</span>
                    <button
                      className="bg-gray-300 text-2xl px-4 py-2 rounded-full font-bold"
                      onClick={() => setImageZoom(z => Math.min(3, z + 0.2))}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Validation Modal for file delete */}
      <ValidationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setFileToDelete(null); }}
        type="warning"
        title="Delete File?"
        message={fileToDelete ? `Are you sure you want to delete '${fileToDelete.name}' from your submission? This cannot be undone.` : ''}
        onConfirm={handleDeleteFile}
        confirmText="Delete"
        showCancel={true}
        cancelText="Cancel"
      />
      
      {/* Validation Modal for errors */}
      <ValidationModal
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
        type={validationModal.type}
        title={validationModal.title}
        message={validationModal.message}
      />
    </div>
  );
} 