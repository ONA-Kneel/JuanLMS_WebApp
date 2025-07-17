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
  const [gradingStudent, setGradingStudent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const navigate = useNavigate();
  const [imageZoom, setImageZoom] = useState(1);

  // --- Track when a student views an assignment ---
  useEffect(() => {
    if (localStorage.getItem('role') === 'students' && assignmentId) {
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/assignments/${assignmentId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
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
                          <th className="p-3 border">Grade</th>
                          <th className="p-3 border">Feedback</th>
                          <th className="p-3 border">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((member) => {
                          let status = "Not Viewed Yet";
                          const userId = String(member._id); // Always use MongoDB ObjectId as string
                          const hasViewed = assignment.views && assignment.views.map(String).includes(userId);
                          // Debug log
                          // console.log('Checking viewed:', {views: assignment.views, userId, member});

                          if (member.submission) {
                            status = "Submitted";
                          } else if (hasViewed) {
                            status = "Viewed";
                          }
                          return (
                            <tr key={member._id}>
                              <td className="p-3 border">{member.lastname}, {member.firstname}</td>
                              <td className="p-3 border">{status}</td>
                              <td className="p-3 border">{member.submission && member.submission.grade !== undefined ? member.submission.grade : "-"}</td>
                              <td className="p-3 border">{member.submission && member.submission.feedback ? member.submission.feedback : "-"}</td>
                              <td className="p-3 border">
                                <button
                                  className="bg-green-700 text-white px-2 py-1 rounded"
                                  onClick={() => {
                                    setGradingSubmission(member.submission ? member.submission._id : member._id);
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-12 flex flex-col md:flex-row gap-12">
            {/* Left: Files */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-2xl font-extrabold mb-4 text-blue-900">Grade Submission</h3>
              <div className="font-bold text-lg mb-2">Submitted File:</div>
              <div className="flex flex-col gap-3">
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 16.5a1 1 0 0 1-1-1V5a1 1 0 1 1 2 0v10.5a1 1 0 0 1-1 1Z"/><path fill="currentColor" d="M7.21 13.79a1 1 0 0 1 1.42-1.42l2.29 2.3 2.3-2.3a1 1 0 1 1 1.41 1.42l-3 3a1 1 0 0 1-1.42 0l-3-3Z"/><path fill="currentColor" d="M5 20a1 1 0 0 1 0-2h14a1 1 0 1 1 0 2H5Z"/></svg>
                        </button>
                      </div>
                    );
                  })
                ) : gradingStudent && gradingStudent.submission && gradingStudent.submission.fileUrl ? (
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 16.5a1 1 0 0 1-1-1V5a1 1 0 1 1 2 0v10.5a1 1 0 0 1-1 1Z"/><path fill="currentColor" d="M7.21 13.79a1 1 0 0 1 1.42-1.42l2.29 2.3 2.3-2.3a1 1 0 1 1 1.41 1.42l-3 3a1 1 0 0 1-1.42 0l-3-3Z"/><path fill="currentColor" d="M5 20a1 1 0 0 1 0-2h14a1 1 0 1 1 0 2H5Z"/></svg>
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-gray-500">No file submitted.</div>
                )}
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
                  onChange={e => setGradeValue(e.target.value)}
                  required
                />
                <span className="text-lg font-bold">/ {assignment && assignment.points ? assignment.points : 100}</span>
              </div>
              {gradeError && <div className="text-red-600 text-sm mb-2">{gradeError}</div>}
              <div className="flex gap-4 justify-end mt-4">
                <button type="button" className="bg-gray-400 text-black px-6 py-2 rounded-lg font-semibold" onClick={() => setGradingSubmission(null)}>Cancel</button>
                <button type="button" className="bg-blue-900 text-white px-6 py-2 rounded-lg font-semibold" onClick={e => { e.preventDefault(); handleGrade(gradingSubmission); setGradingSubmission(null); }}>Grade</button>
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
                  {['jpg','jpeg','png','gif','bmp','webp'].includes(previewFile.type) ? (
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
                {['jpg','jpeg','png','gif','bmp','webp'].includes(previewFile.type) && (
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
    </div>
  );
} 