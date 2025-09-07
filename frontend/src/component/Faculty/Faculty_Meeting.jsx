import React, { useEffect, useState } from 'react';
import Faculty_Navbar from './Faculty_Navbar';
import ProfileMenu from '../ProfileMenu';
import CreateMeetingModal from '../Meeting/CreateMeetingModal';
import MeetingList from '../Meeting/MeetingList';
import { Video, Users, Calendar, Plus } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

const Faculty_Meeting = () => {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [meetingRefreshTrigger, setMeetingRefreshTrigger] = useState(0);
  const [userInfo, setUserInfo] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [studentCounts, setStudentCounts] = useState({});

  // Get user info from token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo({
          name: payload.firstName && payload.lastName ? `${payload.firstName} ${payload.lastName}` : payload.username || 'User',
          email: payload.email || ''
        });
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
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

  // Fetch faculty's assigned classes only for the current active term
  useEffect(() => {
    async function fetchClasses() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No authentication token found");
          return;
        }

        // Decode token to check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isTokenExpired = Date.now() >= payload.exp * 1000;
        
        if (isTokenExpired) {
          console.error("Token has expired");
          localStorage.removeItem("token");
          return;
        }

        // Only fetch classes if we have both an active school year AND an active term
        if (!academicYear || !currentTerm) {
          setClasses([]);
          setSelectedClass(null);
          setLoading(false);
          return;
        }

        // Primary: use my-classes (same flow as students)
        try {
          const resMy = await fetch(`${API_BASE}/classes/my-classes`, {
            method: 'GET',
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          if (resMy.ok) {
            const data = await resMy.json();
            const activeClasses = data.filter(cls => {
              if (!cls.termName || cls.termName !== currentTerm.termName) return false;
              if (!cls.academicYear || !academicYear) return false;
              const expectedYear = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
              if (cls.academicYear !== expectedYear) return false;
              if (cls.isArchived === true) return false;
              return true;
            });
            console.log('[Faculty_Meeting] my-classes active count:', activeClasses.length);
            if (activeClasses.length > 0) {
              setClasses(activeClasses);
              setSelectedClass(activeClasses[0]);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('[Faculty_Meeting] Error fetching my-classes:', err);
        }

        // Secondary: faculty-specific endpoint
        try {
          const res = await fetch(`${API_BASE}/classes/faculty-classes`, {
            method: 'GET',
            headers: { 
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });

          if (res.status === 401) {
            localStorage.removeItem("token");
            console.error("Authentication failed: Invalid or expired token");
            return;
          }

          if (res.ok) {
            const data = await res.json();
            const activeClasses = data.filter(cls => {
              if (!cls.termName || cls.termName !== currentTerm.termName) return false;
              if (!cls.academicYear || !academicYear) return false;
              const expectedYear = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
              if (cls.academicYear !== expectedYear) return false;
              if (cls.isArchived === true) return false;
              return true;
            });
            console.log('[Faculty_Meeting] faculty-classes active count:', activeClasses.length);
            if (activeClasses.length > 0) {
              setClasses(activeClasses);
              setSelectedClass(activeClasses[0]);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("Error fetching faculty classes:", err);
        }

        // Fallback: use my-classes (server filters by logged-in user)
        try {
          const fallbackRes = await fetch(`${API_BASE}/classes/my-classes`, {
            method: 'GET',
            headers: { 
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });

          if (fallbackRes.ok) {
            const allClasses = await fallbackRes.json();
            const facultyClasses = allClasses.filter(cls => {
              // MUST have termName and match current term
              if (!cls.termName || cls.termName !== currentTerm.termName) return false;
              
              // MUST have academicYear and match current academic year
              if (!cls.academicYear || !academicYear) return false;
              const expectedYear = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
              if (cls.academicYear !== expectedYear) return false;
              
              // MUST be not archived
              if (cls.isArchived === true) return false;
              
              return true;
            });
            
            setClasses(facultyClasses);
            if (facultyClasses.length > 0) {
              setSelectedClass(facultyClasses[0]);
            }
          }
        } catch (err) {
          console.error("Error in fallback class fetch:", err);
        }
      } catch (err) {
        console.error("Authentication error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, [currentTerm, academicYear]); // Re-run when term or year changes

  // Compute student counts per class via members endpoint
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const pairs = await Promise.all((classes || []).map(async (cls) => {
          try {
            if (!cls?.classID) return [cls?.classID || '', 0];
            const res = await fetch(`${API_BASE}/classes/${cls.classID}/members`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              const count = Array.isArray(data?.students) ? data.students.filter(s => (s.role || '').toLowerCase() === 'students').length : 0;
              return [cls.classID, count];
            }
          } catch (e) {
            console.error('[Faculty_Meeting] members count fetch error:', e);
          }
          return [cls?.classID || '', 0];
        }));
        const map = {};
        for (const [id, c] of pairs) { if (id) map[id] = c; }
        setStudentCounts(map);
      } catch (e) {
        console.error('[Faculty_Meeting] counts aggregation error:', e);
      }
    };
    if (classes && classes.length > 0) loadCounts();
  }, [classes]);

  // Meeting handlers
  const handleMeetingCreated = (newMeeting) => {
    setMeetingRefreshTrigger(prev => prev + 1);
  };

  const handleJoinMeeting = async (meeting) => {
    // Meeting functionality removed - show placeholder message
    alert('Meeting functionality has been disabled. Please contact your administrator for video conferencing options.');
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Faculty_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Meeting</h2>
            <p className="text-base md:text-lg">
              <span> </span>{academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              <span> </span>{currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
              <span> </span>{new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu/>
        </div>
        {/* Class Selection */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading classes...</span>
          </div>
        ) : !academicYear ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Active School Year</h3>
            <p className="text-gray-500">There is no active school year configured.</p>
            <p className="text-gray-400 text-sm mt-2">Please ask the administrator to activate a school year.</p>
          </div>
        ) : !currentTerm ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Active Term</h3>
            <p className="text-gray-500">There is no active term for the current academic year.</p>
            <p className="text-gray-400 text-sm mt-2">Please ask the administrator to activate a term.</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Active Classes</h3>
            <p className="text-gray-500">There are no active classes to set meetings in for the current academic year.</p>
            <p className="text-gray-400 text-sm mt-2">Please ask the administrator to activate a school year and assign classes.</p>
          </div>
        ) : (
          <>
            {/* Class Selector */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Class for Meeting</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((classItem) => (
                  <button
                    key={classItem._id}
                    onClick={() => setSelectedClass(classItem)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedClass?._id === classItem._id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        selectedClass?._id === classItem._id ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{classItem.className}</h4>
                        <p className="text-sm text-gray-500">{classItem.classCode}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {studentCounts[classItem.classID] ?? 0} students
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting Management Section */}
            {selectedClass && (
              <div className="space-y-6">
                {/* Meeting Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Video className="w-8 h-8 text-blue-600" />
                        Meetings for {selectedClass.className}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        Class ID: {selectedClass._id} • {studentCounts[selectedClass.classID] ?? 0} Students
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCreateMeetingModal(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                    >
                      <Plus className="w-5 h-5" />
                      Create Meeting
                    </button>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Quick Actions</p>
                          <p className="text-xs text-blue-500">Create instant or scheduled meetings</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-sm text-green-600 font-medium">Class Members</p>
                          <p className="text-xs text-green-500">{studentCounts[selectedClass.classID] ?? 0} students can join</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Video className="w-8 h-8 text-purple-600" />
                        <div>
                          <p className="text-sm text-purple-600 font-medium">Meeting Platform</p>
                          <p className="text-xs text-purple-500">Schedule and manage meetings</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meeting List */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Schedule</h3>
                  <MeetingList
                    classId={selectedClass._id}
                    userRole="faculty"
                    onJoinMeeting={handleJoinMeeting}
                    refreshTrigger={meetingRefreshTrigger}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Create Meeting Modal */}
        {selectedClass && (
          <CreateMeetingModal
            isOpen={showCreateMeetingModal}
            onClose={() => setShowCreateMeetingModal(false)}
            classID={selectedClass._id}
            onMeetingCreated={handleMeetingCreated}
          />
        )}

      </div>
    </div>
  );
};

export default Faculty_Meeting;