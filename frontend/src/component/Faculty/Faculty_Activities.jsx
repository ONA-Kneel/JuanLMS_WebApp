import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Faculty_Activities() {
  const [activeTab, setActiveTab] = useState("activities-quiz");
  const navigate = useNavigate();
  const tabs = [
    { id: "activities-quiz", label: "Activities/Quiz" },
    { id: "ready-to-grade", label: "Ready to Grade" }
  ];
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef();

  const [activities, setActivities] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          setAcademicYear(year);
        }
      } catch (err) {
        console.error("Failed to fetch academic year", err);
      }
    }
    fetchAcademicYear();
  }, []);

  useEffect(() => {
    async function fetchActiveTermForYear() {
      if (!academicYear) return;
      try {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          const active = terms.find(term => term.status === 'active');
          setCurrentTerm(active || null);
        } else {
          setCurrentTerm(null);
        }
      } catch {
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  useEffect(() => {
    async function fetchActivitiesAndQuizzes() {
      try {
        const token = localStorage.getItem("token");
        const [activityRes, quizRes] = await Promise.all([
          fetch(`${API_BASE}/api/faculty/activities`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/faculty/quizzes`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);

        if (activityRes.ok && quizRes.ok) {
          const [activityData, quizData] = await Promise.all([
            activityRes.json(),
            quizRes.json()
          ]);
          setActivities(activityData);
          setQuizzes(quizData);
        }
      } catch (err) {
        console.error("Failed to fetch activities or quizzes", err);
      }
    }
    fetchActivitiesAndQuizzes();
  }, []);

  const readyToGradeItems = [
    ...activities.filter(item => item.submissions && item.submissions.length > 0),
    ...quizzes.filter(item => item.submissions && item.submissions.length > 0)
  ];

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
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />

      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Activities</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} |
              {currentTerm ? ` ${currentTerm.termName}` : " Loading..."} |
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu />
        </div>

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



        <div className="mt-6">
          {activeTab === "activities-quiz" && (
            <div>
              <div className="flex justify-between mb-4" ref={dropdownRef}>
                
              <h3 className="text-black text-2xl font-bold mb-4">Activities & Quizzes</h3>
                
                  <button
                    className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-950 flex items-center gap-2"
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
                        Assignment
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => { setShowDropdown(false); navigate('/create-quiz'); }}
                      >
                        Quiz
                      </button>
                    </div>
                  )}

              </div>

              {[...activities, ...quizzes].map((item) => (
                <div key={item.id} className="bg-[#00418B] p-4 rounded-xl shadow-lg mb-4 hover:bg-[#002d5a] relative">
                  <div className="absolute top-3 right-3 text-white px-3 py-1 font-bold">
                    {item.points} points
                  </div>
                  <h3 className="text-white text-xl md:text-2xl font-semibold">{item.title}</h3>
                  <p className="text-white">Due at {item.dueTime}</p>
                  <p className="text-lg text-white font-medium">{item.subjectName}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "ready-to-grade" && (
            <div>
              <h3 className="text-black text-2xl font-bold mb-4">Ready to Grade</h3>
              {readyToGradeItems.length === 0 ? (
                <p className="mt-4">No submissions yet.</p>
              ) : (
                readyToGradeItems.map((item) => (
                  <div key={item.id} className="bg-green-800 p-4 rounded-xl shadow-lg mb-4 hover:bg-green-900 relative">
                    <div className="absolute top-3 right-3 text-white px-3 py-1 font-bold">
                      {item.points} points
                    </div>
                    <h3 className="text-white text-xl md:text-2xl font-semibold">{item.title}</h3>
                    <p className="text-white">Due at {item.dueTime}</p>
                    <p className="text-lg text-white font-medium">{item.subjectName}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
