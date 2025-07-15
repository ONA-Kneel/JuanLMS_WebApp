// ClassContent.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiFile, FiBook, FiMessageSquare } from "react-icons/fi";
import QuizTab from "./ActivityTab";
import { MoreVertical } from "lucide-react";
import ValidationModal from './ValidationModal';
// import fileIcon from "../../assets/file-icon.png"; // Add your file icon path
// import moduleImg from "../../assets/module-img.png"; // Add your module image path

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  const [allStudents, setAllStudents] = useState([]);
  const [editingMembers, setEditingMembers] = useState(false);
  const [newStudentIDs, setNewStudentIDs] = useState([]);
  
  // Validation modal state
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });
  
  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Helper function to check if assignment is posted
  const isAssignmentPosted = (assignment) => {
    if (!assignment.postAt) return true; // If no postAt, consider it posted
    const now = new Date();
    const postAt = new Date(assignment.postAt);
    return postAt <= now;
  };

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

  // Fetch assignments and quizzes from backend
  useEffect(() => {
    if (selected === "classwork" && classId) {
      setAssignmentsLoading(true);
      setAssignmentError(null);
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('role');

      // Fetch both assignments and quizzes in parallel
      Promise.all([
        fetch(`${API_BASE}/assignments?classID=${classId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE}/api/quizzes?classID=${classId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : [])
      ])
      .then(([assignmentsData, quizzesData]) => {
        const merged = [
          ...(Array.isArray(assignmentsData) ? assignmentsData : []),
          ...(Array.isArray(quizzesData) ? quizzesData : [])
        ];
        // Filter for this class (should be redundant, but safe)
        const filtered = merged.filter(a =>
          a.classID === classId ||
          (Array.isArray(a.assignedTo) && a.assignedTo.some(at => String(at.classID) === String(classId)))
        );
        console.log("Filtered assignments/quizzes for class", classId, filtered);

        // If user is a student, fetch their submissions to filter out completed assignments
        if (userRole === 'students') {
          Promise.all(filtered.map(assignment =>
            fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(async res => {
              if (!res.ok) {
                console.warn(`Failed to fetch submissions for assignment ${assignment._id}`);
                return [];
              }
              return res.json();
            }).catch(err => {
              console.warn(`Error fetching submissions for assignment ${assignment._id}:`, err);
              return [];
            })
          )).then(submissionsArrays => {
            const assignmentsWithSubmission = filtered.map((assignment, i) => ({
              ...assignment,
              hasSubmitted: submissionsArrays[i] && submissionsArrays[i].length > 0
            }));
            setAssignments(assignmentsWithSubmission);
            setAssignmentsLoading(false);
          }).catch(err => {
            console.error('Error processing submissions:', err);
            setAssignments(filtered);
            setAssignmentsLoading(false);
          });
        } else {
          setAssignments(filtered);
          setAssignmentsLoading(false);
        }
      })
      .catch(err => {
        console.error('Error fetching assignments/quizzes:', err);
        setAssignmentError('Failed to fetch assignments/quizzes. Please try again.');
        setAssignmentsLoading(false);
      });
    }
  }, [selected, classId]);

  // Fetch members when "members" tab is selected
  // useEffect(() => {
  //   if (selected === "members" && classId) {
  //     setMembersLoading(true);
  //     setMembersError(null);
  //     const token = localStorage.getItem('token');
  //     fetch(`${API_BASE}/classes/${classId}/members`, {
  //       headers: { 'Authorization': `Bearer ${token}` }
  //     })
  //       .then(res => res.json())
  //       .then(data => setMembers(data && typeof data === 'object' ? data : { faculty: [], students: [] }))
  //       .catch(() => setMembersError("Failed to fetch members."))
  //       .finally(() => setMembersLoading(false));
  //   }
  // }, [selected, classId]);

  useEffect(() => {
  if (selected === "members" && classId) {
    setMembersLoading(true);
    setMembersError(null);
    const token = localStorage.getItem('token');

    // Step 1: Fetch members of the class
    fetch(`${API_BASE}/classes/${classId}/members`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMembers(data && typeof data === 'object' ? data : { faculty: [], students: [] }))
      .catch(() => setMembersError("Failed to fetch members."))
      .finally(() => setMembersLoading(false));

    // Step 2: Fetch all students only if the user is faculty
    if (isFaculty) {
      fetch(`${API_BASE}/users/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setAllStudents(Array.isArray(data) ? data : []))
        .catch(() => setMembersError("Failed to fetch students."));
    }
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
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Add Announcement Failed',
          message: 'Failed to add announcement. Please try again.'
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to add announcement due to network error. Please check your connection and try again.'
      });
    }
  };

  // --- HANDLERS FOR ANNOUNCEMENTS ---
  const handleDeleteAnnouncement = async (id) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Announcement',
      message: 'Are you sure you want to delete this announcement?',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/announcements/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setAnnouncements(announcements.filter(a => a._id !== id));
            setValidationModal({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: 'Announcement deleted successfully.'
            });
          } else {
            setValidationModal({
              isOpen: true,
              type: 'error',
              title: 'Delete Failed',
              message: 'Failed to delete announcement. Please try again.'
            });
          }
        } catch {
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete announcement due to network error. Please check your connection and try again.'
          });
        }
      }
    });
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
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Announcement updated successfully.'
        });
      } else {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update announcement. Please try again.'
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to update announcement due to network error. Please check your connection and try again.'
      });
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
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please provide a title and at least one file.'
      });
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
        const newLesson = await res.json();
        setBackendLessons(lessons => [...lessons, newLesson]);
      } else {
        const data = await res.json();
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Upload Failed',
          message: data.error || "Failed to upload lesson. Please try again."
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to upload lesson due to network error. Please check your connection and try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  // --- HANDLERS FOR LESSON DELETE/EDIT (Faculty only) ---
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState("");
  const [newFiles, setNewFiles] = useState([]);

  // Show edit form for lesson
  const handleEditLessonFiles = (lessonId, currentTitle) => {
    setEditingLessonId(lessonId);
    setEditingLessonTitle(currentTitle);
    setNewFiles([]);
  };

  // Save lesson title change
  const handleSaveLessonTitle = async (lessonId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/lessons/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: editingLessonTitle })
      });
      if (res.ok) {
        setBackendLessons(backendLessons.map(l => l._id === lessonId ? { ...l, title: editingLessonTitle } : l));
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Lesson title updated successfully!'
        });
      } else {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update lesson title. Please try again.'
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to update lesson title due to network error. Please check your connection and try again.'
      });
    }
  };

  // Upload new files to lesson (requires backend PATCH/POST endpoint, not currently implemented)
  const handleAddFilesToLesson = async (lessonId) => {
    if (newFiles.length === 0) return;
    const token = localStorage.getItem('token');
    const formData = new FormData();
    for (let file of newFiles) {
      formData.append('files', file);
    }
    try {
      const res = await fetch(`${API_BASE}/lessons/${lessonId}/files`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setBackendLessons(backendLessons.map(l => l._id === lessonId ? data.lesson : l));
        setNewFiles([]);
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Files uploaded successfully!'
        });
      } else {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Upload Failed',
          message: 'Failed to upload new files. Please try again.'
        });
      }
    } catch {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to upload new files due to network error. Please check your connection and try again.'
      });
    }
  };

  const handleDeleteLessonFile = async (lessonId, fileUrl) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete File',
      message: 'Are you sure you want to delete this file from the material?',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`${API_BASE}/lessons/${lessonId}/file?fileUrl=${encodeURIComponent(fileUrl)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setBackendLessons(backendLessons.map(l => l._id === lessonId ? { ...l, files: l.files.filter(f => f.fileUrl !== fileUrl) } : l));
            setValidationModal({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: 'File deleted successfully.'
            });
          } else {
            setValidationModal({
              isOpen: true,
              type: 'error',
              title: 'Delete Failed',
              message: 'Failed to delete file. Please try again.'
            });
          }
        } catch {
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete file due to network error. Please check your connection and try again.'
          });
        }
      }
    });
  };

  const handleDeleteLesson = async (lessonId) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Material',
      message: 'Are you sure you want to delete this material and all its files?',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`${API_BASE}/lessons/${lessonId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setBackendLessons(backendLessons.filter(l => l._id !== lessonId));
            setValidationModal({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: 'Material deleted successfully.'
            });
          } else {
            setValidationModal({
              isOpen: true,
              type: 'error',
              title: 'Delete Failed',
              message: 'Failed to delete material. Please try again.'
            });
          }
        } catch {
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete material due to network error. Please check your connection and try again.'
          });
        }
      }
    });
  };

  // --- MAIN RENDER ---
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
              <div className="relative inline-block" ref={dropdownRef}>
                <button
                  className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm flex items-center gap-2"
                  onClick={() => setShowDropdown((prev) => !prev)}
                >
                  + Create
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10">
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => { setShowDropdown(false); navigate('/create-assignment'); }}
                    >
                      <span className="material-icons">Assignment</span> 
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => { setShowDropdown(false); navigate('/create-quiz'); }}
                    >
                      <span className="material-icons">Quiz</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Assignment/Quiz list (Teams-style cards, clickable) */}
          <div className="space-y-4">
            {assignmentsLoading ? (
              <p className="text-blue-700">Loading assignments...</p>
            ) : assignmentError ? (
              <p className="text-red-600">{assignmentError}</p>
            ) : assignments.length > 0 ? (
              assignments.map((item) => {
                const isPosted = isAssignmentPosted(item);
                return (
                  <div
                    key={item._id}
                    className={`p-4 rounded-xl border shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer transition relative ${
                      isPosted 
                        ? 'bg-white border-blue-200 hover:bg-blue-50' 
                        : 'bg-gray-100 border-gray-300 opacity-75'
                    }`}
                    onClick={() => {
                      if (item.type === 'quiz') {
                        if (isFaculty) {
                          navigate(`/quiz/${item._id}/responses`);
                        } else {
                          navigate(`/quiz/${item._id}`);
                        }
                      } else {
                        navigate(`/assignment/${item._id}`);
                      }
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${item.type === 'quiz' ? 'bg-purple-200 text-purple-800' : 'bg-green-200 text-green-800'}`}>
                          {item.type === 'quiz' ? 'Quiz' : 'Assignment'}
                        </span>
                        {!isPosted && isFaculty && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-gray-500 text-white">
                            Not Posted Yet
                          </span>
                        )}
                      </div>
                      <span className={`text-lg font-bold ${isPosted ? 'text-blue-900' : 'text-gray-600'}`}>{item.title}</span>
                      <div className={`text-sm mt-1 ${isPosted ? 'text-gray-700' : 'text-gray-500'}`}>{item.instructions}</div>
                      {item.dueDate && (
                        <div className={`text-xs mt-1 ${isPosted ? 'text-gray-500' : 'text-gray-400'}`}>
                          Due: {new Date(item.dueDate).toLocaleString()}
                        </div>
                      )}
                      {item.points && (
                        <div className={`text-xs ${isPosted ? 'text-gray-500' : 'text-gray-400'}`}>
                          Points: {item.points}
                        </div>
                      )}
                      {!isPosted && item.postAt && isFaculty && (
                        <div className="text-xs text-blue-600 mt-1">
                          Will be posted: {new Date(item.postAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {/* Faculty-only menu */}
                    {isFaculty && (
                      <div className="absolute top-2 right-2">
                                              <Menu 
                        assignment={item} 
                        onDelete={id => setAssignments(assignments => assignments.filter(a => a._id !== id))}
                        onUpdate={(updatedAssignment) => setAssignments(assignments => 
                          assignments.map(a => a._id === updatedAssignment._id ? updatedAssignment : a)
                        )}
                        setValidationModal={setValidationModal}
                        setConfirmationModal={setConfirmationModal}
                      />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p>No assignments or quizzes found.</p>
            )}
          </div>
        </>
      )}

      {/* --- CLASS MATERIALS TAB: Lessons --- */}
      {selected === "materials" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Class Materials</h2>
            {isFaculty && !showLessonForm && (
              <button
                className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
                onClick={() => setShowLessonForm(true)}
              >
                + Add Material
              </button>
            )}
          </div>
        {isFaculty && showLessonForm && (
          <form
            onSubmit={handleLessonUpload}
            className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-6 flex flex-col gap-4 w-full max-w-3xl"
            style={{ minWidth: 600 }}
          >
            <div className="flex flex-col gap-1">
              <label className="font-semibold">Lesson Title</label>
              <input
                type="text"
                value={lessonTitle}
                onChange={e => setLessonTitle(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold">Files</label>
              <input
                type="file"
                multiple
                onChange={e => setLessonFiles([...lessonFiles, ...Array.from(e.target.files)])}
                className="border rounded px-3 py-2 w-full"
              />
              {lessonFiles.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {lessonFiles.map((file, idx) => (
                    <li key={idx} className="bg-gray-100 px-3 py-1 rounded flex items-center gap-2">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 text-xs font-bold"
                        onClick={() => setLessonFiles(lessonFiles.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm"
                disabled={uploading || lessonFiles.length === 0}
              >
                {uploading ? "Uploading..." : "Save Module"}
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
                  {isFaculty && (
                    <div className="flex gap-2">
                      {editingLessonId !== lesson._id && (
                        <button
                          className="bg-yellow-400 hover:bg-yellow-500 text-xs px-2 py-1 rounded font-bold"
                          onClick={() => handleEditLessonFiles(lesson._id, lesson.title)}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Table */}
                <div className="bg-white">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-2 font-semibold">Section</th>
                        {isFaculty && <th className="px-6 py-2 font-semibold">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.files && lesson.files.length > 0 ? (
                        lesson.files.map(file => {
                          const fileUrl = file.fileUrl.startsWith('http') ? file.fileUrl : `${API_BASE}/${file.fileUrl.replace(/^\/+/,'')}`;
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
                              {isFaculty && editingLessonId === lesson._id && (
                                <td className="px-6 py-2">
                                  <button
                                    className="bg-red-500 hover:bg-red-700 text-xs px-2 py-1 rounded text-white font-bold"
                                    onClick={() => handleDeleteLessonFile(lesson._id, file.fileUrl)}
                                  >
                                    Remove
                                  </button>
                                </td>
                              )}
                              {isFaculty && editingLessonId !== lesson._id && <td className="px-6 py-2"></td>}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td className="px-6 py-2" colSpan={isFaculty ? 2 : 1}>No files uploaded.</td>
                        </tr>
                      )}
                      {/* Add new files UI if editing this lesson */}
                      {isFaculty && editingLessonId === lesson._id && (
                        <tr>
                          <td className="px-6 py-2" colSpan={2}>
                            <div className="mb-2 flex items-center gap-2">
                              <label className="block text-xs font-semibold mb-1">Lesson Title</label>
                              <input
                                type="text"
                                value={editingLessonTitle}
                                onChange={e => setEditingLessonTitle(e.target.value)}
                                className="border rounded px-2 py-1 w-full"
                              />
                              <button
                                className="bg-green-700 text-white px-3 py-1 rounded text-xs"
                                onClick={() => handleSaveLessonTitle(lesson._id)}
                              >
                                Save Title
                              </button>
                            </div>
                            <input
                              type="file"
                              multiple
                              onChange={e => setNewFiles([...newFiles, ...Array.from(e.target.files)])}
                              className="border rounded px-2 py-1"
                            />
                            <button
                              className="bg-blue-900 text-white px-3 py-1 rounded ml-2 text-xs"
                              onClick={() => handleAddFilesToLesson(lesson._id)}
                            >
                              Upload New Files
                            </button>
                            <div className="mt-4 flex justify-end gap-2">
                              <button
                                className="bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold"
                                onClick={() => setEditingLessonId(null)}
                              >
                                Save
                              </button>
                              <button
                                className="bg-gray-400 text-white px-4 py-2 rounded text-sm font-semibold"
                                onClick={() => setEditingLessonId(null)}
                              >
                                Cancel
                              </button>
                              <button
                                className="bg-red-600 hover:bg-red-700 text-sm px-4 py-2 rounded font-semibold text-white"
                                onClick={() => handleDeleteLesson(lesson._id)}
                              >
                                Delete Module
                              </button>
                            </div>
                          </td>
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
      {/* {selected === "members" && (
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
      )} */}

      {selected === "members" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Members</h2>
          {membersLoading ? (
            <p className="text-blue-700">Loading members...</p>
          ) : membersError ? (
            <p className="text-red-600">{membersError}</p>
          ) : (
            <>
              <h3 className="font-semibold text-blue-900 mt-2 mb-1">
                Faculty
              </h3>
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

              <h3 className="font-semibold text-blue-900 mt-4 mb-1 flex items-center gap-2">
                Students
                {isFaculty && (
                  <button
                    className="text-sm text-blue-700 underline"
                    onClick={() => {
                      setEditingMembers(true);
                      setNewStudentIDs(members.students.map(s => s.userID));
                    }}
                  >
                    Edit Members
                  </button>
                )}
              </h3>

              {editingMembers ? (
                <div className="mt-2">
                  <label className="font-medium text-blue-800">Select Students</label>
                  <select
                    multiple
                    className="w-full border rounded px-2 py-2 mt-1"
                    value={newStudentIDs}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
                      setNewStudentIDs(selectedOptions);
                    }}
                  >
                    {allStudents.map(student => (
                      <option key={student.userID} value={student.userID}>
                        {student.firstname} {student.lastname}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('token');
                        try {
                          const res = await fetch(`${API_BASE}/classes/${classId}/members`, {
                            method: 'PATCH',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ members: newStudentIDs })
                          });
                          if (res.ok) {
                            const updated = await res.json();
                            setMembers(updated);
                            setEditingMembers(false);
                            setValidationModal({
                              isOpen: true,
                              type: 'success',
                              title: 'Success',
                              message: 'Class members updated successfully!'
                            });
                          } else {
                            setValidationModal({
                              isOpen: true,
                              type: 'error',
                              title: 'Update Failed',
                              message: 'Failed to update members. Please try again.'
                            });
                          }
                        } catch {
                          setValidationModal({
                            isOpen: true,
                            type: 'error',
                            title: 'Network Error',
                            message: 'Error updating members due to network error. Please check your connection and try again.'
                          });
                        }
                      }}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingMembers(false)}
                      className="bg-gray-400 text-white px-3 py-1 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                members.students.length > 0 ? (
                  <ul>
                    {members.students.map(s => (
                      <li key={s._id}>
                        {s.firstname} {s.lastname} (Student)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700">No students found.</p>
                )
              )}
            </>
          )}
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

      {/* Confirmation Modal */}
      <ValidationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
        type="warning"
        title={confirmationModal.title}
        message={confirmationModal.message}
        onConfirm={confirmationModal.onConfirm}
        confirmText="Confirm"
        showCancel={true}
        cancelText="Cancel"
      />
    </div>
  );
}

// Add Menu component at the bottom of the file
function Menu({ assignment, onDelete, onUpdate, setValidationModal, setConfirmationModal }) {
  const isPosted = () => {
    if (!assignment.postAt) return true;
    const now = new Date();
    const postAt = new Date(assignment.postAt);
    return postAt <= now;
  };
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const handleDelete = async () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Assignment',
      message: 'Are you sure you want to delete this assignment? This action cannot be undone.',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        const url = assignment.type === 'quiz'
          ? `${API_BASE}/api/quizzes/${assignment._id}`
          : `${API_BASE}/assignments/${assignment._id}`;
        try {
          const res = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            if (onDelete) onDelete(assignment._id);
            setValidationModal({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: 'Assignment deleted successfully.'
            });
          } else {
            const err = await res.json();
            let errorMessage = err.error || `HTTP ${res.status}: ${res.statusText}`;
            let errorTitle = 'Delete Failed';
            // Handle specific error cases
            if (res.status === 400) {
              errorTitle = 'Invalid Request';
              errorMessage = 'Invalid assignment ID or request format.';
            } else if (res.status === 401) {
              errorTitle = 'Authentication Error';
              errorMessage = 'Your session has expired. Please log in again.';
            } else if (res.status === 403) {
              errorTitle = 'Permission Denied';
              errorMessage = 'You do not have permission to delete this assignment.';
            } else if (res.status === 404) {
              errorTitle = 'Not Found';
              errorMessage = 'Assignment not found. It may have already been deleted.';
            } else if (res.status >= 500) {
              errorTitle = 'Server Error';
              errorMessage = 'A server error occurred. Please try again later.';
            }
            setValidationModal({
              isOpen: true,
              type: 'error',
              title: errorTitle,
              message: errorMessage
            });
          }
        } catch (err) {
          console.error('Network error:', err);
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete assignment due to network error. Please check your connection and try again.'
          });
        }
      }
    });
  };

  const handlePostNow = async () => {
    setIsPosting(true);
    const token = localStorage.getItem('token');
    const url = assignment.type === 'quiz'
      ? `${API_BASE}/api/quizzes/${assignment._id}`
      : `${API_BASE}/assignments/${assignment._id}`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postAt: new Date().toISOString() })
      });
      if (res.ok) {
        const updatedAssignment = await res.json();
        // Update the assignment in the local state seamlessly
        if (onUpdate) {
          onUpdate(updatedAssignment);
        }
        setValidationModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Assignment posted successfully! Students can now see this assignment.'
        });
      } else {
        const err = await res.json();
        let errorMessage = err.error || `HTTP ${res.status}: ${res.statusText}`;
        let errorTitle = 'Post Failed';
        // Handle specific error cases
        if (res.status === 400) {
          errorTitle = 'Invalid Request';
          errorMessage = 'Invalid assignment data or request format.';
        } else if (res.status === 401) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (res.status === 403) {
          errorTitle = 'Permission Denied';
          errorMessage = 'You do not have permission to post this assignment.';
        } else if (res.status === 404) {
          errorTitle = 'Not Found';
          errorMessage = 'Assignment not found. It may have been deleted.';
        } else if (res.status >= 500) {
          errorTitle = 'Server Error';
          errorMessage = 'A server error occurred. Please try again later.';
        }
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: errorTitle,
          message: errorMessage
        });
      }
    } catch (err) {
      console.error('Network error:', err);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Failed to post assignment due to network error. Please check your connection and try again.'
      });
    } finally {
      setIsPosting(false);
    }
  };
  return (
    <div className="relative">
      <button
        className="p-1 rounded-full hover:bg-gray-200"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
      >
        <MoreVertical size={24} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-20">
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={e => {
              e.stopPropagation();
              setOpen(false);
              if (assignment.type === 'quiz') {
                navigate(`/create-quiz?edit=${assignment._id}`);
              } else {
                navigate(`/create-assignment?edit=${assignment._id}`);
              }
            }}
          >
            Edit
          </button>
          {!isPosted() && (
            <button
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                isPosting ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600'
              }`}
              onClick={e => { 
                e.stopPropagation(); 
                setOpen(false); 
                if (!isPosting) handlePostNow(); 
              }}
              disabled={isPosting}
            >
              {isPosting ? 'Posting...' : 'Post Now'}
            </button>
          )}
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
            onClick={e => { e.stopPropagation(); setOpen(false); handleDelete(); }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}