import React, { useEffect, useState } from 'react';
import VPE_Navbar from './VPE_Navbar';
import ProfileMenu from '../ProfileMenu';
import DirectInviteMeetingModal from '../Meeting/DirectInviteMeetingModal';
import MeetingList from '../Meeting/MeetingList';
import StreamMeetingRoom from '../Meeting/StreamMeetingRoom';
import { Video, Users, Calendar, Plus, Search, UserPlus, ChevronDown, ChevronRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

const VPE_Meeting = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [meetingRefreshTrigger, setMeetingRefreshTrigger] = useState(0);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [userInfo, setUserInfo] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [expandedRoles, setExpandedRoles] = useState({});

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  // Get user info from token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo({
          name: payload.firstName && payload.lastName ? `${payload.firstName} ${payload.lastName}` : payload.username || 'VPE',
          email: payload.email || ''
        });
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }, []);

  // Fetch all users for invitation
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE}/users/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const users = await response.json();
          // Filter out the current user and only include active users
          const currentUserId = JSON.parse(atob(token.split('.')[1]))._id;
          const filteredUsers = users.filter(user => 
            user._id !== currentUserId && 
            user.role !== 'admin' && 
            user.status !== 'inactive'
          );
          setAllUsers(filteredUsers);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  // Meeting handlers
  const handleMeetingCreated = (newMeeting) => {
    setMeetingRefreshTrigger(prev => prev + 1);
    if (newMeeting.meetingType === 'instant') {
      // Auto-join instant meetings
      setActiveMeeting(newMeeting);
    }
  };

  const handleJoinMeeting = async (meeting) => {
    try {
      console.log('[DEBUG] VPE handleJoinMeeting received:', meeting);
      console.log('[DEBUG] VPE meeting roomUrl:', meeting.roomUrl);
      
      const meetingData = {
        ...meeting,
        meetingId: String(meeting._id),
        title: meeting.title || 'Video Meeting',
      };
      console.log('[DEBUG] VPE setActiveMeeting with:', meetingData);
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

  // Filter users based on search term
  const filteredUsers = allUsers.filter(user => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const role = (user.role || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return fullName.includes(search) || 
           email.includes(search) || 
           role.includes(search);
  });

  // Group users by role
  const usersByRole = filteredUsers.reduce((acc, user) => {
    const role = user.role || 'unknown';
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {});

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const clearSelection = () => {
    setSelectedUsers([]);
    setSearchTerm('');
  };

  const toggleRoleExpansion = (role) => {
    setExpandedRoles(prev => ({
      ...prev,
      [role]: !prev[role]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen h-screen max-h-screen">
        <VPE_Navbar />
        <div className="flex-1 flex flex-col bg-gray-100 font-poppinsr overflow-hidden md:ml-64 h-full min-h-screen">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading meetings...</p>
            <p className="text-gray-500 text-sm mt-2">Setting up VPE meeting management</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <VPE_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Meeting Management</h2>
            <p className="text-base md:text-lg">
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Video className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Direct Meetings</p>
                <p className="text-xs text-blue-500">Create meetings with specific users</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Total Users</p>
                <p className="text-xs text-green-500">{allUsers.length} available for invitation</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">Selected Users</p>
                <p className="text-xs text-purple-500">{selectedUsers.length} users selected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Meeting List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Direct Invitation Meetings</h3>
          <MeetingList
            classId="direct-invite" // Special identifier for direct invitation meetings
            userRole="vpe"
            onJoinMeeting={handleJoinMeeting}
            refreshTrigger={meetingRefreshTrigger}
          />
        </div>

        {/* User Selection Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Meeting Participants</h3>
            <button
              onClick={() => setShowCreateMeetingModal(true)}
              disabled={selectedUsers.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Meeting ({selectedUsers.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Selected Participants ({selectedUsers.length})</h4>
                <button
                  onClick={clearSelection}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div
                    key={user._id}
                    className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{user.firstName} {user.lastName}</span>
                    <button
                      onClick={() => toggleUserSelection(user)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User List by Role with Collapsible Dropdowns */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading users...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(usersByRole).map(([role, users]) => {
                const isExpanded = expandedRoles[role];
                const selectedInRole = users.filter(user => selectedUsers.some(u => u._id === user._id)).length;
                
                return (
                  <div key={role} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleRoleExpansion(role)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        <h4 className="text-sm font-medium text-gray-700 capitalize">
                          {role}
                        </h4>
                        <span className="text-xs text-gray-500">
                          ({selectedInRole}/{users.length} selected)
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{users.length} users</span>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {users.map(user => {
                            const isSelected = selectedUsers.some(u => u._id === user._id);
                            return (
                              <button
                                key={user._id}
                                onClick={() => toggleUserSelection(user)}
                                className={`p-3 rounded-lg border-2 transition-all text-left ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                    isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-sm">
                                      {user.firstName} {user.lastName}
                                    </h5>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                    <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Meeting Modal */}
        <DirectInviteMeetingModal
          isOpen={showCreateMeetingModal}
          onClose={() => setShowCreateMeetingModal(false)}
          selectedUsers={selectedUsers}
          onMeetingCreated={handleMeetingCreated}
        />

         {/* Stream Meeting Room */}
         {activeMeeting && (
           <StreamMeetingRoom
             meetingData={activeMeeting}
             currentUser={userInfo}
             onLeave={handleLeaveMeeting}
             isOpen={!!activeMeeting}
             isHost={true}
             hostUserId={'Angry_Attic'}
             credentials={{
              apiKey: 'mmhfdzb5evj2',
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Byb250by5nZXRzdHJlYW0uaW8iLCJzdWIiOiJ1c2VyL0FuZ3J5X0F0dGljIiwidXNlcl9pZCI6IkFuZ3J5X0F0dGljIiwidmFsaWRpdHlfaW5fc2Vjb25kcyI6NjA0ODAwLCJpYXQiOjE3NjA2Njk3ODgsImV4cCI6MTc2MTI3NDU4OH0.nSR0BWGd5h_YQ-QGRsy0iUjRNv_XZmUjlUc_QSkkxrA',
            userId: 'Angry_Attic',
            callId: 'YqOzpnBajjZCAMlFXryOX',
             }}
           />
         )}
      </div>
    </div>
  );
};

export default VPE_Meeting;
