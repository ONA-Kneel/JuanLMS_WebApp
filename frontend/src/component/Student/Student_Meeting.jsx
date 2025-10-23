import React, { useEffect, useState } from 'react';
import Student_Navbar from './Student_Navbar';
import ProfileMenu from '../ProfileMenu';
import MeetingList from '../Meeting/MeetingList';
import StreamMeetingRoom from '../Meeting/StreamMeetingRoom';
import InvitedMeetings from '../Meeting/InvitedMeetings';
import StudentDirectInviteMeetingModal from '../Meeting/StudentDirectInviteMeetingModal';
import StudentUserSelector from '../Meeting/StudentUserSelector';
import { Users, Video, Calendar, UserPlus, Plus, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Meeting() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetingRefreshTrigger, setMeetingRefreshTrigger] = useState(0);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [studentCounts, setStudentCounts] = useState({});
  const [activeTab, setActiveTab] = useState('class-meetings'); // 'class-meetings', 'invited-meetings', or 'host-meeting'
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);

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
            // MUST have termName and match current term
            if (!cls.termName || cls.termName !== currentTerm.termName) {
              return false;
            }
            // MUST have academicYear and match current academic year
            if (!cls.academicYear || !academicYear) {
              return false;
            }
            const expectedYear = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
            if (cls.academicYear !== expectedYear) {
              return false;
            }
            // MUST be not archived
            if (cls.isArchived === true) {
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

  const handleJoinMeeting = async (meeting) => {
    try {
      console.log('[DEBUG] Student handleJoinMeeting received:', meeting);
      console.log('[DEBUG] Student meeting roomUrl:', meeting.roomUrl);
      // MeetingList already called the backend and provided roomUrl
      const meetingData = {
        ...meeting,
        meetingId: String(meeting._id),
        title: meeting.title || 'Video Meeting',
      };
      console.log('[DEBUG] Student setActiveMeeting with:', meetingData);
      setActiveMeeting(meetingData);
    } catch (error) {
      console.error('Error setting up meeting:', error);
      alert('Error joining meeting. Please try again.');
    }
  };

  const handleLeaveMeeting = () => {
    setActiveMeeting(null);
    setMeetingRefreshTrigger(prev => prev + 1);
  };

  const handleMeetingCreated = (newMeeting) => {
    setMeetingRefreshTrigger(prev => prev + 1);
    if (newMeeting.meetingType === 'instant') {
      // Auto-join instant meetings
      setActiveMeeting(newMeeting);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <Student_Navbar />
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
            <p className="text-gray-500">There are no active classes to set meetings in for the current academic year.</p>
            <p className="text-gray-400 text-sm mt-2">Please ask the administrator to activate a school year and enroll you in classes.</p>
          </div>
        ) : (
          <>
            {/* Unified container: tabs + content inside one brand-outlined card */}
            <div className="bg-white rounded-lg shadow-sm border-2 border-[#00418B] p-6 mb-6">
              <div className="border-b border-[#00418B] mb-4">
                <div className="flex overflow-x-auto">
                  {[
                    { id: 'class-meetings', label: 'Class Meetings' },
                    { id: 'invited-meetings', label: 'Direct Invitations' },
                    { id: 'host-meeting', label: 'Host Meeting' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 text-base font-medium whitespace-nowrap flex items-center ${
                        activeTab === tab.id
                          ? 'border-b-2 border-[#00418B] text-[#00418B]'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'class-meetings' && (
                <>
                  {/* Class Selector */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Class</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((classItem) => (
                  <button
                    key={classItem._id}
                    onClick={() => setSelectedClass(classItem)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedClass?._id === classItem._id
                        ? 'border-2 border-[#00418B] bg-blue-50 text-[#00418B]'
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
                          {studentCounts[classItem.classID] ?? 0} students
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                  </div>

                  {/* Meeting List - Join Only */}
                  {selectedClass && (
                    <div className="mt-6">
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

              {/* Invited Meetings Tab */}
              {activeTab === 'invited-meetings' && (
                <div className="mt-2">
                  <InvitedMeetings
                    onJoinMeeting={handleJoinMeeting}
                    refreshTrigger={meetingRefreshTrigger}
                  />
                </div>
              )}

              {/* Host Meeting Tab */}
              {activeTab === 'host-meeting' && (
                <>
                  {/* Student Hosted Meetings List */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Hosted Meetings</h3>
                    <MeetingList
                      classId="direct-invite" // Special identifier for direct invitation meetings
                      userRole="student"
                      onJoinMeeting={handleJoinMeeting}
                      refreshTrigger={meetingRefreshTrigger}
                    />
                  </div>

                  {/* Student Selection Section */}
                  <div className="">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Select Students to Invite</h3>
                      <button
                        onClick={() => setShowCreateMeetingModal(true)}
                        disabled={selectedStudents.length === 0}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                      >
                        <Plus className="w-5 h-5" />
                        Create Meeting ({selectedStudents.length})
                      </button>
                    </div>

                    <StudentUserSelector
                      selectedUsers={selectedStudents}
                      onUsersChange={setSelectedStudents}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Stream Meeting Room */}
        {activeMeeting && (
          <StreamMeetingRoom
            meetingData={activeMeeting}
            onLeave={handleLeaveMeeting}
            isOpen={!!activeMeeting}
            isHost={false}
            hostUserId={activeMeeting.hostName || 'Host'}
          />
        )}

        {/* Student Direct Invite Meeting Modal */}
        <StudentDirectInviteMeetingModal
          isOpen={showCreateMeetingModal}
          onClose={() => setShowCreateMeetingModal(false)}
          selectedUsers={selectedStudents}
          onMeetingCreated={handleMeetingCreated}
        />
      </div>
    </div>
  );
}


