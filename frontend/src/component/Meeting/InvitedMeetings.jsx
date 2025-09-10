import React, { useEffect, useState } from 'react';
import { Video, Users, Calendar, Clock, User } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

const InvitedMeetings = ({ onJoinMeeting, refreshTrigger = 0 }) => {
  const [invitedMeetings, setInvitedMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvitedMeetings();
  }, [refreshTrigger]);

  const fetchInvitedMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/meetings/invited`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const meetings = await response.json();
        setInvitedMeetings(meetings);
      } else {
        setError('Failed to fetch invited meetings');
      }
    } catch (error) {
      console.error('Error fetching invited meetings:', error);
      setError('Error loading invited meetings');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMeetingStatus = (meeting) => {
    if (!meeting.scheduledTime) return 'instant';
    const now = new Date();
    const scheduled = new Date(meeting.scheduledTime);
    const endTime = new Date(scheduled.getTime() + (meeting.duration || 60) * 60000);
    
    if (now < scheduled) return 'upcoming';
    if (now >= scheduled && now <= endTime) return 'live';
    return 'ended';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live': return 'text-green-600 bg-green-100';
      case 'upcoming': return 'text-blue-600 bg-blue-100';
      case 'instant': return 'text-purple-600 bg-purple-100';
      case 'ended': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'live': return <Video className="w-4 h-4" />;
      case 'upcoming': return <Clock className="w-4 h-4" />;
      case 'instant': return <Video className="w-4 h-4" />;
      case 'ended': return <Calendar className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Direct Invitations</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600">Loading invited meetings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Direct Invitations</h3>
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchInvitedMeetings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Direct Invitations</h3>
        <span className="text-sm text-gray-500">{invitedMeetings.length} meeting(s)</span>
      </div>

      {invitedMeetings.length === 0 ? (
        <div className="text-center py-8">
          <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No direct invitations</p>
          <p className="text-sm text-gray-500">
            You haven't been invited to any meetings by VPE or Principal yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitedMeetings.map((meeting) => {
            const status = getMeetingStatus(meeting);
            const canJoin = status === 'live' || status === 'instant' || status === 'upcoming';
            
            return (
              <div
                key={meeting._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                    
                    {meeting.description && (
                      <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>Created by: {meeting.createdBy?.firstName} {meeting.createdBy?.lastName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(meeting.scheduledTime)}</span>
                      </div>
                      {meeting.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{meeting.duration} minutes</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {canJoin ? (
                      <button
                        onClick={() => onJoinMeeting(meeting)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        {status === 'live' ? 'Join Now' : status === 'upcoming' ? 'Join When Ready' : 'Join Meeting'}
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-center">
                        Meeting Ended
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvitedMeetings;

