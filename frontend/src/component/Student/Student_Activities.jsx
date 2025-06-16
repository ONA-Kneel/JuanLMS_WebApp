import { useState, useEffect } from "react";

import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";

export default function Student_Activities() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);

  const tabs = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past-due", label: "Past Due" },
    { id: "completed", label: "Completed" },
  ];

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        // Fetch all classes for the student
        const resClasses = await fetch('http://https://juanlms-webapp-server.onrender.com/classes/my-classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const classes = await resClasses.json();
        let allAssignments = [];
        for (const cls of classes) {
          const res = await fetch(`http://https://juanlms-webapp-server.onrender.com/assignments?classID=${cls._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (Array.isArray(data)) {
            allAssignments = allAssignments.concat(data.map(a => ({ ...a, className: cls.className || cls.name || 'Class' })));
          }
        }
        setAssignments(allAssignments);
      } catch {
        setError('Failed to fetch assignments.');
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Student_Navbar />

        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Activities</h2>
              <p className="text-base md:text-lg">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <ProfileMenu/>
          </div>

          {/* Tabs */}
          <ul className="flex flex-wrap border-b border-gray-700 text-xl sm:text-2xl font-medium text-gray-400">
            {tabs.map((tab) => (
              <li
                key={tab.id}
                className={`me-4 cursor-pointer py-2 px-4 ${activeTab === tab.id
                    ? "text-black border-b-4 border-blue-500"
                    : "hover:text-gray-600"
                  }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </li>
            ))}
          </ul>

          {/* Content */}
          <div className="mt-6">
            {activeTab === "upcoming" && (
              <div>
                {loading ? (
                  <p>Loading assignments...</p>
                ) : error ? (
                  <p className="text-red-600">{error}</p>
                ) : assignments.length === 0 ? (
                  <p>No upcoming activities.</p>
                ) : (
                  assignments.map((a) => (
                    <div key={a._id} className="p-4 rounded-xl bg-white border border-blue-200 shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 cursor-pointer hover:bg-blue-50 transition" onClick={() => setSelectedAssignment(a)}>
                      <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold mr-2 ${a.type === 'quiz' ? 'bg-purple-200 text-purple-800' : 'bg-green-200 text-green-800'}`}>{a.type === 'quiz' ? 'Quiz' : 'Assignment'}</span>
                        <span className="text-lg font-bold text-blue-900">{a.title}</span>
                        <div className="text-gray-700 text-sm mt-1">{a.instructions}</div>
                        {a.dueDate && <div className="text-xs text-gray-500 mt-1">Due: {new Date(a.dueDate).toLocaleString()}</div>}
                        {a.points && <div className="text-xs text-gray-500">Points: {a.points}</div>}
                        <div className="text-xs text-gray-500">{a.className}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {activeTab === "past-due" && (
              <div>
                <h3 className="text-2xl font-semibold">Past Due</h3>
                <p className="mt-4">No activities here.</p>
              </div>
            )}
            {activeTab === "completed" && (
              <div>
                <h3 className="text-2xl font-semibold">Completed</h3>
                <p className="mt-4">No completed activities yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Assignment/Quiz Detail Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg mx-auto bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto p-8">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold"
              onClick={() => setSelectedAssignment(null)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="mb-4">
              <span className={`inline-block px-2 py-1 rounded text-xs font-bold mr-2 ${selectedAssignment.type === 'quiz' ? 'bg-purple-200 text-purple-800' : 'bg-green-200 text-green-800'}`}>{selectedAssignment.type === 'quiz' ? 'Quiz' : 'Assignment'}</span>
              <span className="text-2xl font-bold text-blue-900">{selectedAssignment.title}</span>
            </div>
            <div className="mb-2 text-gray-700">{selectedAssignment.instructions}</div>
            {selectedAssignment.description && <div className="mb-2 text-gray-600">{selectedAssignment.description}</div>}
            {selectedAssignment.dueDate && <div className="mb-2 text-xs text-gray-500">Due: {new Date(selectedAssignment.dueDate).toLocaleString()}</div>}
            {selectedAssignment.points && <div className="mb-2 text-xs text-gray-500">Points: {selectedAssignment.points}</div>}
            {/* File upload for assignment */}
            {selectedAssignment.fileUploadRequired && (
              <form className="mb-4" onSubmit={async e => {
                e.preventDefault();
                setSubmitLoading(true);
                setSubmitError('');
                try {
                  const token = localStorage.getItem('token');
                  const formData = new FormData();
                  formData.append('assignmentId', selectedAssignment._id);
                  formData.append('file', submissionFile);
                  const res = await fetch('http://https://juanlms-webapp-server.onrender.com/submissions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                  });
                  if (res.ok) {
                    setSubmitSuccess(true);
                    setSelectedAssignment(null);
                  } else {
                    setSubmitError('Failed to submit.');
                  }
                } catch {
                  setSubmitError('Failed to submit.');
                } finally {
                  setSubmitLoading(false);
                }
              }}>
                <input type="file" required onChange={e => setSubmissionFile(e.target.files[0])} className="border rounded px-2 py-1 mb-2" />
                {submitError && <div className="text-red-600 text-sm mb-2">{submitError}</div>}
                <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950" disabled={submitLoading}>{submitLoading ? 'Submitting...' : 'Submit'}</button>
              </form>
            )}
            {/* Quiz questions (if any) can be rendered here */}
            <div className="flex justify-end mt-6">
              <button className="bg-blue-900 text-white px-6 py-2 rounded" onClick={() => setSelectedAssignment(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {submitSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-2 text-green-600">Submitted!</h3>
            <button onClick={() => setSubmitSuccess(false)} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full">OK</button>
          </div>
        </div>
      )}
    </>
  );
}
