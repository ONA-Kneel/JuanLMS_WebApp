import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, Users, Play, Trash2, Edit, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

const MeetingList = ({ classId, userRole, onJoinMeeting, refreshTrigger }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/meetings/class/${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        setMeetings(result);
        setError('');
      } else {
        setError(result.message || 'Failed to fetch meetings');
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchMeetings();
    }
  }, [classId, refreshTrigger]);

  const handleJoinMeeting = async (meeting) => {
    // Meeting functionality removed - show placeholder message
    if (onJoinMeeting) {
      onJoinMeeting(meeting);
    } else {
      alert('Meeting functionality has been disabled. Please contact your instructor for video conferencing options.');
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchMeetings(); // Refresh the list
      } else {
        const result = await response.json();
        alert(result.message || 'Failed to delete meeting');
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Network error. Please try again.');
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'No scheduled time';
    
    const date = new Date(dateString);
    const now = new Date();
    
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    let dateLabel = '';
    if (isToday) {
      dateLabel = 'Today';
    } else if (isTomorrow) {
      dateLabel = 'Tomorrow';
    } else {
      dateLabel = date.toLocaleDateString();
    }
    
    const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `${dateLabel} at ${timeLabel}`;
  };

  const getMeetingStatus = (meeting) => {
    if (meeting.status === 'ended') {
      return { label: 'Ended', color: 'bg-gray-100 text-gray-600' };
    }
    
    if (meeting.meetingType === 'instant') {
      if (meeting.isActive) {
        return { label: 'Live', color: 'bg-red-100 text-red-600' };
      } else {
        return { label: 'Not Started', color: 'bg-yellow-100 text-yellow-600' };
      }
    }
    
    if (meeting.isCurrentlyActive) {
      return { label: 'Live', color: 'bg-red-100 text-red-600' };
    }
    
    const now = new Date();
    const scheduledTime = new Date(meeting.scheduledTime);
    
    if (scheduledTime > now) {
      return { label: 'Scheduled', color: 'bg-blue-100 text-blue-600' };
    } else {
      return { label: 'Ended', color: 'bg-gray-100 text-gray-600' };
    }
  };

  const groupMeetingsByDate = (meetings) => {
    const groups = {};
    const now = new Date();
    
    meetings.forEach(meeting => {
      let groupKey;
      
      if (meeting.meetingType === 'instant') {
        groupKey = 'instant';
      } else if (meeting.scheduledTime) {
        const meetingDate = new Date(meeting.scheduledTime);
        const isToday = meetingDate.toDateString() === now.toDateString();
        const isTomorrow = meetingDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
        
        if (isToday) {
          groupKey = 'today';
        } else if (isTomorrow) {
          groupKey = 'tomorrow';
        } else {
          groupKey = meetingDate.toDateString();
        }
      } else {
        groupKey = 'no-date';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(meeting);
    });
    
    // Sort meetings within each group
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (a.scheduledTime && b.scheduledTime) {
          return new Date(a.scheduledTime) - new Date(b.scheduledTime);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    });
    
    return groups;
  };

  const getGroupTitle = (groupKey) => {
    switch (groupKey) {
      case 'instant':
        return 'Instant Meetings';
      case 'today':
        return 'Today';
      case 'tomorrow':
        return 'Tomorrow';
      case 'no-date':
        return 'No Scheduled Time';
      default:
        return new Date(groupKey).toLocaleDateString([], { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading meetings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Video className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No meetings scheduled for this class</p>
        {userRole === 'faculty' && (
          <p className="text-sm mt-1">Create your first meeting to get started</p>
        )}
      </div>
    );
  }

  const groupedMeetings = groupMeetingsByDate(meetings);

  return (
    <div className="space-y-6">
      {Object.entries(groupedMeetings).map(([groupKey, groupMeetings]) => (
        <div key={groupKey}>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {getGroupTitle(groupKey)}
          </h3>
          <div className="space-y-3">
            {groupMeetings.map((meeting) => {
              const status = getMeetingStatus(meeting);
              
              return (
                <div
                  key={meeting._id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{meeting.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      
                      {meeting.description && (
                        <p className="text-gray-600 text-sm mb-2">{meeting.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDateTime(meeting.scheduledTime)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {meeting.duration} min
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {meeting.participantCount || 0} participants
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleJoinMeeting(meeting)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Play className="w-4 h-4" />
                        Join
                      </button>
                      
                      {userRole === 'faculty' && (
                        <button
                          onClick={() => handleDeleteMeeting(meeting._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete meeting"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MeetingList;
