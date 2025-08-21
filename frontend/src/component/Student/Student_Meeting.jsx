import React, { useEffect, useState } from 'react';
import Student_Navbar from './Student_Navbar';
import ProfileMenu from '../ProfileMenu';
import MeetingList from '../Meeting/MeetingList';
import VideoMeetingRoom from '../Meeting/VideoMeetingRoom';
import { Users, Video, Calendar } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Meeting() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetingRefreshTrigger, setMeetingRefreshTrigger] = useState(0);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [userInfo, setUserInfo] = useState({ name: '', email: '' });
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  // Get user info from token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo({
          name: payload.firstName && payload.lastName ? `${payload.firstName} ${payload.lastName}` : payload.username || 'Student',
          email: payload.email || ''
        });
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }, []);

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

  // Fetch active term for year
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

  // Fetch student's classes for the current active term
  useEffect(() => {
    async function fetchClasses() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Only fetch classes if we have both an active school year AND an active term
        if (!academicYear || !currentTerm) {
          setClasses([]);
          setSelectedClass(null);
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/classes/my-classes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter classes to only show those active for the current term
          const activeClasses = data.filter(cls => {
            // Check if class has term information and matches current term
            if (cls.term && cls.term !== currentTerm.termName) {
              return false;
            }
            // Check if class has school year and matches current academic year
            if (cls.schoolYear && academicYear) {
              const expectedYear = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
              if (cls.schoolYear !== expectedYear) {
                return false;
              }
            }
            // Check if class is active/ongoing
            if (cls.status && cls.status !== 'active') {
              return false;
            }
            return true;
          });
          
          setClasses(activeClasses || []);
          if (activeClasses && activeClasses.length > 0) setSelectedClass(activeClasses[0]);
        }
      } catch (err) {
        console.error('Failed to fetch student classes', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, [currentTerm, academicYear]);

  const handleJoinMeeting = (meeting) => {
    const meetingData = {
      ...meeting,
      meetingId: String(meeting._id),
      title: meeting.title || 'Video Meeting',
    };
    setActiveMeeting(meetingData);
  };

  const handleLeaveMeeting = () => {
    setActiveMeeting(null);
    setMeetingRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Meeting</h2>
          </div>
          <ProfileMenu />
        </div>

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
            <p className="text-gray-500">You are not enrolled in any active classes for the current term.</p>
            <p className="text-gray-400 text-sm mt-2">Please ask the administrator to activate a school year and enroll you in classes.</p>
          </div>
        ) : (
          <>
            {/* Class Selector */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Class</h3>
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
                        <h4 className="font-semibold">{classItem.className || classItem.name}</h4>
                        <p className="text-sm text-gray-500">{classItem.classCode || classItem._id}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {(classItem.members?.length || 0)} students
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
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
                  onJoinMeeting={handleJoinMeeting}
                  refreshTrigger={meetingRefreshTrigger}
                />
              </div>
            )}
          </>
        )}

        {/* Video Meeting Room */}
        {activeMeeting && (
          <VideoMeetingRoom
            meetingData={activeMeeting}
            currentUser={userInfo}
            onLeave={handleLeaveMeeting}
            isOpen={!!activeMeeting}
            isModerator={false}
          />
        )}
      </div>
    </div>
  );
}


