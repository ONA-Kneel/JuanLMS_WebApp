import React from 'react';
import { 
  FaVideo, 
  FaTimes, 
  FaExclamationTriangle,
  FaUserShield,
  FaUserFriends
} from 'react-icons/fa';

const VideoMeetingRoom = ({ isOpen, onClose, meetingData, currentUser, isModerator = false, onLeave }) => {
  const handleLeaveMeeting = () => {
    if (onLeave) onLeave();
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="video-meeting-room">
      <header className="video-meeting-header">
        <h3>
          <FaVideo />
          <span>{meetingData?.title || 'JuanLMS Meeting'}</span>
        </h3>
        <button 
          className="close-button" 
          onClick={handleLeaveMeeting}
          aria-label="Leave meeting"
        >
          <FaTimes />
        </button>
      </header>
      
      <main className="meeting-content">
        <div className="meeting-placeholder">
          <div className="placeholder-content">
            <FaVideo className="placeholder-icon" />
            <h4>Video Meeting Feature</h4>
            <p>Video conferencing functionality has been temporarily disabled.</p>
            <p>Please use alternative video conferencing solutions for your meetings.</p>
            
            <div className="meeting-info">
              <h5>Meeting Details:</h5>
              <ul>
                <li><strong>Title:</strong> {meetingData?.title || 'Untitled Meeting'}</li>
                <li><strong>Description:</strong> {meetingData?.description || 'No description'}</li>
                <li><strong>Type:</strong> {meetingData?.meetingType || 'Standard'}</li>
                {meetingData?.scheduledTime && (
                  <li><strong>Scheduled:</strong> {new Date(meetingData.scheduledTime).toLocaleString()}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="status-bar">
        <div className="status-info">
          {isModerator ? (
            <span className="moderator-status">
              <FaUserShield className="status-icon" />
              <span>Moderator</span>
            </span>
          ) : (
            <span className="participant-status">
              <FaUserFriends className="status-icon" />
              <span>Participant</span>
            </span>
          )}
        </div>
        <div className="connection-status">
          <span className="connection-indicator offline"></span>
          <span>Offline</span>
        </div>
      </footer>
    </div>
  );
};

export default VideoMeetingRoom;