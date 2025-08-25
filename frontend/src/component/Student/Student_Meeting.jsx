import React, { useEffect, useState } from 'react';
import Student_Navbar from './Student_Navbar';
import ProfileMenu from '../ProfileMenu';
import MeetingList from '../Meeting/MeetingList';
import { Video, Users, Calendar } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

const Student_Meeting = () => {
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
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
    const fetchAcademicYear = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/schoolyear/current`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setAcademicYear(data);
        }
      } catch (error) {
        console.error('Error fetching academic year:', error);
      }
    };
    fetchAcademicYear();
  }, []);

  useEffect(() => {
    const fetchCurrentTerm = async () => {
      if (!academicYear) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/terms/current/${academicYear._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentTerm(data);
        }
      } catch (error) {
        console.error('Error fetching current term:', error);
      }
    };
    fetchCurrentTerm();
  }, [academicYear]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!currentTerm) return;
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/classes/my-classes`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const activeClasses = data.filter(cls => {
            if (!cls.termName || cls.termName !== currentTerm.termName) return false;
            if (!cls.academicYear || !academicYear) return false;
            const expectedYear = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
            if (cls.academicYear !== expectedYear) return false;
            if (cls.isArchived === true) return false;
            return true;
          });
          setClasses(activeClasses);
          if (activeClasses.length > 0 && !selectedClass) {
            setSelectedClass(activeClasses[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
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
            console.error('[Student_Meeting] members count fetch error:', e);
          }
          return [cls?.classID || '', 0];
        }));
        const map = {};
        for (const [id, c] of pairs) { if (id) map[id] = c; }
        setStudentCounts(map);
      } catch (e) {
        console.error('[Student_Meeting] counts aggregation error:', e);
      }
    };
    if (classes && classes.length > 0) loadCounts();
  }, [classes]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Classes</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {classes.map((cls) => (
                <button
                  key={cls._id}
                  onClick={() => setSelectedClass(cls)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedClass?._id === cls._id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{cls.className || cls.name}</div>
                  <div className="text-sm text-gray-500">
                    {cls.subjectName || cls.subject?.name || 'No subject'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Video Meetings</h1>
              <p className="text-gray-600">Join class meetings and participate</p>
            </div>
            <div className="flex items-center gap-4">
              <ProfileMenu />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedClass ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
              <p className="text-gray-500">Choose a class from the sidebar to view meetings</p>
            </div>
          ) : (
            <>
              {/* Class Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <Video className="w-8 h-8 text-blue-600" />
                      Meetings for {selectedClass.className || selectedClass.name}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Class ID: {selectedClass._id}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Meeting Schedule</p>
                        <p className="text-xs text-blue-500">View and join scheduled meetings</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-green-600 font-medium">Class Members</p>
                        <p className="text-xs text-green-500">{studentCounts[selectedClass.classID] ?? 0} students in class</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Video className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Video Platform</p>
                        <p className="text-xs text-purple-500">Powered by Jitsi Meet</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meeting List - Join Only */}
              {selectedClass && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Video className="w-8 h-8 text-blue-600" />
                        Meetings for {selectedClass.className || selectedClass.name}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        Class ID: {selectedClass._id}
                      </p>
                    </div>
                  </div>

                  <MeetingList
                    classId={selectedClass._id}
                    userRole="student"
                    refreshTrigger={meetingRefreshTrigger}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Student_Meeting;


