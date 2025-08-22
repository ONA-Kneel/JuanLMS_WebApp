import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Activities() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [quizResponses, setQuizResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [filter, setFilter] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef();

  const tabs = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past-due", label: "Past Due" },
    { id: "completed", label: "Completed" },
  ];

  // Fetch academic year
  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
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

  // Fetch current term
  useEffect(() => {
    async function fetchActiveTermForYear() {
      if (!academicYear) {
        console.log('No academic year available for term fetching');
        return;
      }
      try {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        console.log('Fetching terms for school year:', schoolYearName);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        console.log('Term fetch response status:', res.status);
        if (res.ok) {
          const terms = await res.json();
          console.log('Fetched terms:', terms);
          const active = terms.find(term => term.status === 'active');
          console.log('Active term found:', active);
          setCurrentTerm(active || null);
        } else {
          console.error('Failed to fetch terms, status:', res.status);
          setCurrentTerm(null);
        }
      } catch (error) {
        console.error('Error fetching terms:', error);
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        const userId = decodedToken.userID; // Student ID like S441
        const userObjectId = decodedToken.id; // MongoDB ObjectId
        console.log('Fetching activities for student:', userId);
        console.log('User ObjectId:', userObjectId);
        
        // First, fetch student's enrolled classes
        console.log('Fetching student classes from:', `${API_BASE}/classes/my-classes`);
        const classesRes = await fetch(`${API_BASE}/classes/my-classes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!classesRes.ok) {
          console.error('Classes fetch failed:', classesRes.status, classesRes.statusText);
          throw new Error('Failed to fetch classes');
        }
        
        const classes = await classesRes.json();
        console.log('Student classes received:', classes);
        
        let allAssignments = [];
        let allQuizzes = [];
        
        // Fetch assignments and quizzes for each class
        for (const cls of classes) {
          const classCode = cls.classID || cls.classCode || cls._id;
          console.log('Fetching activities for class:', classCode, cls.className);
          
          try {
            // Fetch assignments for this class
            const assignmentRes = await fetch(`${API_BASE}/assignments?classID=${classCode}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (assignmentRes.ok) {
              const assignments = await assignmentRes.json();
              console.log(`Assignments for class ${classCode}:`, assignments);
              
              if (Array.isArray(assignments)) {
                // Filter assignments assigned to this student
                const studentAssignments = assignments.filter(assignment => {
                  const entry = assignment.assignedTo?.find?.(e => e.classID === classCode);
                  return entry && Array.isArray(entry.studentIDs) && entry.studentIDs.includes(userId);
                });
                
                // Add class info to assignments
                const assignmentsWithInfo = studentAssignments.map(assignment => ({
                  ...assignment,
                  type: 'assignment',
                  classInfo: {
                    classCode: cls.classCode || cls.classID || 'N/A',
                    className: cls.className || cls.name || 'Unknown Class'
                  }
                }));
                
                allAssignments.push(...assignmentsWithInfo);
              }
            }
            
            // Fetch quizzes for this class
            const quizRes = await fetch(`${API_BASE}/api/quizzes?classID=${classCode}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (quizRes.ok) {
              const quizzes = await quizRes.json();
              console.log(`Quizzes for class ${classCode}:`, quizzes);
              
              if (Array.isArray(quizzes)) {
                // Filter quizzes assigned to this student
                const studentQuizzes = quizzes.filter(quiz => {
                  const entry = quiz.assignedTo?.find?.(e => e.classID === classCode);
                  return entry && Array.isArray(entry.studentIDs) && entry.studentIDs.includes(userId);
                });
                
                // Add class info to quizzes
                const quizzesWithInfo = studentQuizzes.map(quiz => ({
                  ...quiz,
                  type: 'quiz',
                  classInfo: {
                    classCode: cls.classCode || cls.classID || 'N/A',
                    className: cls.className || cls.name || 'Unknown Class'
                  }
                }));
                
                allQuizzes.push(...quizzesWithInfo);
              }
            }
          } catch (classError) {
            console.error(`Error fetching activities for class ${classCode}:`, classError);
          }
        }
        
        console.log('Final processed assignments:', allAssignments);
        console.log('Final processed quizzes:', allQuizzes);
        
        // Fetch submissions for assignments
        let allSubmissions = [];
        for (const assignment of allAssignments) {
          try {
            const submissionRes = await fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (submissionRes.ok) {
              const submissionData = await submissionRes.json();
              if (Array.isArray(submissionData)) {
                // Find submissions by this student
                const studentSubmissions = submissionData.filter(sub => 
                  sub.student && (sub.student._id === userId || sub.student === userId || sub.student.userID === userId)
                );
                allSubmissions.push(...studentSubmissions);
              }
            }
          } catch (submissionError) {
            console.error(`Error fetching submissions for assignment ${assignment._id}:`, submissionError);
          }
        }
        
        // Fetch quiz responses
        let allQuizResponses = [];
        console.log('Fetching quiz responses for', allQuizzes.length, 'quizzes');
        
        for (const quiz of allQuizzes) {
          try {
            console.log(`Fetching responses for quiz: ${quiz.title} (ID: ${quiz._id})`);
            const responseRes = await fetch(`${API_BASE}/api/quizzes/${quiz._id}/responses`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log(`Quiz response fetch status for ${quiz._id}:`, responseRes.status);
            
            if (responseRes.ok) {
              const responseData = await responseRes.json();
              console.log(`Raw response data for quiz ${quiz._id}:`, responseData);
              
              if (Array.isArray(responseData)) {
                console.log(`Found ${responseData.length} total responses for quiz ${quiz._id}`);
                
                // Find responses by this student
                const studentResponses = responseData.filter(resp => {
                  console.log('Checking response:', resp);
                  console.log('Response studentId field:', resp.studentId);
                  console.log('Current userId:', userId);
                  console.log('Current userObjectId:', userObjectId);
                  
                  // Check both student and studentId fields for compatibility
                  const studentField = resp.student || resp.studentId;
                  const matches = studentField && (
                    studentField._id === userId ||           // Match with student ID (S441)
                    studentField._id === userObjectId ||     // Match with MongoDB ObjectId
                    studentField === userId ||               // Direct match with student ID
                    studentField === userObjectId ||         // Direct match with ObjectId
                    studentField.userID === userId ||        // Match userID field
                    studentField.studentID === userId        // Match studentID field
                  );
                  
                  console.log('Response matches current student:', matches);
                  return matches;
                });
                
                console.log(`Found ${studentResponses.length} responses for current student in quiz ${quiz._id}`);
                allQuizResponses.push(...studentResponses);
              } else {
                console.log(`Response data for quiz ${quiz._id} is not an array:`, responseData);
              }
            } else {
              console.error(`Failed to fetch responses for quiz ${quiz._id}:`, responseRes.status, responseRes.statusText);
            }
          } catch (responseError) {
            console.error(`Error fetching responses for quiz ${quiz._id}:`, responseError);
          }
        }
        
        console.log('Final submissions:', allSubmissions);
        console.log('Final quiz responses:', allQuizResponses);
        
        setAssignments(allAssignments);
        setQuizzes(allQuizzes);
        setSubmissions(allSubmissions);
        setQuizResponses(allQuizResponses);
        
      } catch (error) {
        console.error('Error fetching activities:', error);
        setError('Failed to fetch activities.');
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
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
          headers: { "Authorization": `Bearer ${token}` }
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

  // Handle outside click for filter dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get combined activities
  const getAllActivities = () => {
    return [...assignments, ...quizzes];
  };

  // Filter activities by due date status
  const getActivitiesByStatus = (status) => {
    const now = new Date();
    const allActivities = getAllActivities();
    
    return allActivities.filter(activity => {
      const dueDate = new Date(activity.dueDate);
      
      if (status === 'upcoming') {
        // Show activities that are not yet due and not completed
        // Also include activities with no due date unless they're completed
        const isCompleted = isActivityCompleted(activity);
        const hasNoDueDate = !activity.dueDate || activity.dueDate === null || activity.dueDate === undefined;
        
        if (hasNoDueDate) {
          // Activities with no due date appear in upcoming unless completed
          return !isCompleted;
        } else {
          // Activities with due dates appear in upcoming if not yet due and not completed
          return dueDate >= now && !isCompleted;
        }
      } else if (status === 'past-due') {
        // Show activities that are past due and not completed
        const isCompleted = isActivityCompleted(activity);
        return dueDate < now && !isCompleted;
      } else if (status === 'completed') {
        // Show activities that have been submitted/completed
        return isActivityCompleted(activity);
      }
      return true;
    });
  };

  // Check if an activity has been completed (submitted) by the student
  const isActivityCompleted = (activity) => {
    console.log(`Checking completion for ${activity.type}: ${activity.title} (ID: ${activity._id})`);
    
    if (activity.type === 'assignment') {
      // Check if student has submitted this assignment
      const hasSubmission = submissions.some(submission => {
        const matches = submission.assignment === activity._id || 
        submission.assignment?._id === activity._id ||
        submission.assignmentId === activity._id;
        if (matches) {
          console.log('Found matching assignment submission:', submission);
        }
        return matches;
      });
      console.log(`Assignment ${activity.title} completed:`, hasSubmission);
      return hasSubmission;
    } else if (activity.type === 'quiz') {
      // Check if student has responded to this quiz
      const hasResponse = quizResponses.some(response => {
        const matches = response.quiz === activity._id || 
                       response.quiz?._id === activity._id ||
                       response.quizId === activity._id;
        if (matches) {
          console.log('Found matching quiz response:', response);
        }
        return matches;
      });
      console.log(`Quiz ${activity.title} completed:`, hasResponse);
      console.log('Available quiz responses:', quizResponses);
      return hasResponse;
    }
    return false;
  };

  // Apply filter to activities
  const getFilteredActivities = (activities) => {
    if (filter === "All") return activities;
    if (filter === "Quiz") return activities.filter(a => a.type === "quiz");
    if (filter === "Assignment") return activities.filter(a => a.type === "assignment");
    return activities;
  };

  // Group activities by due date (for Upcoming tab)
  const groupActivitiesByDueDate = (activities) => {
    // Separate activities with and without due dates
    const activitiesWithDueDate = activities.filter(activity => activity.dueDate);
    const activitiesWithoutDueDate = activities.filter(activity => !activity.dueDate);
    
    // Sort activities with due dates (ascending - nearest due date first)
    const sortedActivitiesWithDueDate = [...activitiesWithDueDate]
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Group by due date
    const groupedByDate = {};
    
    // Add activities with due dates
    sortedActivitiesWithDueDate.forEach(activity => {
      const dueDate = new Date(activity.dueDate);
      const dateKey = dueDate.toDateString();
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(activity);
    });
    
    // Add activities without due dates to a special group
    if (activitiesWithoutDueDate.length > 0) {
      groupedByDate['No due date'] = activitiesWithoutDueDate;
    }
    
    // Sort date keys (nearest due date first, "No due date" at the end)
    const dateKeys = Object.keys(groupedByDate).filter(key => key !== 'No due date');
    const sortedDateKeys = dateKeys.sort((a, b) => new Date(a) - new Date(b));
    
    // Add "No due date" at the end
    if (groupedByDate['No due date']) {
      sortedDateKeys.push('No due date');
    }
    
    return { groupedByDate, sortedDateKeys };
  };

  // Group activities by submission date (for Completed tab)
  const groupActivitiesBySubmissionDate = (activities) => {
    // Add submission date to each activity
    const activitiesWithSubmissionDate = activities.map(activity => {
      let submissionDate = null;
      
      if (activity.type === 'assignment') {
        // Find the submission for this assignment
        const submission = submissions.find(sub => 
          sub.assignment === activity._id || sub.assignment?._id === activity._id
        );
        submissionDate = submission ? new Date(submission.submittedAt || submission.createdAt) : null;
      } else if (activity.type === 'quiz') {
        // Find the quiz response for this quiz
        const response = quizResponses.find(resp => 
          resp.quiz === activity._id || resp.quiz?._id === activity._id || resp.quizId === activity._id
        );
        submissionDate = response ? new Date(response.submittedAt || response.createdAt) : null;
      }
      
      return { ...activity, submissionDate };
    });
    
    // Sort by submission date (ascending - oldest submissions first, latest at bottom)
    const sortedActivities = activitiesWithSubmissionDate
      .filter(activity => activity.submissionDate) // Only include activities with submission dates
      .sort((a, b) => new Date(a.submissionDate) - new Date(b.submissionDate));
    
    // Group by submission date
    const groupedByDate = {};
    sortedActivities.forEach(activity => {
      const submissionDate = activity.submissionDate;
      const dateKey = submissionDate.toDateString();
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(activity);
    });
    
    // Sort date keys (oldest submission date first, latest at bottom)
    const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));
    
    return { groupedByDate, sortedDateKeys };
  };

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
                {academicYear && currentTerm && (
                  <>
                    {(() => {
                      console.log('Academic Year Object:', academicYear);
                      console.log('Current Term Object:', currentTerm);
                      
                      if (typeof academicYear === 'object') {
                        // Handle different possible formats for the year data
                        let startYear, endYear;
                        
                        if (academicYear.schoolYearStart && academicYear.schoolYearEnd) {
                          // If they're already year numbers
                          if (typeof academicYear.schoolYearStart === 'number') {
                            startYear = academicYear.schoolYearStart;
                            endYear = academicYear.schoolYearEnd;
                          } else {
                            // If they're date strings or timestamps
                            startYear = new Date(academicYear.schoolYearStart).getFullYear();
                            endYear = new Date(academicYear.schoolYearEnd).getFullYear();
                          }
                        } else {
                          // Fallback: try to extract from other fields or use current year
                          const currentYear = new Date().getFullYear();
                          startYear = currentYear;
                          endYear = currentYear + 1;
                        }
                        
                        console.log('Extracted years:', startYear, endYear);
                        return `${startYear}-${endYear}`;
                      }
                      return academicYear;
                    })()} | {typeof currentTerm === 'object' ? currentTerm.termName : currentTerm} | {" "}
                  </>
                )}
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
            {/* Filter and Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-black text-2xl font-bold mb-2">
                  {activeTab === "upcoming" && "Upcoming"}
                  {activeTab === "past-due" && "Past Due"}
                  {activeTab === "completed" && "Completed"}
                </h3>
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
            </div>

            {loading ? (
              <p>Loading activities...</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : (
              (() => {
                const statusActivities = getActivitiesByStatus(activeTab);
                const filteredActivities = getFilteredActivities(statusActivities);
                
                if (filteredActivities.length === 0) {
                  return <p className="mt-4">No activities found.</p>;
                }
                
                // Use different grouping based on the active tab
                const { groupedByDate, sortedDateKeys } = activeTab === 'completed' 
                  ? groupActivitiesBySubmissionDate(filteredActivities)
                  : groupActivitiesByDueDate(filteredActivities);
                
                return sortedDateKeys.map(dateKey => (
                  <div key={dateKey}>
                    {/* Date separator */}
                    <div className="mb-4 mt-6 first:mt-0">
                      <h4 className="text-lg font-semibold text-gray-700 mb-3">
                        {dateKey === 'No due date' ? (
                          'No due date'
                        ) : (
                          <>
                            {activeTab === 'completed' ? 'Submitted on ' : 'Due on '}
                            {new Date(dateKey).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </>
                        )}
                      </h4>
                    </div>
                    
                    {/* Activities for this date */}
                    {groupedByDate[dateKey].map((activity) => (
                      <div
                        key={`${activity.type}-${activity._id}-${activity.classInfo?.classCode || 'unknown'}`}
                        className="bg-[#00418B] p-4 rounded-xl shadow-lg mb-4 hover:bg-[#002d5a] cursor-pointer transition-colors"
                        onClick={() => {
                          if (activity.type === 'assignment') {
                            navigate(`/assignment/${activity._id}`);
                          } else if (activity.type === 'quiz') {
                            navigate(`/quiz/${activity._id}`);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-white text-xl md:text-2xl font-semibold mb-2">{activity.title}</h3>
                            <p className="text-white/90 text-sm mb-1">
                              Due at {activity.dueDate ? new Date(activity.dueDate).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              }) : 'No due date'}
                            </p>
                            <p className="text-white/80 text-sm font-medium">
                              {activity.classInfo?.classCode || 'N/A'} | {activity.classInfo?.className || 'Unknown Class'}
                            </p>
                            {activity.instructions && (
                              <p className="text-white/70 text-xs mt-1 line-clamp-2">
                                {activity.instructions}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="bg-white/20 text-white px-3 py-1 rounded text-xs uppercase font-bold mb-1">
                              {activity.type === 'assignment' ? 'ASSIGNMENT' : 'QUIZ'}
                            </div>
                            <div className="text-white font-bold text-lg">
                              {activity.points || 0} Points
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
        </div>
      </div>
    </>
  );
}
