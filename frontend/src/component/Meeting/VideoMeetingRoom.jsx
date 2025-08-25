import React, { useEffect } from 'react';
import { FaVideo, FaExternalLinkAlt, FaSpinner } from 'react-icons/fa';
import './VideoMeetingRoom.css';

const JITSI_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si';

const VideoMeetingRoom = ({ isOpen, meetingData, onLeave }) => {
  useEffect(() => {
    if (!isOpen || !meetingData) return;

    const getRoomName = () => {
      try {
        const roomUrl = meetingData?.roomUrl;
        if (roomUrl) {
          const url = new URL(roomUrl);
          const path = url.pathname || '';
          const name = path.startsWith('/') ? path.slice(1) : path;
          return decodeURIComponent(name);
        }
      } catch {
        // Fallback to meetingId if URL parsing fails
        void 0;
      }
      const id = meetingData?.meetingId || meetingData?._id || '';
      return id ? String(id) : '';
    };

    const roomName = getRoomName();
    if (!roomName) {
      console.error('No valid room name found for meeting:', meetingData);
      if (onLeave) onLeave();
      return;
    }

    // Construct the Jitsi URL
    const jitsiUrl = `https://${JITSI_DOMAIN}/${encodeURIComponent(roomName)}`;
    
    // Open Jitsi in a new tab
    const newWindow = window.open(jitsiUrl, '_blank');
    
    if (newWindow) {
      console.log('Opened Jitsi meeting in new tab:', jitsiUrl);
      
      // Close this component after a short delay to allow the new tab to open
      const timer = setTimeout(() => {
        if (onLeave) onLeave();
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      console.error('Failed to open Jitsi in new tab - popup blocked?');
      alert('Please allow popups for this site to join the meeting. The meeting URL is: ' + jitsiUrl);
      if (onLeave) onLeave();
    }
  }, [isOpen, meetingData, onLeave]);

  if (!isOpen) return null;

  return (
    <div className="video-meeting-room">
      <div className="redirect-overlay">
        <div className="redirect-content">
          <FaVideo className="video-icon" />
          <h3>Opening Meeting in New Tab</h3>
          <p>Your meeting is opening in a new tab...</p>
          <div className="spinner-container">
            <FaSpinner className="spinner" />
          </div>
          <p className="redirect-note">
            <FaExternalLinkAlt className="inline mr-2" />
            If the new tab doesn't open automatically, please check your popup blocker settings.
          </p>
          <button 
            className="close-button" 
            onClick={() => onLeave && onLeave()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoMeetingRoom;
