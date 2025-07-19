import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Faculty_Navbar from './Faculty/Faculty_Navbar';
import Student_Navbar from './Student/Student_Navbar';
import ValidationModal from './ValidationModal';

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
          console.log('Fetched submissions:', data, 'Current user:', userId);
          console.log('userId:', `"${userId}"`, typeof userId);
          if (Array.isArray(data)) {
            data.forEach((s, i) => {
              if (s.student) {
                console.log(`Submission[${i}].studentID:`, `"${s.student.studentID}"`, typeof s.student.studentID);
              }
            });
          }
          const sub = Array.isArray(data)
            ? data.find(s => {
                if (!s.student) return false;
                console.log(
                  'Comparing:',
                  String(s.student._id), 'vs', String(userId),
                  String(s.student), 'vs', String(userId),
                  String(s.student.userID), 'vs', String(userId)
                );
                return (
                  String(s.student._id) === String(userId) ||
                  String(s.student) === String(userId) ||
                  String(s.student.userID) === String(userId)
                );
              })
            : null;
          console.log('Matched submission:', sub);
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
      if (submissionType === 'file' && file) {
        for (let i = 0; i < file.length && i < 5; i++) {
          formData.append('files', file[i]);
        }
      } else if (submissionType === 'link') {
        for (let i = 0; i < links.length && i < 5; i++) {
          if (links[i]) formData.append('links', links[i]);
        }
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
          setSelectedFiles([]);
          setFile(null);
        });
    } else {
      // Optionally handle error
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
                        {submissions
                          .filter(member => {
                            if (activeTab === 'toGrade') {
                              // Show all assigned students who have not been graded (regardless of submission)
                              // Not graded: no submission, or submission with no grade/feedback
                              return !member.submission || ((member.submission.grade === undefined || member.submission.grade === null) && (!member.submission.feedback || member.submission.feedback === ''));
                            } else if (activeTab === 'graded') {
                              // Only show submissions that have a grade or feedback
                              return member.submission && (member.submission.grade !== undefined && member.submission.grade !== null || (member.submission.feedback && member.submission.feedback !== ''));
                            }
                            return false;
                          })
                          .map((member) => {
                            let status = "Not Viewed Yet";
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
                  {studentSubmission && (
                    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
                      <strong className="font-bold">Already Submitted!</strong>
                      <p className="block sm:inline"> You have already submitted this assignment.</p>
                      {/* Show all submitted files */}
                      
                      {/* Legacy single file/link support */}
                      {/* {studentSubmission.fileUrl && (
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
                      <button
                        className="mt-3 bg-red-600 text-white px-4 py-2 rounded"
                        onClick={handleUndoSubmission}
                      >
                        Undo Submission
                      </button> */}
                    </div>
                  )}
                  {/* Always show the submission form for resubmission or first submission */}
                  <form onSubmit={handleStudentSubmit} className="space-y-2" encType="multipart/form-data">
                    <label className="block text-sm font-medium mb-1">Submission Type</label>
                    <select
                      className="border rounded px-2 py-1 w-full mb-2"
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
                          className="border rounded px-2 py-1 w-full"
                          accept="*"
                          multiple
                          onChange={e => {
                            setFile(e.target.files);
                            setSelectedFiles(Array.from(e.target.files));
                          }}
                          required={!studentSubmission}
                          disabled={!!studentSubmission}
                        />
                        <div className="text-xs text-gray-600 mt-1">You can submit up to 5 files.</div>
                      </>
                    ) : (
                      <>
                        {links.map((l, idx) => (
                          <input
                            key={idx}
                            type="url"
                            className="border rounded px-2 py-1 w-full mb-1"
                            placeholder={`Paste your link here (e.g. Google Drive, GitHub, etc.)`}
                            value={l}
                            onChange={e => {
                              const newLinks = [...links];
                              newLinks[idx] = e.target.value;
                              setLinks(newLinks);
                            }}
                            required={!studentSubmission}
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
                                  <path fill="currentColor" d="M6 7V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1h3v2h-1v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9H2V7h3Zm2-1v1h8V6H8Zm10 3H6v12h12V9Z"/>
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
                                      if (["jpg","jpeg","png","gif","bmp","webp"].includes(ext)) {
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
                                        <path fill="currentColor" d="M6 7V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1h3v2h-1v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9H2V7h3Zm2-1v1h8V6H8Zm10 3H6v12h12V9Z"/>
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
                      <button
                        className="mt-3 bg-red-600 text-white px-4 py-2 rounded"
                        onClick={handleUndoSubmission}
                        type="button"
                      >
                        Undo Submission
                      </button>
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
    </div>
  );
} 