// ClassContent.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FiFile, FiBook } from "react-icons/fi";
import QuizTab from "./QuizTab";
// import fileIcon from "../../assets/file-icon.png"; // Add your file icon path
// import moduleImg from "../../assets/module-img.png"; // Add your module image path

export default function ClassContent({ selected, isFaculty = false }) {
  // --- ROUTER PARAMS ---
  const { classId } = useParams();
  const [activeLesson, setActiveLesson] = useState(null);

  // Backend lessons state
  const [backendLessons, setBackendLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonError, setLessonError] = useState(null);

  // --- DUMMY DATA (for students, fallback if no backend) ---
  const dummyData = {
    1: {
      name: "Introduction to Computing",
      lessons: [
        { id: 1, title: "What is Computing?", content: "This lesson introduces the concept of computing, data, and information." },
        { id: 2, title: "Evolution of Computers", content: "Learn the historical milestones of computers from mechanical to modern era." },
      ],
      posts: [
        { title: "Essay Submission", content: "Don't forget to submit your essay about the History of Computing by Friday." },
      ],
    },
    2: {
      name: "Fundamentals of Programming",
      lessons: [
        { id: 1, title: "Intro to Programming", content: "Overview of high-level vs low-level languages." },
      ],
      posts: [
        { title: "Coding Activity Due", content: "Submit your coding activity on variables this Friday." },
      ],
    },
    3: {
      name: "Modern Mathematics",
      lessons: [
        { id: 1, title: "Logic & Set Theory", content: "Intro to logic gates and basic set operations." },
      ],
      posts: [
        { title: "Assignment #2", content: "Solve 10 probability problems and submit by next week." },
      ],
    },
  };

  // Use dummy data if no backend data is available
  const classContent = dummyData[classId] || dummyData[1];

  // --- UI STATE ---
  const goBack = () => setActiveLesson(null);

  // Faculty-only states (dynamic content management)
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);

  // File input state for lesson upload
  const [lessonFile, setLessonFile] = useState(null);
  const [lessonUploadLoading, setLessonUploadLoading] = useState(false);
  const [lessonUploadError, setLessonUploadError] = useState(null);
  const [lessonUploadSuccess, setLessonUploadSuccess] = useState(null);

  // --- MEMBERS TAB STATE ---
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [facultyMembers, setFacultyMembers] = useState([]);
  const [studentMembers, setStudentMembers] = useState([]);

  // --- PROGRESS STATE ---
  // { [lessonId_fileUrl]: { lastPage, totalPages } }
  const [fileProgress, setFileProgress] = useState({});

  // Fetch lessons from backend
  useEffect(() => {
    if (selected === "materials") {
      setLessonsLoading(true);
      setLessonError(null);
      const token = localStorage.getItem('token');
      fetch(`http://localhost:5000/lessons?classID=${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setBackendLessons(data);
          else setBackendLessons([]);
        })
        .catch(() => setLessonError("Failed to fetch lessons."))
        .finally(() => setLessonsLoading(false));
    }
  }, [selected, classId, lessonUploadSuccess]);

  useEffect(() => {
    if (selected === "members") {
      setMembersLoading(true);
      setMembersError(null);
      fetch(`http://localhost:5000/classes/${classId}/members`)
        .then(res => res.json())
        .then(data => {
          setFacultyMembers(data.faculty || []);
          setStudentMembers(data.students || []);
        })
        .catch(() => setMembersError("Failed to fetch class members."))
        .finally(() => setMembersLoading(false));
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
                const res = await fetch(`http://localhost:5000/lessons/lesson-progress?lessonId=${lesson._id}&fileUrl=${encodeURIComponent(file.fileUrl)}`, {
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
        setFileProgress(progressMap);
      };
      fetchAllProgress();
    }
  }, [selected, backendLessons]);

  // --- HANDLERS FOR ADDING CONTENT (Faculty only) ---

  // Add announcement handler
  const handleAddAnnouncement = (e) => {
    e.preventDefault();
    const form = e.target;
    const newAnnouncement = {
      id: announcements.length + 1,
      title: form.title.value,
      content: form.content.value,
    };
    setAnnouncements([...announcements, newAnnouncement]);
    setShowAnnouncementForm(false);
    form.reset();
  };

  // Add assignment handler
  const handleAddAssignment = (e) => {
    e.preventDefault();
    const form = e.target;
    const newAssignment = {
      id: assignments.length + 1,
      title: form.title.value,
      instructions: form.instructions.value,
    };
    setAssignments([...assignments, newAssignment]);
    setShowAssignmentForm(false);
    form.reset();
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    setLessonUploadLoading(true);
    setLessonUploadError(null);
    setLessonUploadSuccess(null);
    const form = e.target;
    const title = form.title.value;
    const files = lessonFile;
    if (!files || files.length === 0) {
      setLessonUploadError("Please select at least one file.");
      setLessonUploadLoading(false);
      return;
    }
    if (files.length > 5) {
      setLessonUploadError("You can upload up to 5 files per lesson.");
      setLessonUploadLoading(false);
      return;
    }
    const formData = new FormData();
    formData.append("classID", classId);
    formData.append("title", title);
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch("http://localhost:5000/lessons", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setLessonUploadSuccess("Lesson uploaded successfully!");
        setShowLessonForm(false);
        setLessonFile(null);
        form.reset();
      } else {
        setLessonUploadError(data.error || "Failed to upload lesson.");
      }
    } catch {
      setLessonUploadError("Failed to upload lesson.");
    } finally {
      setLessonUploadLoading(false);
    }
  };

  // --- HANDLERS FOR FACULTY EDIT/DELETE ---
  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setBackendLessons(backendLessons.filter(l => l._id !== lessonId));
      } else {
        alert('Failed to delete lesson.');
      }
    } catch {
      alert('Failed to delete lesson.');
    }
  };
  const handleDeleteFile = async (lessonId, fileUrl) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/lessons/${lessonId}/file?fileUrl=${encodeURIComponent(fileUrl)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Refresh lessons
        setLessonUploadSuccess('File deleted');
      } else {
        alert('Failed to delete file.');
      }
    } catch {
      alert('Failed to delete file.');
    }
  };
  const handleEditLesson = async (lessonId, currentTitle) => {
    const newTitle = window.prompt('Edit lesson title:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/lessons/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        setLessonUploadSuccess('Lesson updated');
      } else {
        alert('Failed to update lesson.');
      }
    } catch {
      alert('Failed to update lesson.');
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

          {/* Announcements list (faculty: own, students: dummy) */}
          <div className="space-y-4">
            {(isFaculty ? announcements : classContent.posts).length > 0 ? (
              (isFaculty ? announcements : classContent.posts).map((item, index) => (
                <div key={index} className="p-4 rounded bg-blue-50 border border-blue-200 shadow-sm">
                  <h3 className="font-semibold text-blue-900">{item.title}</h3>
                  <p className="text-sm text-gray-700">{item.content}</p>
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
                onClick={() => setShowQuizBuilder(true)}
                className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
              >
                + Add Assignment or Quiz
              </button>
            )}
          </div>
          {showQuizBuilder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="relative w-full max-w-2xl mx-auto bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
                <QuizTab onClose={() => setShowQuizBuilder(false)} />
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold"
                  onClick={() => setShowQuizBuilder(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Assignment form for faculty */}
          {isFaculty && showAssignmentForm && (
            <form onSubmit={handleAddAssignment} className="mb-6 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Title</label>
                <input name="title" required className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Instructions</label>
                <textarea name="instructions" required className="w-full border rounded px-3 py-2 text-sm" rows={3} />
              </div>
              <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm">
                Save Assignment
              </button>
            </form>
          )}

          {/* Assignments list (faculty only) */}
          <div className="space-y-4">
            {isFaculty && assignments.length > 0 ? (
              assignments.map((item) => (
                <div key={item.id} className="p-4 rounded bg-blue-50 border border-blue-200 shadow-sm">
                  <h3 className="font-semibold text-blue-900">{item.title}</h3>
                  <p className="text-sm text-gray-700">{item.instructions}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-700">No assignments yet.</p>
            )}
          </div>
        </>
      )}

      {/* --- MATERIALS TAB: Lessons --- */}
      {selected === "materials" && (
        <>
          {/* Only show lesson list if not viewing a single lesson */}
          {!activeLesson && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Class Materials</h2>
                {isFaculty && (
                  <button
                    onClick={() => setShowLessonForm(!showLessonForm)}
                    className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
                  >
                    {showLessonForm ? "Cancel" : "+ Create New Lesson"}
                  </button>
                )}
              </div>

              {/* Lesson upload form for faculty */}
              {isFaculty && showLessonForm && (
                <form onSubmit={handleAddLesson} className="mb-6 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200" encType="multipart/form-data">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Title</label>
                    <input name="title" required className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Upload File (PDF only)</label>
                    <input type="file" accept=".pdf" multiple onChange={e => setLessonFile(e.target.files)} required className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  {lessonUploadLoading && <p className="text-blue-700 text-sm">Uploading...</p>}
                  {lessonUploadError && <p className="text-red-600 text-sm">{lessonUploadError}</p>}
                  {lessonUploadSuccess && <p className="text-green-600 text-sm">{lessonUploadSuccess}</p>}
                  <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm" disabled={lessonUploadLoading}>
                    Save Lesson
                  </button>
                </form>
              )}

              {/* {isFaculty && (
                <button
                  onClick={() => setShowLessonForm(!showLessonForm)}
                  className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm mb-4"
                >
                  {showLessonForm ? "Cancel" : "+ Create New Lesson"}
                </button>
              )} */}

              <p className="text-gray-700 mb-6">Select a lesson to view or download its file.</p>

              {lessonsLoading ? (
                <p className="text-blue-700">Loading lessons...</p>
              ) : lessonError ? (
                <p className="text-red-600">{lessonError}</p>
              ) : backendLessons.length === 0 ? (
                <p className="text-sm text-gray-700">No lessons yet.</p>
              ) : (
                <div className="space-y-6">
                  {backendLessons.map((lesson) => (
                    <div key={lesson._id} className="rounded-2xl shadow bg-white overflow-hidden">
                      {/* Card/Header */}
                      <div className="flex items-center bg-blue-800 rounded-t-2xl p-4">
                        <FiBook className="w-14 h-14 text-white bg-blue-900 rounded shadow mr-4 p-2" />
                        <div style={{ width: '100%' }}>
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">{lesson.title}</h2>
                            {isFaculty && (
                              <div className="flex gap-2">
                                <button onClick={() => handleEditLesson(lesson._id, lesson.title)} className="bg-yellow-400 hover:bg-yellow-500 text-xs px-2 py-1 rounded font-bold">Edit</button>
                                <button onClick={() => handleDeleteLesson(lesson._id)} className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded text-white font-bold">Delete</button>
                              </div>
                            )}
                          </div>
                          {/* Render the progress bar for the first file (or 0% if none) */}
                          {lesson.files && lesson.files.length > 0 ? (() => {
                            const file = lesson.files[0];
                            const progress = fileProgress[`${lesson._id}_${file.fileUrl}`];
                            let percent = 0;
                            if (progress && progress.totalPages > 0) {
                              percent = Math.round((progress.lastPage / progress.totalPages) * 100);
                            }
                            return (
                              <div style={{ width: '100%', marginTop: 8 }}>
                                <div style={{ background: '#e0e7ef', borderRadius: 8, height: 8, width: '100%' }}>
                                  <div style={{ background: '#00418b', height: 8, borderRadius: 8, width: `${percent}%`, transition: 'width 0.3s' }}></div>
                                </div>
                                <span style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>{percent}%</span>
                              </div>
                            );
                          })() : null}
                        </div>
                      </div>
                      {/* Table/List */}
                      <div className="p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-600 border-b">
                              <th className="text-left py-2">Section</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lesson.files && lesson.files.length > 0 ? (
                              lesson.files.map((file, idx) => {
                                return (
                                  <tr className="border-b hover:bg-gray-50" key={idx}>
                                    <td className="py-2 flex flex-col items-start">
                                      <div className="flex items-center">
                                        <FiFile className="w-5 h-5 text-blue-700 mr-2" />
                                        <a
                                          href={file.fileName && file.fileName.toLowerCase().endsWith('.pdf')
                                            ? `/web/viewer.html?file=${encodeURIComponent(file.fileUrl)}&lessonId=${lesson._id}`
                                            : file.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-700 underline hover:text-blue-900"
                                        >
                                          {file.fileName}
                                        </a>
                                        {isFaculty && (
                                          <button onClick={() => handleDeleteFile(lesson._id, file.fileUrl)} className="ml-2 text-xs bg-red-100 hover:bg-red-300 text-red-700 px-2 py-1 rounded">Delete File</button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : lesson.fileUrl && lesson.fileName ? (
                              <tr>
                                <td className="py-2 flex items-center">
                                  <FiFile className="w-5 h-5 text-blue-700 mr-2" />
                                  <a
                                    href={lesson.fileName && lesson.fileName.toLowerCase().endsWith('.pdf')
                                      ? `/web/viewer.html?file=${encodeURIComponent(lesson.fileUrl)}&lessonId=${lesson._id}`
                                      : lesson.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-700 underline hover:text-blue-900"
                                  >
                                    {lesson.fileName}
                                  </a>
                                </td>
                              </tr>
                            ) : (
                              <tr><td colSpan={5} className="text-center text-gray-400">No files</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* --- SINGLE LESSON VIEW (not currently used, but ready for future expansion) --- */}
          {activeLesson && (
            <>
              <button
                onClick={goBack}
                className="mb-4 inline-flex items-center text-sm text-blue-700 hover:underline"
              >
                ← Back to Class Materials
              </button>

              <h2 className="text-2xl font-bold mb-4">{activeLesson.title}</h2>
              <p className="text-sm text-gray-700 mb-6">{activeLesson.description || activeLesson.content}</p>
            </>
          )}
        </>
      )}

      {/* --- MEMBERS TAB: Faculty & Students --- */}
      {selected === "members" && (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Class Members</h2>
            {membersLoading && <p className="text-blue-700">Loading members...</p>}
            {membersError && <p className="text-red-600">{membersError}</p>}
            {!membersLoading && !membersError && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Faculty Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-900">Faculty</h3>
                  {facultyMembers.length === 0 ? (
                    <p className="text-gray-500">No faculty found.</p>
                  ) : (
                    <ul className="space-y-2">
                      {facultyMembers.map(fac => (
                        <li key={fac._id} className="p-3 bg-blue-50 rounded border border-blue-200">
                          <span className="font-bold">{fac.firstname} {fac.lastname}</span>
                          <span className="block text-sm text-gray-700">{fac.email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Students Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-900">Students</h3>
                  {studentMembers.length === 0 ? (
                    <p className="text-gray-500">No students found.</p>
                  ) : (
                    <ul className="space-y-2">
                      {studentMembers.map(stu => (
                        <li key={stu._id} className="p-3 bg-blue-50 rounded border border-blue-200">
                          <span className="font-bold">{stu.firstname} {stu.lastname}</span>
                          <span className="block text-sm text-gray-700">{stu.email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
