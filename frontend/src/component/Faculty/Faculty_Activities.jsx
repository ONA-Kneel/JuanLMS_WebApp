import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";
import QuarterSelector from "../QuarterSelector";
import { useQuarter } from "../../context/QuarterContext.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Faculty_Activities() {
  const [activeTab, setActiveTab] = useState("activities-quiz");
  const navigate = useNavigate();
  
  // Get quarter context
  const { globalQuarter, globalTerm, globalAcademicYear, isLoading: quarterLoading } = useQuarter();
  
  const tabs = [
    { id: "activities-quiz", label: "Activities/Quiz" },
    { id: "ready-to-grade", label: "Ready to Grade" },
    { id: "graded", label: "Graded" },
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
  const [readyToGradeActivityTypeFilter, setReadyToGradeActivityTypeFilter] = useState("All");
  const [showReadyToGradeActivityTypeFilterDropdown, setShowReadyToGradeActivityTypeFilterDropdown] = useState(false);
  const readyToGradeActivityTypeFilterRef = useRef();
  const [gradedItems, setGradedItems] = useState([]);
  const [gradedFilter, setGradedFilter] = useState("All");
  const [showGradedFilterDropdown, setShowGradedFilterDropdown] = useState(false);
  const gradedFilterRef = useRef();
  const [gradedActivityTypeFilter, setGradedActivityTypeFilter] = useState("All");
  const [showGradedActivityTypeFilterDropdown, setShowGradedActivityTypeFilterDropdown] = useState(false);
  const gradedActivityTypeFilterRef = useRef();
  const [activityTypeFilter, setActivityTypeFilter] = useState("All");
  const [showActivityTypeFilterDropdown, setShowActivityTypeFilterDropdown] = useState(false);
  const activityTypeFilterRef = useRef();
  const [classFilter, setClassFilter] = useState("All Classes");
  const [showClassFilterDropdown, setShowClassFilterDropdown] = useState(false);
  const classFilterRef = useRef();

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
        const res = await fetch(`${API_BASE}/classes/faculty-classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const filtered = data.filter((cls) =>
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

  // Define fetchActivitiesAndQuizzes function
  const fetchActivitiesAndQuizzes = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Fetch assignments for selected quarter
        const activityRes = await fetch(`${API_BASE}/assignments?quarter=${globalQuarter}&termName=${globalTerm}&academicYear=${globalAcademicYear}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Fetch quizzes per class for selected quarter
        const allQuizzes = [];
        for (const facultyClass of facultyClasses) {
          const quizRes = await fetch(`${API_BASE}/api/quizzes?classID=${facultyClass.classID}&quarter=${globalQuarter}&termName=${globalTerm}&academicYear=${globalAcademicYear}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (quizRes.ok) {
            const quizData = await quizRes.json();
            allQuizzes.push(...(Array.isArray(quizData) ? quizData : []));
          }
        }
        
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          
          // Debug logging
          console.log('[Faculty_Activities] Raw activity data:', activityData);
          if (activityData.length > 0) {
            console.log('[Faculty_Activities] First activity sample:', activityData[0]);
            console.log('[Faculty_Activities] First activity activityType:', activityData[0].activityType);
          }
          
          // Only keep items that belong to the faculty's active classes for this year/term
          const filteredActivities = filterByActiveClassesInTerm(activityData);
          const filteredQuizzes = allQuizzes; // No filtering needed since we fetched per class
          
          console.log('[Faculty_Activities] Filtered activities:', filteredActivities);
          if (filteredActivities.length > 0) {
            console.log('[Faculty_Activities] First filtered activity activityType:', filteredActivities[0].activityType);
          }
          
          setActivities(filteredActivities);
          setQuizzes(filteredQuizzes);
          
          // Fetch submissions for ready to grade
          await fetchReadyToGradeItems(filteredActivities, filteredQuizzes, token);
          // Fetch graded items
          await fetchGradedItems(filteredActivities, filteredQuizzes, token);
        }
      } catch (err) {
        console.error("Failed to fetch activities or quizzes", err);
      }
  };

  // Refetch activities when quarter changes
  useEffect(() => {
    if (globalQuarter && globalTerm && globalAcademicYear && facultyClasses.length > 0) {
      fetchActivitiesAndQuizzes();
    }
  }, [globalQuarter, globalTerm, globalAcademicYear, facultyClasses]);

  // Run only after faculty classes are resolved for the term
  useEffect(() => {
    if (facultyClasses.length > 0) {
      fetchActivitiesAndQuizzes();
    } else {
      // If there are no active classes, ensure lists are empty
      setActivities([]);
      setQuizzes([]);
      setReadyToGradeItems([]);
      setGradedItems([]);
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

  const fetchGradedItems = async (activityData, quizData, token) => {
    try {
      const gradedItemsList = [];
      
      // Check assignments for graded submissions
      for (const assignment of activityData) {
        try {
          const submissionRes = await fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (submissionRes.ok) {
            const submissions = await submissionRes.json();
            if (submissions && submissions.length > 0) {
              // Check if all submissions are graded
              const allGraded = submissions.every(sub => sub.status === 'graded');
              if (allGraded) {
                // Calculate completion date (when the last submission was graded)
                const lastGradedDate = new Date(Math.max(...submissions
                  .filter(sub => sub.status === 'graded')
                  .map(sub => new Date(sub.updatedAt || sub.submittedAt))
                ));
                
                gradedItemsList.push({
                  ...assignment,
                  type: 'assignment',
                  submissions: submissions,
                  completionDate: lastGradedDate,
                  totalSubmissions: submissions.length,
                  gradedSubmissions: submissions.filter(sub => sub.status === 'graded').length
                });
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch submissions for assignment ${assignment._id}:`, err);
        }
      }
      
      // Check quizzes for graded responses
      for (const quiz of quizData) {
        try {
          const responseRes = await fetch(`${API_BASE}/api/quizzes/${quiz._id}/responses`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (responseRes.ok) {
            const responses = await responseRes.json();
            if (responses && responses.length > 0) {
              // Check if all responses are graded
              const allGraded = responses.every(resp => resp.graded === true);
              if (allGraded) {
                // Calculate completion date (when the last response was graded)
                const lastGradedDate = new Date(Math.max(...responses
                  .filter(resp => resp.graded === true)
                  .map(resp => new Date(resp.updatedAt || resp.submittedAt))
                ));
                
                gradedItemsList.push({
                  ...quiz,
                  type: 'quiz',
                  submissions: responses,
                  completionDate: lastGradedDate,
                  totalSubmissions: responses.length,
                  gradedSubmissions: responses.filter(resp => resp.graded === true).length
                });
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch responses for quiz ${quiz._id}:`, err);
        }
      }
      
      setGradedItems(gradedItemsList);
    } catch (err) {
      console.error("Failed to fetch graded items:", err);
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
      if (readyToGradeActivityTypeFilterRef.current && !readyToGradeActivityTypeFilterRef.current.contains(event.target)) {
        setShowReadyToGradeActivityTypeFilterDropdown(false);
      }
      if (gradedFilterRef.current && !gradedFilterRef.current.contains(event.target)) {
        setShowGradedFilterDropdown(false);
      }
      if (gradedActivityTypeFilterRef.current && !gradedActivityTypeFilterRef.current.contains(event.target)) {
        setShowGradedActivityTypeFilterDropdown(false);
      }
      if (activityTypeFilterRef.current && !activityTypeFilterRef.current.contains(event.target)) {
        setShowActivityTypeFilterDropdown(false);
      }
      if (classFilterRef.current && !classFilterRef.current.contains(event.target)) {
        setShowClassFilterDropdown(false);
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

        {/* Quarter Selector */}
        <div className="mb-6">
          <QuarterSelector />
        </div>

        {/* Current Quarter Display */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm font-medium text-blue-800">
            Showing activities for: <span className="font-semibold">{globalQuarter} - {globalTerm}</span>
            <span className="text-blue-600 ml-2">({quarterLoading ? "Loading..." : globalAcademicYear})</span>
          </p>
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
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Type:</span>
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Class:</span>
                      <div className="relative" ref={classFilterRef}>
                        <button
                          className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-2 min-w-[160px] justify-between"
                          onClick={() => setShowClassFilterDropdown((prev) => !prev)}
                        >
                          {classFilter}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showClassFilterDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 max-h-64 overflow-y-auto min-w-[200px]">
                            {['All Classes', ...[...new Set(facultyClasses.map(cls => cls.className).filter(Boolean))].sort((a, b) => a.localeCompare(b))].map((option, idx) => (
                              <button
                                key={idx}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                  classFilter === option ? 'bg-blue-500 text-white' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  setClassFilter(option);
                                  setShowClassFilterDropdown(false);
                                }}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Category:</span>
                      <div className="relative" ref={activityTypeFilterRef}>
                        <button
                          className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between"
                          onClick={() => setShowActivityTypeFilterDropdown((prev) => !prev)}
                        >
                          {activityTypeFilter}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showActivityTypeFilterDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg z-10">
                            {["All", "Written Works", "Performance Task"].map((option) => (
                              <button
                                key={option}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                  activityTypeFilter === option ? "bg-blue-500 text-white" : "text-gray-700"
                                }`}
                                onClick={() => {
                                  setActivityTypeFilter(option);
                                  setShowActivityTypeFilterDropdown(false);
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
                    <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow-lg z-10">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-700">Written Works</span>
                      </div>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate(`/create-assignment?type=written&quarter=${globalQuarter}&termName=${globalTerm}&academicYear=${globalAcademicYear}`);
                        }}
                      >
                        Assignment
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate(`/create-quiz?type=written&quarter=${globalQuarter}&termName=${globalTerm}&academicYear=${globalAcademicYear}`);
                        }}
                      >
                        Quiz
                      </button>
                      <div className="px-4 py-2 border-b border-gray-200 mt-2">
                        <span className="text-sm font-medium text-gray-700">Performance Task</span>
                      </div>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate(`/create-assignment?type=performance&quarter=${globalQuarter}&termName=${globalTerm}&academicYear=${globalAcademicYear}`);
                        }}
                      >
                        Assignment
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate(`/create-quiz?type=performance&quarter=${globalQuarter}&termName=${globalTerm}&academicYear=${globalAcademicYear}`);
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
                
                // Apply type filter
                if (filter === "Quiz") {
                  allActivities = allActivities.filter(item => item.type === "quiz");
                } else if (filter === "Assignment") {
                  allActivities = allActivities.filter(item => item.type === "assignment");
                }
                
                // Apply activity type filter (Written Works/Performance Task)
                if (activityTypeFilter === "Written Works") {
                  allActivities = allActivities.filter(item => item.activityType === "written");
                } else if (activityTypeFilter === "Performance Task") {
                  allActivities = allActivities.filter(item => item.activityType === "performance");
                }

                // Apply class filter
                if (classFilter !== 'All Classes') {
                  const target = classFilter;
                  allActivities = allActivities.filter(item => {
                    const clsName = item.classInfo?.className || item.className || '';
                    return clsName === target;
                  });
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
                    {groupedByDate[dateKey].map((item) => {
                      // Debug logging for each item
                      console.log('[Faculty_Activities] Rendering item:', {
                        title: item.title,
                        activityType: item.activityType,
                        type: item.type,
                        fullItem: item
                      });
                      
                      return (
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
                            <p className="text-white/70 text-xs mt-1">
                              Category: {item.activityType === 'written' ? 'Written Works' : item.activityType === 'performance' ? 'Performance Task' : 'Not Categorized'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex flex-col gap-1 mb-2">
                              <div className="bg-white/20 text-white px-3 py-1 rounded text-xs uppercase font-bold">
                                {item.type === 'assignment' ? 'ASSIGNMENT' : 'QUIZ'}
                              </div>
                              <div className={`px-3 py-1 rounded text-xs uppercase font-bold ${
                                item.activityType === 'written' 
                                  ? 'bg-blue-500 text-white' 
                                  : item.activityType === 'performance' 
                                  ? 'bg-purple-500 text-white' 
                                  : 'bg-gray-500 text-white'
                              }`}>
                                {item.activityType === 'written' ? 'WRITTEN WORKS' : 
                                 item.activityType === 'performance' ? 'PERFORMANCE TASK' : 'NOT CATEGORIZED'}
                              </div>
                            </div>
                            <div className="text-white font-bold text-lg">
                              {item.points || 0} Points
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
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
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Type:</span>
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Category:</span>
                      <div className="relative" ref={readyToGradeActivityTypeFilterRef}>
                        <button
                          className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between"
                          onClick={() => setShowReadyToGradeActivityTypeFilterDropdown((prev) => !prev)}
                        >
                          {readyToGradeActivityTypeFilter}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showReadyToGradeActivityTypeFilterDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg z-10">
                            {["All", "Written Works", "Performance Task"].map((option) => (
                              <button
                                key={option}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                  readyToGradeActivityTypeFilter === option ? "bg-blue-500 text-white" : "text-gray-700"
                                }`}
                                onClick={() => {
                                  setReadyToGradeActivityTypeFilter(option);
                                  setShowReadyToGradeActivityTypeFilterDropdown(false);
                                }}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Class:</span>
                      <div className="relative" ref={classFilterRef}>
                        <button
                          className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-2 min-w-[160px] justify-between"
                          onClick={() => setShowClassFilterDropdown((prev) => !prev)}
                        >
                          {classFilter}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showClassFilterDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 max-h-64 overflow-y-auto min-w-[200px]">
                            {['All Classes', ...[...new Set(facultyClasses.map(cls => cls.className).filter(Boolean))].sort((a, b) => a.localeCompare(b))].map((option, idx) => (
                              <button
                                key={idx}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                  classFilter === option ? 'bg-blue-500 text-white' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  setClassFilter(option);
                                  setShowClassFilterDropdown(false);
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
              </div>
              {readyToGradeItems.length === 0 ? (
                <p className="mt-4">No submissions yet.</p>
              ) : (
                (() => {
                  // Sort ready to grade items by creation date (newest first)
                  let sortedItems = [...readyToGradeItems]
                    .sort((a, b) => new Date(b.createdAt || b.postAt || 0) - new Date(a.createdAt || a.postAt || 0));
                  
                  // Apply type filter
                  if (readyToGradeFilter === "Quiz") {
                    sortedItems = sortedItems.filter(item => item.type === "quiz");
                  } else if (readyToGradeFilter === "Assignment") {
                    sortedItems = sortedItems.filter(item => item.type === "assignment");
                  }
                  
                  // Apply activity type filter
                  if (readyToGradeActivityTypeFilter === "Written Works") {
                    sortedItems = sortedItems.filter(item => item.activityType === "written");
                  } else if (readyToGradeActivityTypeFilter === "Performance Task") {
                    sortedItems = sortedItems.filter(item => item.activityType === "performance");
                  }

                  // Apply class filter
                  if (classFilter !== 'All Classes') {
                    const target = classFilter;
                    sortedItems = sortedItems.filter(item => {
                      const clsName = item.classInfo?.className || item.className || '';
                      return clsName === target;
                    });
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
                                Category: {item.activityType === 'written' ? 'Written Works' : item.activityType === 'performance' ? 'Performance Task' : 'Not Categorized'}
                              </p>
                              <p className="text-white/70 text-xs mt-1">
                                {item.submissions?.length || 0} submission(s) ready to grade
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="flex flex-col gap-1 mb-2">
                                <div className="bg-white/20 text-white px-3 py-1 rounded text-xs uppercase font-bold">
                                  {item.type === 'assignment' ? 'ASSIGNMENT' : 'QUIZ'}
                                </div>
                                <div className={`px-3 py-1 rounded text-xs uppercase font-bold ${
                                  item.activityType === 'written' 
                                    ? 'bg-blue-500 text-white' 
                                    : item.activityType === 'performance' 
                                    ? 'bg-purple-500 text-white' 
                                    : 'bg-gray-500 text-white'
                                }`}>
                                  {item.activityType === 'written' ? 'WRITTEN WORKS' : 
                                   item.activityType === 'performance' ? 'PERFORMANCE TASK' : 'NOT CATEGORIZED'}
                                </div>
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

          {activeTab === "graded" && (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-black text-2xl font-bold mb-2">Graded Activities</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Type:</span>
                      <div className="relative" ref={gradedFilterRef}>
                        <button
                          className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-2 min-w-[100px] justify-between"
                          onClick={() => setShowGradedFilterDropdown((prev) => !prev)}
                        >
                          {gradedFilter}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showGradedFilterDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg z-10">
                            {["All", "Quiz", "Assignment"].map((option) => (
                              <button
                                key={option}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                  gradedFilter === option ? "bg-blue-500 text-white" : "text-gray-700"
                                }`}
                                onClick={() => {
                                  setGradedFilter(option);
                                  setShowGradedFilterDropdown(false);
                                }}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Category:</span>
                      <div className="relative" ref={gradedActivityTypeFilterRef}>
                        <button
                          className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between"
                          onClick={() => setShowGradedActivityTypeFilterDropdown((prev) => !prev)}
                        >
                          {gradedActivityTypeFilter}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showGradedActivityTypeFilterDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg z-10">
                            {["All", "Written Works", "Performance Task"].map((option) => (
                              <button
                                key={option}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                  gradedActivityTypeFilter === option ? "bg-blue-500 text-white" : "text-gray-700"
                                }`}
                                onClick={() => {
                                  setGradedActivityTypeFilter(option);
                                  setShowGradedActivityTypeFilterDropdown(false);
                                }}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Class:</span>
                      <div className="relative" ref={classFilterRef}>
                        <button
                          className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-2 min-w-[160px] justify-between"
                          onClick={() => setShowClassFilterDropdown((prev) => !prev)}
                        >
                          {classFilter}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showClassFilterDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 max-h-64 overflow-y-auto min-w-[200px]">
                            {['All Classes', ...[...new Set(facultyClasses.map(cls => cls.className).filter(Boolean))].sort((a, b) => a.localeCompare(b))].map((option, idx) => (
                              <button
                                key={idx}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                  classFilter === option ? 'bg-blue-500 text-white' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  setClassFilter(option);
                                  setShowClassFilterDropdown(false);
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
              </div>
              {gradedItems.length === 0 ? (
                <p className="mt-4">No graded activities yet.</p>
              ) : (
                (() => {
                  // Sort graded items by completion date (newest first)
                  let sortedItems = [...gradedItems]
                    .sort((a, b) => new Date(b.completionDate || 0) - new Date(a.completionDate || 0));
                  
                  // Apply type filter
                  if (gradedFilter === "Quiz") {
                    sortedItems = sortedItems.filter(item => item.type === "quiz");
                  } else if (gradedFilter === "Assignment") {
                    sortedItems = sortedItems.filter(item => item.type === "assignment");
                  }
                  
                  // Apply activity type filter
                  if (gradedActivityTypeFilter === "Written Works") {
                    sortedItems = sortedItems.filter(item => item.activityType === "written");
                  } else if (gradedActivityTypeFilter === "Performance Task") {
                    sortedItems = sortedItems.filter(item => item.activityType === "performance");
                  }

                  // Apply class filter
                  if (classFilter !== 'All Classes') {
                    const target = classFilter;
                    sortedItems = sortedItems.filter(item => {
                      const clsName = item.classInfo?.className || item.className || '';
                      return clsName === target;
                    });
                  }
                  
                  // Group items by completion date
                  const groupedByDate = {};
                  sortedItems.forEach(item => {
                    const date = new Date(item.completionDate || new Date());
                    const dateKey = date.toDateString();
                    if (!groupedByDate[dateKey]) {
                      groupedByDate[dateKey] = [];
                    }
                    groupedByDate[dateKey].push(item);
                  });
                  
                  // Sort date keys (newest first)
                  const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

                  // Total points across currently visible graded activities
                  const totalPoints = sortedItems.reduce((sum, item) => sum + (item.points || 0), 0);
                  
                  // Debug logging
                  console.log('🔍 Debug - Total Points Calculation:');
                  console.log('  - sortedItems length:', sortedItems.length);
                  console.log('  - sortedItems:', sortedItems.map(item => ({ 
                    title: item.title, 
                    points: item.points, 
                    activityType: item.activityType,
                    quarter: item.quarter 
                  })));
                  console.log('  - totalPoints:', totalPoints);

                  // Persist total to localStorage for later use
                  try {
                    const storagePayload = {
                      totalPoints,
                      filter: gradedFilter,
                      activityType: gradedActivityTypeFilter,
                      classFilter,
                      timestamp: Date.now()
                    };
                    localStorage.setItem('gradedTotalActivityPoints', JSON.stringify(storagePayload));
                  } catch (_) {}

                  // Compute and persist per-class, per-category totals
                  try {
                    const totalsByClass = {};
                    for (const item of sortedItems) {
                      const className = item.classInfo?.className || item.className || 'Unknown Class';
                      const category = item.activityType === 'written' ? 'written' : item.activityType === 'performance' ? 'performance' : 'uncategorized';
                      const points = item.points || 0;
                      if (!totalsByClass[className]) {
                        totalsByClass[className] = { written: 0, performance: 0, uncategorized: 0, total: 0 };
                      }
                      totalsByClass[className][category] += points;
                      totalsByClass[className].total += points;
                    }
                    const byClassPayload = {
                      totalsByClass,
                      filter: gradedFilter,
                      activityType: gradedActivityTypeFilter,
                      classFilter,
                      timestamp: Date.now()
                    };
                    localStorage.setItem('gradedTotalsByClassAndCategory', JSON.stringify(byClassPayload));
                  } catch (_) {}

                  return (
                    <>
                      <div className="mb-2 text-sm text-gray-700">
                        <span className="font-semibold">Total Activity Points:</span> {totalPoints}
                      </div>
                      {(() => {
                        // Build per-class, per-category totals for rendering
                        const totalsByClassRender = {};
                        for (const item of sortedItems) {
                          const className = item.classInfo?.className || item.className || 'Unknown Class';
                          const category = item.activityType === 'written' ? 'written' : item.activityType === 'performance' ? 'performance' : 'uncategorized';
                          const points = item.points || 0;
                          if (!totalsByClassRender[className]) {
                            totalsByClassRender[className] = { written: 0, performance: 0, uncategorized: 0, total: 0 };
                          }
                          totalsByClassRender[className][category] += points;
                          totalsByClassRender[className].total += points;
                        }
                        // Ensure table shows appropriate rows based on class filter
                        if (classFilter && classFilter !== 'All Classes') {
                          // Guarantee a row for the selected class
                          if (!totalsByClassRender[classFilter]) {
                            totalsByClassRender[classFilter] = { written: 0, performance: 0, uncategorized: 0, total: 0 };
                          }
                        } else {
                          // For "All Classes", ensure every active faculty class appears at least with zeros
                          (facultyClasses || []).forEach(cls => {
                            const name = cls?.className || 'Unknown Class';
                            if (!totalsByClassRender[name]) {
                              totalsByClassRender[name] = { written: 0, performance: 0, uncategorized: 0, total: 0 };
                            }
                          });
                        }
                        const classNames = Object.keys(totalsByClassRender).sort((a, b) => a.localeCompare(b));
                        if (classNames.length === 0) return null;
                        return (
                          <div className="mb-4 overflow-x-auto">
                            <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="p-2 border text-left">Class</th>
                                  <th className="p-2 border text-right">Written Works</th>
                                  <th className="p-2 border text-right">Performance Task</th>
                                  <th className="p-2 border text-right">Uncategorized</th>
                                  <th className="p-2 border text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {classNames.map((name) => (
                                  <tr key={name} className="hover:bg-gray-50">
                                    <td className="p-2 border">{name}</td>
                                    <td className="p-2 border text-right">{totalsByClassRender[name].written}</td>
                                    <td className="p-2 border text-right">{totalsByClassRender[name].performance}</td>
                                    <td className="p-2 border text-right">{totalsByClassRender[name].uncategorized}</td>
                                    <td className="p-2 border text-right font-semibold">{totalsByClassRender[name].total}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                      {sortedDateKeys.map(dateKey => (
                        <div key={dateKey}>
                          {/* Items for this date */}
                          {groupedByDate[dateKey].map((item) => (
                            <div
                              key={`${item.type}-${item._id || item.id}-${item.classInfo?.classCode || 'unknown'}`}
                              className="bg-green-600 p-4 rounded-xl shadow-lg mb-4 hover:bg-green-700 cursor-pointer transition-colors"
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
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-white text-xl md:text-2xl font-semibold">{item.title}</h3>
                                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                                      ✓ Graded
                                    </span>
                                  </div>
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
                                    Category: {item.activityType === 'written' ? 'Written Works' : item.activityType === 'performance' ? 'Performance Task' : 'Not Categorized'}
                                  </p>
                                  <p className="text-white/70 text-xs mt-1">
                                    {item.gradedSubmissions || 0} of {item.totalSubmissions || 0} submission(s) graded
                                  </p>
                                  <p className="text-white/60 text-xs mt-1">
                                    Completed on {new Date(item.completionDate || new Date()).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex flex-col gap-1 mb-2">
                                    <div className="bg-white/20 text-white px-3 py-1 rounded text-xs uppercase font-bold">
                                      {item.type === 'assignment' ? 'ASSIGNMENT' : 'QUIZ'}
                                    </div>
                                    <div className={`px-3 py-1 rounded text-xs uppercase font-bold ${
                                      item.activityType === 'written' 
                                        ? 'bg-blue-500 text-white' 
                                        : item.activityType === 'performance' 
                                        ? 'bg-purple-500 text-white' 
                                        : 'bg-gray-500 text-white'
                                    }`}>
                                      {item.activityType === 'written' ? 'WRITTEN WORKS' : 
                                       item.activityType === 'performance' ? 'PERFORMANCE TASK' : 'NOT CATEGORIZED'}
                                    </div>
                                  </div>
                                  <div className="text-white font-bold text-lg">
                                    {item.points || 0} Points
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  );
                })()
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}