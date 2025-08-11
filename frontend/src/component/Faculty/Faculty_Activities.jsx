import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Faculty_Activities() {
  const [activeTab, setActiveTab] = useState("activities-quiz");
  const navigate = useNavigate();
  const tabs = [
    { id: "activities-quiz", label: "Activities/Quiz" },
    { id: "ready-to-grade", label: "Ready to Grade" },
  ];
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef();

  const [activities, setActivities] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [facultyClasses, setFacultyClasses] = useState([]);
  const [filter, setFilter] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef();
  const [readyToGradeItems, setReadyToGradeItems] = useState([]);
  const [readyToGradeFilter, setReadyToGradeFilter] = useState("All");
  const [showReadyToGradeFilterDropdown, setShowReadyToGradeFilterDropdown] = useState(false);
  const readyToGradeFilterRef = useRef();

  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { Authorization: `Bearer ${token}` },
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
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const terms = await res.json();
          const active = terms.find((term) => term.status === "active");
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

  // Fetch classes created by the current faculty for the active year/term and not archived
  useEffect(() => {
    async function fetchFacultyClasses() {
      if (!academicYear || !currentTerm) return;
      try {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userID");
        const res = await fetch(`${API_BASE}/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const filtered = data.filter((cls) =>
            cls.facultyID === userId &&
            cls.isArchived !== true &&
            cls.academicYear === `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` &&
            cls.termName === currentTerm.termName
          );
          setFacultyClasses(filtered);
          console.log("[Activities] Active faculty classes:", filtered.length, filtered);
        } else {
          console.error("Failed to fetch faculty classes for activities page");
          setFacultyClasses([]);
        }
      } catch (err) {
        console.error("Error fetching faculty classes:", err);
        setFacultyClasses([]);
      }
    }
    fetchFacultyClasses();
  }, [academicYear, currentTerm]);

  // Helper: filter items so they belong to one of the active faculty classes for this term
  const filterByActiveClassesInTerm = (items) => {
    if (!Array.isArray(items) || facultyClasses.length === 0) return [];
    const allowedCodes = new Set(facultyClasses.map((c) => c.classCode).filter(Boolean));
    const allowedIds = new Set(facultyClasses.map((c) => c.classID).filter(Boolean));
    return items.filter((item) => {
      const ci = item.classInfo || item.class || {};
      const code = ci.classCode || item.classCode;
      const id = ci.classID || item.classID || item.classId;
      return (code && allowedCodes.has(code)) || (id && allowedIds.has(id));
    });
  };

  useEffect(() => {
    async function fetchActivitiesAndQuizzes() {
      try {
        const token = localStorage.getItem("token");
        const [activityRes, quizRes] = await Promise.all([
          fetch(`${API_BASE}/assignments`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/quizzes`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (activityRes.ok && quizRes.ok) {
          const [activityData, quizData] = await Promise.all([
            activityRes.json(),
            quizRes.json(),
          ]);
          // Only keep items that belong to the faculty's active classes for this year/term
          const filteredActivities = filterByActiveClassesInTerm(activityData);
          const filteredQuizzes = filterByActiveClassesInTerm(quizData);
          setActivities(filteredActivities);
          setQuizzes(filteredQuizzes);
          
          // Fetch submissions for ready to grade
          await fetchReadyToGradeItems(filteredActivities, filteredQuizzes, token);
        }
      } catch (err) {
        console.error("Failed to fetch activities or quizzes", err);
      }
    }
    // Run only after faculty classes are resolved for the term
    if (facultyClasses.length > 0) {
      fetchActivitiesAndQuizzes();
    } else {
      // If there are no active classes, ensure lists are empty
      setActivities([]);
      setQuizzes([]);
      setReadyToGradeItems([]);
    }
  }, [facultyClasses]);

  const fetchReadyToGradeItems = async (activityData, quizData, token) => {
    try {
      const readyItems = [];
      
      // Check assignments for submissions
      for (const assignment of activityData) {
        try {
          const submissionRes = await fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (submissionRes.ok) {
            const submissions = await submissionRes.json();
            if (submissions && submissions.length > 0) {
              readyItems.push({
                ...assignment,
                type: 'assignment',
                submissions: submissions
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch submissions for assignment ${assignment._id}:`, err);
        }
      }
      
      // Check quizzes for responses
      for (const quiz of quizData) {
        try {
          const responseRes = await fetch(`${API_BASE}/api/quizzes/${quiz._id}/responses`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (responseRes.ok) {
            const responses = await responseRes.json();
            if (responses && responses.length > 0) {
              readyItems.push({
                ...quiz,
                type: 'quiz',
                submissions: responses
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch responses for quiz ${quiz._id}:`, err);
        }
      }
      
      setReadyToGradeItems(readyItems);
    } catch (err) {
      console.error("Failed to fetch ready to grade items:", err);
    }
  };



  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
      if (readyToGradeFilterRef.current && !readyToGradeFilterRef.current.contains(event.target)) {
        setShowReadyToGradeFilterDropdown(false);
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
              className={`me-4 cursor-pointer py-2 px-4 ${
                activeTab === tab.id
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
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-black text-2xl font-bold mb-2">Activities & Quizzes</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Filter:</span>
                    <div className="relative" ref={filterRef}>
                      <button
                        className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-2 min-w-[100px] justify-between"
                        onClick={() => setShowFilterDropdown((prev) => !prev)}
                      >
                        {filter}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showFilterDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg z-10">
                          {["All", "Quiz", "Assignment"].map((option) => (
                            <button
                              key={option}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                filter === option ? "bg-blue-500 text-white" : "text-gray-700"
                              }`}
                              onClick={() => {
                                setFilter(option);
                                setShowFilterDropdown(false);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div ref={dropdownRef}>
                  <button
                    className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-950 flex items-center gap-2"
                    onClick={() => setShowDropdown((prev) => !prev)}
                  >
                    + Create
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10">
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate("/create-assignment");
                        }}
                      >
                        Assignment
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate("/create-quiz");
                        }}
                      >
                        Quiz
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {(() => {
                // Combine and sort activities by creation date (newest first)
                let allActivities = [...activities.map((item) => ({ ...item, type: "assignment" })), ...quizzes.map((item) => ({ ...item, type: "quiz" }))]
                  .sort((a, b) => new Date(b.createdAt || b.postAt || 0) - new Date(a.createdAt || a.postAt || 0));
                
                // Apply filter
                if (filter === "Quiz") {
                  allActivities = allActivities.filter(item => item.type === "quiz");
                } else if (filter === "Assignment") {
                  allActivities = allActivities.filter(item => item.type === "assignment");
                }
                
                // Group activities by date
                const groupedByDate = {};
                allActivities.forEach(item => {
                  const date = new Date(item.createdAt || item.postAt || new Date());
                  const dateKey = date.toDateString();
                  if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = [];
                  }
                  groupedByDate[dateKey].push(item);
                });
                
                // Sort date keys (newest first)
                const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
                
                return sortedDateKeys.map(dateKey => (
                  <div key={dateKey}>
                    {/* Date separator */}
                    <div className="mb-4 mt-6 first:mt-0">
                      <h4 className="text-lg font-semibold text-gray-700 mb-3">
                        {new Date(dateKey).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h4>
                    </div>
                    
                    {/* Activities for this date */}
                    {groupedByDate[dateKey].map((item) => (
                      <div
                        key={`${item.type}-${item._id || item.id}-${item.classInfo?.classCode || 'unknown'}`}
                        className="bg-[#00418B] p-4 rounded-xl shadow-lg mb-4 hover:bg-[#002d5a] cursor-pointer transition-colors"
                        onClick={() => {
                          if (item.type === 'assignment') {
                            navigate(`/assignment/${item._id || item.id}`);
                          } else if (item.type === 'quiz') {
                            navigate(`/quiz/${item._id || item.id}/responses`);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-white text-xl md:text-2xl font-semibold mb-2">{item.title}</h3>
                            <p className="text-white/90 text-sm mb-1">
                              Due at {item.dueDate ? new Date(item.dueDate).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              }) : 'No due date'}
                            </p>
                            <p className="text-white/80 text-sm font-medium">
                              {item.classInfo?.classCode || 'N/A'} | {item.classInfo?.className || 'Unknown Class'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="bg-white/20 text-white px-3 py-1 rounded text-xs uppercase font-bold mb-1">
                              {item.type === 'assignment' ? 'ASSIGNMENT' : 'QUIZ'}
                            </div>
                            <div className="text-white font-bold text-lg">
                              {item.points || 0} Points
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>
          )}

          {activeTab === "ready-to-grade" && (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-black text-2xl font-bold mb-2">Ready to Grade</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Filter:</span>
                    <div className="relative" ref={readyToGradeFilterRef}>
                      <button
                        className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-2 min-w-[100px] justify-between"
                        onClick={() => setShowReadyToGradeFilterDropdown((prev) => !prev)}
                      >
                        {readyToGradeFilter}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showReadyToGradeFilterDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg z-10">
                          {["All", "Quiz", "Assignment"].map((option) => (
                            <button
                              key={option}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                readyToGradeFilter === option ? "bg-blue-500 text-white" : "text-gray-700"
                              }`}
                              onClick={() => {
                                setReadyToGradeFilter(option);
                                setShowReadyToGradeFilterDropdown(false);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {readyToGradeItems.length === 0 ? (
                <p className="mt-4">No submissions yet.</p>
              ) : (
                (() => {
                  // Sort ready to grade items by creation date (newest first)
                  let sortedItems = [...readyToGradeItems]
                    .sort((a, b) => new Date(b.createdAt || b.postAt || 0) - new Date(a.createdAt || a.postAt || 0));
                  
                  // Apply filter
                  if (readyToGradeFilter === "Quiz") {
                    sortedItems = sortedItems.filter(item => item.type === "quiz");
                  } else if (readyToGradeFilter === "Assignment") {
                    sortedItems = sortedItems.filter(item => item.type === "assignment");
                  }
                  
                  // Group items by date
                  const groupedByDate = {};
                  sortedItems.forEach(item => {
                    const date = new Date(item.createdAt || item.postAt || new Date());
                    const dateKey = date.toDateString();
                    if (!groupedByDate[dateKey]) {
                      groupedByDate[dateKey] = [];
                    }
                    groupedByDate[dateKey].push(item);
                  });
                  
                  // Sort date keys (newest first)
                  const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
                  
                  return sortedDateKeys.map(dateKey => (
                    <div key={dateKey}>
                      {/* Date separator */}
                      <div className="mb-4 mt-6 first:mt-0">
                        <h4 className="text-lg font-semibold text-gray-700 mb-3">
                          {new Date(dateKey).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h4>
                      </div>
                      
                      {/* Items for this date */}
                      {groupedByDate[dateKey].map((item) => (
                        <div
                          key={`${item.type}-${item._id || item.id}-${item.classInfo?.classCode || 'unknown'}`}
                          className="bg-[#1e40af] p-4 rounded-xl shadow-lg mb-4 hover:bg-[#1e3a8a] cursor-pointer transition-colors"
                          onClick={() => {
                            if (item.type === 'assignment') {
                              navigate(`/assignment/${item._id || item.id}`);
                            } else if (item.type === 'quiz') {
                              navigate(`/quiz/${item._id || item.id}/responses`);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-white text-xl md:text-2xl font-semibold mb-2">{item.title}</h3>
                              <p className="text-white/90 text-sm mb-1">
                                Due at {item.dueDate ? new Date(item.dueDate).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 'No due date'}
                              </p>
                              <p className="text-white/80 text-sm font-medium">
                                {item.classInfo?.classCode || 'N/A'} | {item.classInfo?.className || 'Unknown Class'}
                              </p>
                              <p className="text-white/70 text-xs mt-1">
                                {item.submissions?.length || 0} submission(s) ready to grade
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="bg-white/20 text-white px-3 py-1 rounded text-xs uppercase font-bold mb-1">
                                {item.type === 'assignment' ? 'ASSIGNMENT' : 'QUIZ'}
                              </div>
                              <div className="text-white font-bold text-lg">
                                {item.points || 0} Points
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}