import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";
import { useSocket } from "../../contexts/SocketContext";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Activities() {
  console.log('Student_Activities component is rendering...');
  const navigate = useNavigate();
  const { addQuizCompletionListener } = useSocket();
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
  const [activityTypeFilter, setActivityTypeFilter] = useState("All");
  const [showActivityTypeFilterDropdown, setShowActivityTypeFilterDropdown] = useState(false);
  const activityTypeFilterRef = useRef();
  const [classFilter, setClassFilter] = useState("All Classes");
  const [showClassFilterDropdown, setShowClassFilterDropdown] = useState(false);
  const classFilterRef = useRef();
  const [studentClasses, setStudentClasses] = useState([]);

  // Students cannot export grades; removed export helper

  const tabs = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past-due", label: "Past Due" },
    { id: "completed", label: "Completed" },
  ];

  // Fetch academic year
  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        console.log('Fetching academic year...');
        const token = localStorage.getItem("token");
        if (!token) {
          console.error('No token found in localStorage');
          setError('Authentication required');
          return;
        }
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

  // Fetch activities using the same robust logic as Student_Dashboard, scoped by quarter/term/year
  useEffect(() => {
    const fetchActivities = async () => {
      if (!academicYear || !currentTerm) return;
      
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        const userId = decodedToken.userID; // Student ID like S441
        const userObjectId = decodedToken.id; // MongoDB ObjectId
        console.log('Fetching activities for student:', userId);
        console.log('User ObjectId:', userObjectId);
        
        // First, fetch student's enrolled classes using the same endpoint as Student_Dashboard
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
        
        // Apply the same filtering logic as Student_Dashboard
        const activeClasses = classes.filter(cls => {
          // Filter out archived classes
          if (cls.isArchived === true) {
            console.log(`Filtering out archived class: ${cls.className || cls.classCode}`);
            return false;
          }
          
          
          // Filter by academic year (tolerate missing academicYear)
          if (cls.academicYear && cls.academicYear !== `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`) {
            console.log(`Filtering out class with wrong year: ${cls.className || cls.classCode} (${cls.academicYear})`);
            return false;
          }
          
          // Filter by term (tolerate missing termName)
          if (cls.termName && cls.termName !== currentTerm.termName) {
            console.log(`Filtering out class with wrong term: ${cls.className || cls.classCode} (${cls.termName})`);
            return false;
          }
          
          console.log(`Including class: ${cls.className || cls.classCode}`);
          return true;
        });
        
        // Store student classes for filtering
        setStudentClasses(activeClasses);
        
        console.log('Active classes for activities:', activeClasses);
        
        let allAssignments = [];
        let allQuizzes = [];
        
        // Fetch assignments and quizzes for each active class
        for (const cls of activeClasses) {
          const classCode = cls.classID || cls.classCode || cls._id;
          console.log('Fetching activities for class:', classCode, cls.className);
          
          try {
            // Fetch assignments for this class (get all quarters for the term)
            const assignmentRes = await fetch(`${API_BASE}/assignments?classID=${classCode}&termName=${encodeURIComponent(currentTerm.termName)}&academicYear=${encodeURIComponent(`${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`)}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (assignmentRes.ok) {
              const assignments = await assignmentRes.json();
              console.log(`Assignments for class ${classCode}:`, assignments);
              
              if (Array.isArray(assignments)) {
                // Filter assignments assigned to this student - handle both ObjectId and userID
                const studentAssignments = assignments.filter(assignment => {
                  const entry = assignment.assignedTo?.find?.(e => e.classID === classCode);
                  if (!entry || !Array.isArray(entry.studentIDs)) return false;
                  
                  // Check if student is in the assignedTo list using multiple ID formats
                  const studentInList = entry.studentIDs.some(studentId => {
                    const studentIdStr = String(studentId);
                    const userIdStr = String(userId);
                    const userObjectIdStr = String(userObjectId);
                    
                    return studentIdStr === userIdStr || 
                           studentIdStr === userObjectIdStr ||
                           studentId === userId ||
                           studentId === userObjectId;
                  });
                  
                  console.log(`Assignment ${assignment.title}: studentIDs=${entry.studentIDs}, userId=${userId}, userObjectId=${userObjectId}, included=${studentInList}`);
                  return studentInList;
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
            
            // Fetch quizzes for this class (get all quarters for the term)
            const quizRes = await fetch(`${API_BASE}/api/quizzes?classID=${classCode}&termName=${encodeURIComponent(currentTerm.termName)}&academicYear=${encodeURIComponent(`${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`)}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (quizRes.ok) {
              const quizzes = await quizRes.json();
              console.log(`Quizzes for class ${classCode}:`, quizzes);
              
              if (Array.isArray(quizzes)) {
                // Filter quizzes assigned to this student - handle both ObjectId and userID
                const studentQuizzes = quizzes.filter(quiz => {
                  const entry = quiz.assignedTo?.find?.(e => e.classID === classCode);
                  if (!entry || !Array.isArray(entry.studentIDs)) return false;
                  
                  // Check if student is in the assignedTo list using multiple ID formats
                  const studentInList = entry.studentIDs.some(studentId => {
                    const studentIdStr = String(studentId);
                    const userIdStr = String(userId);
                    const userObjectIdStr = String(userObjectId);
                    
                    return studentIdStr === userIdStr || 
                           studentIdStr === userObjectIdStr ||
                           studentId === userId ||
                           studentId === userObjectId;
                  });
                  
                  console.log(`Quiz ${quiz.title}: studentIDs=${entry.studentIDs}, userId=${userId}, userObjectId=${userObjectId}, included=${studentInList}`);
                  return studentInList;
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
        console.log('Student ID being used for filtering:', { userId, userObjectId });
        
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
                // Find submissions by this student - handle both ObjectId and userID
                const studentSubmissions = submissionData.filter(sub => {
                  const studentId = sub.student?._id || sub.student || sub.student?.userID;
                  if (!studentId) return false;
                  
                  const studentIdStr = String(studentId);
                  const userIdStr = String(userId);
                  const userObjectIdStr = String(userObjectId);
                  
                  return studentIdStr === userIdStr || 
                         studentIdStr === userObjectIdStr ||
                         studentId === userId ||
                         studentId === userObjectId;
                });
                allSubmissions.push(...studentSubmissions);
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch submissions for assignment ${assignment._id}:`, err);
          }
        }
        
        // Fetch quiz responses
        let allQuizResponses = [];
        for (const quiz of allQuizzes) {
          try {
            const responseRes = await fetch(`${API_BASE}/api/quizzes/${quiz._id}/responses`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (responseRes.ok) {
              const responseData = await responseRes.json();
              if (Array.isArray(responseData)) {
                // Find responses by this student - handle both ObjectId and userID
                const studentResponses = responseData.filter(resp => {
                  const studentId = resp.student?._id || resp.student || resp.student?.userID;
                  if (!studentId) return false;
                  
                  const studentIdStr = String(studentId);
                  const userIdStr = String(userId);
                  const userObjectIdStr = String(userObjectId);
                  
                  return studentIdStr === userIdStr || 
                         studentIdStr === userObjectIdStr ||
                         studentId === userId ||
                         studentId === userObjectId;
                });
                allQuizResponses.push(...studentResponses);
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch responses for quiz ${quiz._id}:`, err);
          }
        }
        
        setAssignments(allAssignments);
        setQuizzes(allQuizzes);
        setSubmissions(allSubmissions);
        setQuizResponses(allQuizResponses);
        
        console.log('Final data summary:', {
          assignments: allAssignments.length,
          quizzes: allQuizzes.length,
          submissions: allSubmissions.length,
          quizResponses: allQuizResponses.length
        });
        
      } catch (err) {
        console.error('Failed to fetch activities:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch activities when we have both academic year and term
    if (academicYear && currentTerm) {
      fetchActivities();
    }
  }, [academicYear, currentTerm]);

  // Add quiz completion listener for real-time updates
  useEffect(() => {
    const handleQuizCompletion = (data) => {
      console.log('[Student_Activities] Quiz completion event received:', data);
      
      // Get current user info
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      const currentUserId = decodedToken.userID;
      const currentUserObjectId = decodedToken.id;
      
      // Check if this completion is for the current student
      const isCurrentStudent = data.studentId === currentUserId || 
                              data.studentId === currentUserObjectId ||
                              String(data.studentId) === String(currentUserId) ||
                              String(data.studentId) === String(currentUserObjectId);
      
      if (isCurrentStudent) {
        console.log('[Student_Activities] Quiz completion is for current student, refreshing activities...');
        
        // Refresh activities to show updated quiz status
        if (academicYear && currentTerm) {
          // Trigger a re-fetch of activities
          const fetchActivities = async () => {
            setLoading(true);
            try {
              const token = localStorage.getItem('token');
              const decodedToken = JSON.parse(atob(token.split('.')[1]));
              const userId = decodedToken.userID;
              const userObjectId = decodedToken.id;
              
              // Fetch student's enrolled classes
              const classesRes = await fetch(`${API_BASE}/classes/my-classes`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (!classesRes.ok) {
                throw new Error('Failed to fetch classes');
              }
              
              const classes = await classesRes.json();
              
              // Apply filtering logic
              const activeClasses = classes.filter(cls => {
                if (cls.isArchived === true) return false;
                if (cls.academicYear && cls.academicYear !== `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`) return false;
                if (cls.termName && cls.termName !== currentTerm.termName) return false;
                return true;
              });
              
              setStudentClasses(activeClasses);
              
              let allAssignments = [];
              let allQuizzes = [];
              
              // Fetch assignments and quizzes for each active class
              for (const cls of activeClasses) {
                const classCode = cls.classID || cls.classCode || cls._id;
                
                try {
                  // Fetch assignments
                  const assignmentRes = await fetch(`${API_BASE}/assignments?classID=${classCode}&termName=${encodeURIComponent(currentTerm.termName)}&academicYear=${encodeURIComponent(`${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  
                  if (assignmentRes.ok) {
                    const assignments = await assignmentRes.json();
                    if (Array.isArray(assignments)) {
                      const studentAssignments = assignments.filter(assignment => {
                        const entry = assignment.assignedTo?.find?.(e => e.classID === classCode);
                        if (!entry || !Array.isArray(entry.studentIDs)) return false;
                        
                        const studentInList = entry.studentIDs.some(studentId => {
                          const studentIdStr = String(studentId);
                          const userIdStr = String(userId);
                          const userObjectIdStr = String(userObjectId);
                          
                          return studentIdStr === userIdStr || 
                                 studentIdStr === userObjectIdStr ||
                                 studentId === userId ||
                                 studentId === userObjectId;
                        });
                        
                        return studentInList;
                      });
                      
                      const assignmentsWithClass = studentAssignments.map(assignment => ({
                        ...assignment,
                        classInfo: {
                          classID: classCode,
                          className: cls.className || cls.classCode,
                          classCode: cls.classCode
                        }
                      }));
                      
                      allAssignments = [...allAssignments, ...assignmentsWithClass];
                    }
                  }
                  
                  // Fetch quizzes
                  const quizRes = await fetch(`${API_BASE}/quizzes?classID=${classCode}&termName=${encodeURIComponent(currentTerm.termName)}&academicYear=${encodeURIComponent(`${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  
                  if (quizRes.ok) {
                    const quizzes = await quizRes.json();
                    if (Array.isArray(quizzes)) {
                      const studentQuizzes = quizzes.filter(quiz => {
                        const entry = quiz.assignedTo?.find?.(e => e.classID === classCode);
                        if (!entry || !Array.isArray(entry.studentIDs)) return false;
                        
                        const studentInList = entry.studentIDs.some(studentId => {
                          const studentIdStr = String(studentId);
                          const userIdStr = String(userId);
                          const userObjectIdStr = String(userObjectId);
                          
                          return studentIdStr === userIdStr || 
                                 studentIdStr === userObjectIdStr ||
                                 studentId === userId ||
                                 studentId === userObjectId;
                        });
                        
                        return studentInList;
                      });
                      
                      const quizzesWithClass = studentQuizzes.map(quiz => ({
                        ...quiz,
                        classInfo: {
                          classID: classCode,
                          className: cls.className || cls.classCode,
                          classCode: cls.classCode
                        }
                      }));
                      
                      allQuizzes = [...allQuizzes, ...quizzesWithClass];
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching activities for class ${classCode}:`, error);
                }
              }
              
              // Fetch submissions and quiz responses
              const submissionsRes = await fetch(`${API_BASE}/submissions?studentId=${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (submissionsRes.ok) {
                const submissions = await submissionsRes.json();
                setSubmissions(submissions);
              }
              
              const quizResponsesRes = await fetch(`${API_BASE}/quiz-responses?studentId=${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (quizResponsesRes.ok) {
                const quizResponses = await quizResponsesRes.json();
                setQuizResponses(quizResponses);
              }
              
              setAssignments(allAssignments);
              setQuizzes(allQuizzes);
              setLoading(false);
              
            } catch (error) {
              console.error('Error refreshing activities after quiz completion:', error);
              setLoading(false);
            }
          };
          
          fetchActivities();
        }
      }
    };
    
    const removeListener = addQuizCompletionListener(handleQuizCompletion);
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [addQuizCompletionListener, academicYear, currentTerm]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
      if (activityTypeFilterRef.current && !activityTypeFilterRef.current.contains(event.target)) {
        setShowActivityTypeFilterDropdown(false);
      }
      if (classFilterRef.current && !classFilterRef.current.contains(event.target)) {
        setShowClassFilterDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get activities by status (same logic as before)
  const getActivitiesByStatus = (status) => {
    const now = new Date();
    const allActivities = [
      ...assignments.map(item => ({ ...item, type: 'assignment' })),
      ...quizzes.map(item => ({ ...item, type: 'quiz' }))
    ];

    switch (status) {
      case 'upcoming':
        return allActivities.filter(activity => {
          // If already completed/graded, don't show in upcoming
          if (hasStudentCompleted(activity)) return false;
          
          // If no due date and not completed, show in upcoming
          if (!activity.dueDate) return true;
          
          // If has due date, check if it's in the future
          const dueDate = new Date(activity.dueDate);
          return dueDate > now;
        });
      case 'past-due':
        return allActivities.filter(activity => {
          // If already completed/graded, don't show in past-due
          if (hasStudentCompleted(activity)) return false;
          
          // If no due date, don't show in past-due
          if (!activity.dueDate) return false;
          
          // If has due date, check if it's in the past
          const dueDate = new Date(activity.dueDate);
          return dueDate < now;
        });
      case 'completed':
        return allActivities.filter(activity => hasStudentCompleted(activity));
      default:
        return allActivities;
    }
  };

  // Check if student has completed an activity (must be graded to be considered completed)
  const hasStudentCompleted = (activity) => {
    if (activity.type === 'assignment') {
      return submissions.some(sub => {
        const assignmentId = sub.assignment?._id || sub.assignment;
        const activityId = activity._id;
        
        // Check if submission exists AND is graded
        return String(assignmentId) === String(activityId) && 
               (sub.status === 'graded' || sub.graded === true);
      });
    } else if (activity.type === 'quiz') {
      return quizResponses.some(resp => {
        const quizId = resp.quiz?._id || resp.quiz || resp.quizId;
        const activityId = activity._id;
        
        // Check if response exists AND is graded
        return String(quizId) === String(activityId) && 
               (resp.graded === true || resp.status === 'graded');
      });
    }
    return false;
  };

  // Get student's score and highest possible score for completed activities
  const getStudentScore = (activity) => {
    if (activity.type === 'assignment') {
      const submission = submissions.find(sub => {
        const assignmentId = sub.assignment?._id || sub.assignment;
        const activityId = activity._id;
        return String(assignmentId) === String(activityId);
      });
      
      if (submission) {
        return {
          studentScore: submission.grade || 0,
          maxScore: activity.points || 0,
          isGraded: submission.status === 'graded' || submission.graded
        };
      }
    } else if (activity.type === 'quiz') {
      const response = quizResponses.find(resp => {
        const quizId = resp.quiz?._id || resp.quiz || resp.quizId;
        const activityId = activity._id;
        return String(quizId) === String(activityId);
      });
      
      if (response) {
        return {
          studentScore: response.score || 0,
          maxScore: activity.points || 0,
          isGraded: response.graded === true
        };
      }
    }
    
    return {
      studentScore: 0,
      maxScore: activity.points || 0,
      isGraded: false
    };
  };

  // Apply filter to activities
  const getFilteredActivities = (activities) => {
    let filtered = activities;
    
    // Apply activity type filter
    if (filter === "Quiz") {
      filtered = filtered.filter(a => a.type === "quiz");
    } else if (filter === "Assignment") {
      filtered = filtered.filter(a => a.type === "assignment");
    }
    
    // Apply category filter
    if (activityTypeFilter === "Written Works") {
      filtered = filtered.filter(a => a.activityType === "written");
    } else if (activityTypeFilter === "Performance Task") {
      filtered = filtered.filter(a => a.activityType === "performance");
    }
    
    // Apply class filter
    if (classFilter !== "All Classes") {
      filtered = filtered.filter(a => {
        const className = a.classInfo?.className || a.className || '';
        return className === classFilter;
      });
    }
    
    return filtered;
  };

  // Calculate student scores by class and category
  const calculateScoresByClass = (activities) => {
    const scoresByClass = {};
    
    activities.forEach(activity => {
      const className = activity.classInfo?.className || activity.className || 'Unknown Class';
      const category = activity.activityType === 'written' ? 'written' : 
                     activity.activityType === 'performance' ? 'performance' : 'uncategorized';
      
      if (!scoresByClass[className]) {
        scoresByClass[className] = { written: 0, performance: 0, uncategorized: 0, total: 0 };
      }
      
      // Get student's score for this activity
      let studentScore = 0;
      if (activity.type === 'assignment') {
        const submission = submissions.find(sub => {
          const assignmentId = sub.assignment?._id || sub.assignment;
          const activityId = activity._id;
          return String(assignmentId) === String(activityId);
        });
        studentScore = submission?.grade || 0;
      } else if (activity.type === 'quiz') {
        const response = quizResponses.find(resp => {
          const quizId = resp.quiz?._id || resp.quiz || resp.quizId;
          const activityId = activity._id;
          return String(quizId) === String(activityId);
        });
        studentScore = response?.score || 0;
      }
      
      scoresByClass[className][category] += studentScore;
      scoresByClass[className].total += studentScore;
    });
    
    return scoresByClass;
  };

  // Group activities by due date (for Upcoming tab) - same logic as faculty
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

  // Group activities by submission date (for Completed tab) - same logic as faculty
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
    
    // Sort by submission date (descending - most recent submissions first, oldest at bottom)
    const sortedActivities = activitiesWithSubmissionDate
      .filter(activity => activity.submissionDate) // Only include activities with submission dates
      .sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
    
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
    
    // Sort date keys (most recent submission date first, oldest at bottom)
    const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
    
    return { groupedByDate, sortedDateKeys };
  };

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        <Student_Navbar />

        <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {/* Loading Display */}
          {loading && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
              <strong>Loading...</strong> Fetching activities...
            </div>
          )}
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
            <div className="flex items-center gap-4">
              <ProfileMenu/>
            </div>
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
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Activity Type:</span>
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
                    <span className="text-sm font-medium text-gray-700">Category:</span>
                    <div className="relative" ref={activityTypeFilterRef}>
                      <button
                        className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-2 min-w-[140px] justify-between"
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Class:</span>
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
                          {['All Classes', ...[...new Set(studentClasses.map(cls => cls.className).filter(Boolean))].sort((a, b) => a.localeCompare(b))].map((option, idx) => (
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
                    <button
                      className="bg-gray-500 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded flex items-center gap-1"
                      onClick={() => {
                        setFilter("All");
                        setActivityTypeFilter("All");
                        setClassFilter("All Classes");
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Filters
                    </button>
                  </div>
                  {/* Export button removed for students */}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading activities...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
              </div>
            ) : (
              (() => {
                const statusActivities = getActivitiesByStatus(activeTab);
                const filteredActivities = getFilteredActivities(statusActivities);
                
                // Show score summary table only in completed tab when a specific class is selected (not All Classes)
                const showScoreTable = activeTab === 'completed' && classFilter !== 'All Classes' && filteredActivities.length > 0;
                const scoresByClass = showScoreTable ? calculateScoresByClass(filteredActivities) : {};
                
                if (filteredActivities.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No activities found.</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Status: {activeTab} | Filter: {filter} | Total Activities: {assignments.length + quizzes.length}
                      </p>
                    </div>
                  );
                }
                
                return (
                  <>
                    {/* Score Summary Table - only show in completed tab when a specific class is selected */}
                    {showScoreTable && (
                      <div className="mb-6 overflow-x-auto">
                        <div className="mb-2 text-sm text-gray-700">
                          <span className="font-semibold">Your Total Scores for {classFilter}:</span>
                        </div>
                        <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="p-2 border text-left">Class</th>
                              <th className="p-2 border text-right">Written Works</th>
                              <th className="p-2 border text-right">Performance Task</th>
                              <th className="p-2 border text-right">Uncategorized</th>
                              <th className="p-2 border text-right font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys(scoresByClass).sort((a, b) => a.localeCompare(b)).map((className) => (
                              <tr key={className} className="hover:bg-gray-50">
                                <td className="p-2 border">{className}</td>
                                <td className="p-2 border text-right">{scoresByClass[className].written}</td>
                                <td className="p-2 border text-right">{scoresByClass[className].performance}</td>
                                <td className="p-2 border text-right">{scoresByClass[className].uncategorized}</td>
                                <td className="p-2 border text-right font-bold">{scoresByClass[className].total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {/* Activities List */}
                    {(() => {
                      // Use different grouping based on the active tab - same logic as faculty
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
                          
                          {/* Activities for this date - same display format as faculty */}
                          {groupedByDate[dateKey].map((activity) => {
                      const scoreInfo = getStudentScore(activity);
                      const isCompleted = hasStudentCompleted(activity);
                      
                      return (
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
                              {/* Show score for completed activities */}
                              {isCompleted && (
                                <div className="mt-2 p-2 bg-white/10 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white/90 text-sm font-medium">Your Score:</span>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-lg font-bold ${
                                        scoreInfo.isGraded 
                                          ? 'text-white' 
                                          : 'text-yellow-300'
                                      }`}>
                                        {scoreInfo.studentScore} / {scoreInfo.maxScore}
                                      </span>
                                      {scoreInfo.isGraded ? (
                                        <span className="text-green-300 text-xs font-medium">✓ Graded</span>
                                      ) : (
                                        <span className="text-yellow-300 text-xs font-medium">⏳ Pending</span>
                                      )}
                                    </div>
                                  </div>
                                  {scoreInfo.isGraded && scoreInfo.maxScore > 0 && (
                                    <div className="mt-1">
                                      <div className="text-white/70 text-xs">
                                        Percentage: {((scoreInfo.studentScore / scoreInfo.maxScore) * 100).toFixed(1)}%
                                      </div>
                                    </div>
                                  )}
                                </div>
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
                      );
                          })}
                        </div>
                      ));
                    })()}
                  </>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </>
  );
}
