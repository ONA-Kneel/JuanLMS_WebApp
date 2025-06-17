// ClassContent.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiFile, FiBook, FiMessageSquare } from "react-icons/fi";
import QuizTab from "./QuizTab";
// import fileIcon from "../../assets/file-icon.png"; // Add your file icon path
// import moduleImg from "../../assets/module-img.png"; // Add your module image path

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function ClassContent({ selected, isFaculty = false }) {
  // --- ROUTER PARAMS ---
  const { classId } = useParams();
  const navigate = useNavigate();

  // Backend lessons state
  const [backendLessons, setBackendLessons] = useState([]);

  // --- UI STATE ---

  // Faculty-only states (dynamic content management)
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementError, setAnnouncementError] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);

  // --- PROGRESS STATE ---
  // { [lessonId_fileUrl]: { lastPage, totalPages } }
  // Remove unused: fileProgress

  // Members state (faculty and students)
  const [members, setMembers] = useState({ faculty: [], students: [] });
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);

  // Restore lesson upload state and handler
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonFiles, setLessonFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Fetch lessons from backend
  useEffect(() => {
    if (selected === "materials") {
      setAnnouncementsLoading(true);
      setAnnouncementError(null);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/lessons?classID=${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setBackendLessons(data);
          else setBackendLessons([]);
        })
        .catch(() => setAnnouncementError("Failed to fetch lessons."))
        .finally(() => setAnnouncementsLoading(false));
    }
  }, [selected, classId]);

  // Fetch progress for all files in all lessons
  useEffect(() => {
    if (selected === "materials" && backendLessons.length > 0) {
      const token = localStorage.getItem('token');
      const fetchAllProgress = async () => {
        const progressMap = {};
        for (const lesson of backendLessons) {
          if (lesson.files && lesson.files.length > 0) {
            for (const file of lesson.files) {
              try {
                const res = await fetch(`${API_BASE}/lessons/lesson-progress?lessonId=${lesson._id}&fileUrl=${encodeURIComponent(file.fileUrl)}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data && data.lastPage && data.totalPages) {
                  progressMap[`${lesson._id}_${file.fileUrl}`] = { lastPage: data.lastPage, totalPages: data.totalPages };
                }
              } catch { /* ignore progress fetch errors */ }
            }
          }
        }
        // setFileProgress(progressMap);
      };
      fetchAllProgress();
    }
  }, [selected, backendLessons]);

  // Fetch announcements from backend
  useEffect(() => {
    if (selected === "home") {
      setAnnouncementsLoading(true);
      setAnnouncementError(null);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/announcements?classID=${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setAnnouncements(Array.isArray(data) ? data : []))
        .catch(() => setAnnouncementError("Failed to fetch announcements."))
        .finally(() => setAnnouncementsLoading(false));
    }
  }, [selected, classId]);

  // Fetch assignments from backend
  useEffect(() => {
    if (selected === "classwork" && classId) {
      setAssignmentsLoading(true);
      setAssignmentError(null);
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('role');
      const userId = localStorage.getItem('userID');

      // First fetch all assignments
      fetch(`${API_BASE}/assignments?classID=${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          // Support both classID (string) and classIDs (array)
          const filtered = Array.isArray(data)
            ? data.filter(a => a.classID === classId || (Array.isArray(a.classIDs) && a.classIDs.includes(classId)))
            : [];

          // If user is a student, fetch their submissions to filter out completed assignments
          if (userRole === 'students') {
            Promise.all(filtered.map(assignment =>
              fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).then(res => res.json())
            )).then(submissionsArrays => {
              // Filter out assignments that have been submitted by the student
              const activeAssignments = filtered.filter((assignment, index) => {
                const submissions = submissionsArrays[index];
                const studentSubmission = Array.isArray(submissions) 
                  ? submissions.find(s => s.student && (s.student._id === userId || s.student === userId))
                  : null;
                return !studentSubmission; // Keep only assignments without submissions
              });
              setAssignments(activeAssignments);
            });
          } else {
            // For faculty, show all assignments
            setAssignments(filtered);
          }
        })
        .catch(() => setAssignmentError("Failed to fetch assignments."))
        .finally(() => setAssignmentsLoading(false));
    }
  }, [selected, classId]);

  // Fetch members when "members" tab is selected
  useEffect(() => {
    if (selected === "members" && classId) {
      setMembersLoading(true);
      setMembersError(null);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/classes/${classId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setMembers(data && typeof data === 'object' ? data : { faculty: [], students: [] }))
        .catch(() => setMembersError("Failed to fetch members."))
        .finally(() => setMembersLoading(false));
    }
  }, [selected, classId]);

  // --- HANDLERS FOR ADDING CONTENT (Faculty only) ---

  // Add announcement handler
  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    const form = e.target;
    const title = form.title.value;
    const content = form.content.value;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/announcements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ classID: classId, title, content })
      });
      if (res.ok) {
        setAnnouncementsLoading(true);
        fetch(`${API_BASE}/announcements?classID=${classId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setAnnouncements(Array.isArray(data) ? data : []))
          .finally(() => setAnnouncementsLoading(false));
    setShowAnnouncementForm(false);
    form.reset();
      } else {
        alert('Failed to add announcement.');
      }
    } catch {
      alert('Failed to add announcement.');
    }
  };

  // --- HANDLERS FOR ANNOUNCEMENTS ---
  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAnnouncements(announcements.filter(a => a._id !== id));
      else alert('Failed to delete announcement.');
    } catch {
      alert('Failed to delete announcement.');
    }
  };
  const handleEditAnnouncement = async (id, currentTitle, currentContent) => {
    const newTitle = window.prompt('Edit title:', currentTitle);
    if (!newTitle) return;
    const newContent = window.prompt('Edit content:', currentContent);
    if (!newContent) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/announcements/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle, content: newContent })
      });
      if (res.ok) {
        setAnnouncements(announcements.map(a => a._id === id ? { ...a, title: newTitle, content: newContent } : a));
      } else {
        alert('Failed to update announcement.');
      }
    } catch {
      alert('Failed to update announcement.');
    }
  };

  // --- COMPONENT: Renders a single lesson item (not used in main render, but kept for possible future use) ---
  function LessonItem({ lesson }) {
    const [expanded, setExpanded] = useState(false);
    return (
      <div
        className="p-4 rounded bg-blue-50 border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-100 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-blue-900">{lesson.title}</h3>
        {expanded && <p className="text-sm text-gray-700 mt-2">{lesson.description}</p>}
      </div>
    );
  }

  // --- HANDLERS FOR LESSON UPLOAD ---
  const handleLessonUpload = async (e) => {
    e.preventDefault();
    if (!lessonTitle || lessonFiles.length === 0) {
      alert("Please provide a title and at least one PDF file.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("classID", classId);
    formData.append("title", lessonTitle);
    for (let file of lessonFiles) {
      formData.append("files", file);
    }
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/lessons`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        setShowLessonForm(false);
        setLessonTitle("");
        setLessonFiles([]);
        // Optionally, refresh lessons list
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload lesson.");
      }
    } catch {
      alert("Failed to upload lesson.");
    } finally {
      setUploading(false);
    }
  };

  // --- MAIN RENDER ---
  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8 ">
      {/* --- HOME TAB: Announcements --- */}
      {selected === "home" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Home Page</h2>
            {isFaculty && (
              <button
                onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
              >
                {showAnnouncementForm ? "Cancel" : "+ Create New Announcement"}
              </button>
            )}
          </div>

          {/* Announcement form for faculty */}
          {isFaculty && showAnnouncementForm && (
            <form onSubmit={handleAddAnnouncement} className="mb-6 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Title</label>
                <input name="title" required className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Content</label>
                <textarea name="content" required className="w-full border rounded px-3 py-2 text-sm" rows={3} />
              </div>
              <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm">
                Save Announcement
              </button>
            </form>
          )}

          {/* Announcements list (faculty: backend, students: backend) */}
          <div className="space-y-4">
            {announcementsLoading ? (
              <p className="text-blue-700">Loading announcements...</p>
            ) : announcementError ? (
              <p className="text-red-600">{announcementError}</p>
            ) : announcements.length > 0 ? (
              announcements.map((item) => (
                <div key={item._id} className="p-4 rounded bg-blue-50 border border-blue-200 shadow-sm flex justify-between items-start">
                  <div>
                  <h3 className="font-semibold text-blue-900">{item.title}</h3>
                  <p className="text-sm text-gray-700">{item.content}</p>
                  </div>
                  {isFaculty && (
                    <div className="flex gap-2">
                      <button onClick={() => handleEditAnnouncement(item._id, item.title, item.content)} className="bg-yellow-400 hover:bg-yellow-500 text-xs px-2 py-1 rounded font-bold">Edit</button>
                      <button onClick={() => handleDeleteAnnouncement(item._id)} className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded text-white font-bold">Delete</button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-700">No announcements yet.</p>
            )}
          </div>
        </>
      )}

      {/* --- CLASSWORK TAB: Assignments --- */}
      {selected === "classwork" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Classwork</h2>
            {isFaculty && (
              <button
                className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
                onClick={() => navigate('/create-activity')}
              >
                + Create Assignment or Quiz
              </button>
            )}
          </div>
          {/* Assignment/Quiz list (Teams-style cards, clickable) */}
          <div className="space-y-4">
            {assignmentsLoading ? (
              <p className="text-blue-700">Loading assignments...</p>
            ) : assignmentError ? (
              <p className="text-red-600">{assignmentError}</p>
            ) : assignments.length > 0 ? (
              assignments.map((item) => (
                <div
                  key={item._id}
                  className="p-4 rounded-xl bg-white border border-blue-200 shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer hover:bg-blue-50 transition"
                  onClick={() => navigate(`/assignment/${item._id}`)}
                >
                  <div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold mr-2 ${item.type === 'quiz' ? 'bg-purple-200 text-purple-800' : 'bg-green-200 text-green-800'}`}>{item.type === 'quiz' ? 'Quiz' : 'Assignment'}</span>
                    <span className="text-lg font-bold text-blue-900">{item.title}</span>
                    <div className="text-gray-700 text-sm mt-1">{item.instructions}</div>
                    {item.dueDate && <div className="text-xs text-gray-500 mt-1">Due: {new Date(item.dueDate).toLocaleString()}</div>}
                    {item.points && <div className="text-xs text-gray-500">Points: {item.points}</div>}
                  </div>
                </div>
              ))
            ) : (
              <p>No assignments found.</p>
            )}
          </div>
        </>
      )}

      {/* --- CLASS MATERIALS TAB: Lessons --- */}
      {selected === "materials" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Class Materials</h2>
            {isFaculty && (
              <>
                <button
                  className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
                  onClick={() => setShowLessonForm(true)}
                >
                  + Add Material
                </button>
                {showLessonForm && (
                  <form
                    onSubmit={handleLessonUpload}
                    className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4 flex flex-col gap-2"
                    style={{ maxWidth: 400 }}
                  >
                    <label className="font-semibold">Lesson Title</label>
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={e => setLessonTitle(e.target.value)}
                      className="border rounded px-2 py-1"
                      required
                    />
                    <label className="font-semibold">PDF Files</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={e => setLessonFiles([...e.target.files])}
                      className="border rounded px-2 py-1"
                      required
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="submit"
                        className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm"
                        disabled={uploading}
                      >
                        {uploading ? "Uploading..." : "Upload"}
                      </button>
                      <button
                        type="button"
                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 text-sm"
                        onClick={() => setShowLessonForm(false)}
                        disabled={uploading}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
          {/* Card/Table style for lessons */}
          {backendLessons.length > 0 ? (
            backendLessons.map(lesson => (
              <div key={lesson._id} className="rounded-xl shadow border border-gray-200 mb-6 overflow-hidden">
                {/* Blue header */}
                <div className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <span className="font-bold text-lg">{lesson.title}</span>
                  </div>
                  
                </div>
                {/* Table */}
                <div className="bg-white">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-2 font-semibold">Section</th>
                        
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.files && lesson.files.length > 0 ? (
                        lesson.files.map(file => {
                          // Ensure fileUrl is absolute (starts with http) or prefix with API_BASE
                          const fileUrl = file.fileUrl.startsWith('http') ? file.fileUrl : `${API_BASE}/${file.fileUrl.replace(/^\/+/, '')}`;
                          return (
                            <tr key={file.fileUrl} className="border-b hover:bg-gray-50">
                              <td className="px-6 py-2 flex items-center gap-2">
                                <span className="text-blue-700">📄</span>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-700 underline"
                                >
                                  {file.fileName}
                                </a>
                              </td>
                              
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td className="px-6 py-2" colSpan={2}>No files uploaded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-700">No materials yet.</p>
          )}
        </>
      )}

      {/* --- MEMBERS TAB --- */}
      {selected === "members" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Members</h2>
          {membersLoading ? (
            <p className="text-blue-700">Loading members...</p>
          ) : membersError ? (
            <p className="text-red-600">{membersError}</p>
          ) : (
            <>
              <h3 className="font-semibold text-blue-900 mt-2 mb-1">Faculty</h3>
              {members.faculty.length > 0 ? (
                <ul>
                  {members.faculty.map(f => (
                    <li key={f._id}>
                      {f.firstname} {f.lastname} (Faculty)
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-700">No faculty found.</p>
              )}
              <h3 className="font-semibold text-blue-900 mt-4 mb-1">Students</h3>
              {members.students.length > 0 ? (
                <ul>
                  {members.students.map(s => (
                    <li key={s._id}>
                      {s.firstname} {s.lastname} (Student)
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-700">No students found.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}