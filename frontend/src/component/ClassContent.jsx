// ClassContent.jsx
import { useState } from "react";
import { useParams } from "react-router-dom";

export default function ClassContent({ selected, isFaculty = false }) {
  const { classId } = useParams();
  const [activeLesson, setActiveLesson] = useState(null);

  // Dummy data (default content for students)
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

  const classContent = dummyData[classId] || dummyData[1];

  const goBack = () => setActiveLesson(null);

  // Faculty-only states (dynamic content management)
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);

  // Handlers for adding content (Faculty only)
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

  const handleAddLesson = (e) => {
    e.preventDefault();
    const form = e.target;
    const newLesson = {
      id: lessons.length + 1,
      title: form.title.value,
      description: form.description.value,
    };
    setLessons([...lessons, newLesson]);
    setShowLessonForm(false);
    form.reset();
  };

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

  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8 h-full overflow-auto">
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

      {selected === "classwork" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Classwork</h2>
            {isFaculty && (
              <button
                onClick={() => setShowAssignmentForm(!showAssignmentForm)}
                className="bg-blue-900 text-white px-3 py-2 rounded hover:bg-blue-950 text-sm"
              >
                {showAssignmentForm ? "Cancel" : "+ Create New Assignment"}
              </button>
            )}
          </div>

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

      {selected === "materials" && (
        <>
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

              {isFaculty && showLessonForm && (
                <form onSubmit={handleAddLesson} className="mb-6 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Title</label>
                    <input name="title" required className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Description / Content</label>
                    <textarea name="description" required className="w-full border rounded px-3 py-2 text-sm" rows={4} />
                  </div>
                  <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 text-sm">
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
                        <div>
                          <h2 className="text-lg font-bold text-white">{lesson.title}</h2>
                          <span className="bg-white text-blue-800 px-3 py-1 rounded-full text-xs font-semibold ml-2">Completed ✓</span>
                        </div>
                      </div>
                      {/* Table/List */}
                      <div className="p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-600 border-b">
                              <th className="text-left py-2">Section</th>
                              <th>Submitted</th>
                              <th>Score</th>
                              <th>Due</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lesson.files && lesson.files.length > 0 ? (
                              lesson.files.map((file, idx) => (
                                <tr className="border-b hover:bg-gray-50" key={idx}>
                                  <td className="py-2 flex items-center">
                                    <FiFile className="w-5 h-5 text-blue-700 mr-2" />
                                    <a
                                      href={`http://localhost:5000${file.fileUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-700 underline hover:text-blue-900"
                                    >
                                      {file.fileName}
                                    </a>
                                  </td>
                                  <td></td>
                                  <td></td>
                                  <td></td>
                                  <td><span className="text-green-600 font-bold">✓</span></td>
                                </tr>
                              ))
                            ) : lesson.fileUrl && lesson.fileName ? (
                              <tr>
                                <td className="py-2 flex items-center">
                                  <FiFile className="w-5 h-5 text-blue-700 mr-2" />
                                  <a
                                    href={`http://localhost:5000${lesson.fileUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-700 underline hover:text-blue-900"
                                  >
                                    {lesson.fileName}
                                  </a>
                                </td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td><span className="text-green-600 font-bold">✓</span></td>
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
    </div>
  );
}
