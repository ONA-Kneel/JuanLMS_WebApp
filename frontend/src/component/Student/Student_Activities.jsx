import { useState, useEffect } from "react";

import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";

export default function Student_Activities() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        const resClasses = await fetch('${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/classes/my-classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const classes = await resClasses.json();
        let allAssignments = [];
        for (const cls of classes) {
          const res = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/assignments?classID=${cls._id}`, {
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
                  <div key={a._id} className="p-4 rounded-xl bg-white border border-blue-200 shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
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
  );
}
