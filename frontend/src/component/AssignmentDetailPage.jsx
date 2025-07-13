import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import Student_Navbar from './Student/Student_Navbar';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const [role, setRole] = useState('');
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('assignment');
  const [submissions, setSubmissions] = useState([]);
  const [studentSubmission, setStudentSubmission] = useState(null);
  const [file, setFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  // Removed unused classMembers state
  const [submissionType, setSubmissionType] = useState('file'); // 'file' or 'link'
  const [link, setLink] = useState('');
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const navigate = useNavigate();

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
      .then(data => {
        setAssignment(data);
      })
      .catch(err => {
        console.error('Failed to fetch assignment:', err);
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
            console.error('No valid members array found:', members);
          }
          // setClassMembers(memberList); // This line is removed
          // Fetch submissions
          fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(subs => {
              if (!Array.isArray(subs)) {
                console.error('Expected array for submissions, got:', subs);
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
          const sub = Array.isArray(data) ? data.find(s => s.student && (s.student._id === userId || s.student === userId)) : null;
          setStudentSubmission(sub);
        });
    }
  }, [role, assignment, assignmentId, submitSuccess, gradeLoading]);

  // Student submit handler
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitSuccess(false);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const formData = new FormData();
      if (submissionType === 'file') {
        formData.append('file', file);
      } else if (submissionType === 'link') {
        formData.append('link', link);
      }
      const res = await fetch(`${API_BASE}/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setFile(null);
        setLink('');
      } else {
        setError('Failed to submit.');
      }
    } catch {
      setError('Failed to submit.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Faculty grade handler
  const handleGrade = async (submissionId) => {
    setGradeLoading(true);
    setGradeError('');
    const token = localStorage.getItem('token');
    
    // Validate grade input
    if (!gradeValue || gradeValue < 0 || gradeValue > 100) {
      setGradeError('Please enter a valid grade between 0 and 100.');
      setGradeLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/assignments/${assignmentId}/grade`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, grade: gradeValue, feedback: feedbackValue })
      });
      
      if (res.ok) {
        setGradeValue('');
        setFeedbackValue('');
        setSubmitSuccess(true); // trigger refresh
        setGradeError('');
      } else {
        const err = await res.json();
        let errorMessage = err.error || `HTTP ${res.status}: ${res.statusText}`;
        
        // Handle specific error cases
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
      console.error('Grading error:', err);
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
                <button className={`pb-2 px-4 ${activeTab === 'assignment' ? 'border-b-2 border-blue-900 font-bold' : ''}`} onClick={() => setActiveTab('assignment')}>Assignment</button>
                <button className={`pb-2 px-4 ${activeTab === 'toGrade' ? 'border-b-2 border-blue-900 font-bold' : ''}`} onClick={() => setActiveTab('toGrade')}>To Grade</button>
                <button className={`pb-2 px-4 ${activeTab === 'graded' ? 'border-b-2 border-blue-900 font-bold' : ''}`} onClick={() => setActiveTab('graded')}>Graded</button>
              </div>
              {activeTab === 'assignment' && (
                <div>
                  <h2 className="text-lg font-semibold mb-1">Instructions</h2>
                  <div className="text-gray-800 whitespace-pre-line mb-4">{assignment.instructions}</div>
                  {assignment.description && (
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold mb-1">Description</h2>
                      <div className="text-gray-700 whitespace-pre-line">{assignment.description}</div>
                    </div>
                  )}
                  {assignment.fileUploadRequired && (
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold mb-1">File Upload Required</h2>
                      <div className="text-gray-700">Allowed file types: {assignment.allowedFileTypes}</div>
                      {assignment.fileInstructions && <div className="text-gray-700 mt-1">{assignment.fileInstructions}</div>}
                    </div>
                  )}
                </div>
              )}
              {(activeTab === 'toGrade' || activeTab === 'graded') && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Submissions</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 border">Name</th>
                          <th className="p-3 border">Status</th>
                          <th className="p-3 border">File</th>
                          <th className="p-3 border">Grade</th>
                          <th className="p-3 border">Feedback</th>
                          <th className="p-3 border">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((member) => (
                          <tr key={member._id}>
                            <td className="p-3 border">{member.lastname}, {member.firstname}</td>
                            <td className="p-3 border">{member.submission ? member.submission.status : "Not Turned In"}</td>
                            <td className="p-3 border">{member.submission && member.submission.fileUrl ? (
                              <a href={member.submission.fileUrl} className="text-blue-700 underline" target="_blank" rel="noopener noreferrer">{member.submission.fileName}</a>
                            ) : "-"}</td>
                            <td className="p-3 border">{member.submission && member.submission.grade !== undefined ? member.submission.grade : "-"}</td>
                            <td className="p-3 border">{member.submission && member.submission.feedback ? member.submission.feedback : "-"}</td>
                            <td className="p-3 border">
                              {member.submission && member.submission.status === 'turned-in' ? (
                                <button
                                  className="bg-green-700 text-white px-2 py-1 rounded"
                                  onClick={() => {
                                    setGradingSubmission(member.submission._id);
                                    setGradeValue(member.submission.grade !== undefined ? member.submission.grade : '');
                                    setFeedbackValue(member.submission.feedback || '');
                                  }}
                                >
                                  Grade
                                </button>
                              ) : member.submission && member.submission.status === 'graded' ? (
                                <span className="text-green-700 font-semibold">Graded</span>
                              ) : "-"}
                            </td>
                          </tr>
                        ))}
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
              <div className="mt-4 mb-4">
                <h2 className="text-lg font-semibold mb-1">Instructions</h2>
                <div className="text-gray-800 whitespace-pre-line">{assignment.instructions}</div>
              </div>
              {/* Always show submit UI for assignments (not quizzes) */}
              {assignment.type !== 'quiz' && (
                <div className="mb-4">
                  <h2 className="text-lg font-semibold mb-1">Submit Assignment</h2>
                  {submitSuccess ? (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                      <strong className="font-bold">Success!</strong>
                      <p className="block sm:inline"> Your assignment has been submitted successfully. You can now close this page.</p>
                    </div>
                  ) : studentSubmission ? (
                    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
                      <strong className="font-bold">Already Submitted!</strong>
                      <p className="block sm:inline"> You have already submitted this assignment.</p>
                      {studentSubmission.fileUrl && (
                        <div className="mt-2">
                          <span className="font-semibold">Submitted File: </span>
                          <a href={studentSubmission.fileUrl} className="text-blue-700 underline" target="_blank" rel="noopener noreferrer">
                            {studentSubmission.fileName}
                          </a>
                        </div>
                      )}
                      {studentSubmission.link && (
                        <div className="mt-2">
                          <span className="font-semibold">Submitted Link: </span>
                          <a href={studentSubmission.link} className="text-blue-700 underline" target="_blank" rel="noopener noreferrer">
                            {studentSubmission.link}
                          </a>
                        </div>
                      )}
                      {studentSubmission.grade !== undefined && (
                        <div className="mt-2">
                          <span className="font-semibold">Grade: </span>
                          {studentSubmission.grade}
                        </div>
                      )}
                      {studentSubmission.feedback && (
                        <div className="mt-2">
                          <span className="font-semibold">Feedback: </span>
                          {studentSubmission.feedback}
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleStudentSubmit} className="space-y-2" encType="multipart/form-data">
                      <label className="block text-sm font-medium mb-1">Submission Type</label>
                      <select
                        className="border rounded px-2 py-1 w-full mb-2"
                        value={submissionType}
                        onChange={e => setSubmissionType(e.target.value)}
                      >
                        <option value="file">File</option>
                        <option value="link">Link</option>
                      </select>
                      {submissionType === 'file' ? (
                        <input type="file" className="border rounded px-2 py-1 w-full" accept="*" onChange={e => setFile(e.target.files[0])} required />
                      ) : (
                        <input type="url" className="border rounded px-2 py-1 w-full" placeholder="Paste your link here (e.g. Google Drive, GitHub, etc.)" value={link} onChange={e => setLink(e.target.value)} required />
                      )}
                      <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded" disabled={submitLoading}>
                        {submitLoading ? 'Submitting...' : 'Submit'}
                      </button>
                      {error && <div className="text-red-600 text-sm">{error}</div>}
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 text-blue-900">Grade Submission</h3>
            <form onSubmit={e => {
              e.preventDefault();
              handleGrade(gradingSubmission);
              setGradingSubmission(null);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Grade</label>
                <input type="number" className="border rounded px-2 py-1 w-full" placeholder="Grade" value={gradeValue} onChange={e => setGradeValue(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Feedback</label>
                <input type="text" className="border rounded px-2 py-1 w-full" placeholder="Feedback" value={feedbackValue} onChange={e => setFeedbackValue(e.target.value)} />
              </div>
              {gradeError && <div className="text-red-600 text-sm">{gradeError}</div>}
              <div className="flex gap-2 justify-end">
                <button type="button" className="bg-gray-300 text-gray-800 px-4 py-2 rounded" onClick={() => setGradingSubmission(null)}>Cancel</button>
                <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded" disabled={gradeLoading}>{gradeLoading ? 'Grading...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 