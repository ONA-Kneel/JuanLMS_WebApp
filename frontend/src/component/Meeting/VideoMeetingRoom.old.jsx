import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Users } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

const VideoMeetingRoom = ({ meetingData: originalMeetingData, userInfo, onClose, onMeetingEnd }) => {
  // Create a new object with meetingId if missing
  const meetingData = React.useMemo(() => {
    if (!originalMeetingData) return null;
    const data = {
      ...originalMeetingData,
      meetingId: originalMeetingData.meetingId || String(originalMeetingData._id || '')
    };
    console.log('[DEBUG] VideoMeetingRoom processed meetingData:', data);
    return data;
  }, [originalMeetingData]);

  console.log('[DEBUG] VideoMeetingRoom received originalMeetingData:', originalMeetingData);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        // Check if Jitsi Meet External API is already loaded
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        // Load Jitsi Meet External API script
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initializeJitsi = async () => {
      try {
        await loadJitsiScript();
        
        if (!meetingData || !meetingData?.meetingId) {
          console.error('[DEBUG] Invalid meetingData in VideoMeetingRoom:', meetingData);
          console.log('[DEBUG] meetingData.meetingId type:', typeof meetingData?.meetingId, meetingData?.meetingId);
          setError('Invalid meetingData data');
          setIsLoading(false);
          return;
        }

        // Configure Jitsi Meet options with enhanced settings
        const options = {
          roomName: meetingData?.meetingId,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          configOverwrite: {
            // Connection settings
            hosts: {
              domain: 'meet.jit.si',
              muc: 'conference.meet.jit.si',
              focus: 'focus.meet.jit.si'
            },
            // Interface settings
    }

    // Open Jitsi Meet in a new tab
    const meetingUrl = `https://meet.jit.si/${encodeURIComponent(meetingId)}`;
    const newWindow = window.open(meetingUrl, '_blank');
    
    // Notify parent component that we've redirected
    if (onLeave) {
      onLeave();
    }
    
    // Close this component's window after a short delay
    const timer = setTimeout(() => {
      if (newWindow && !newWindow.closed) {
        window.close();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isOpen, meetingData, onLeave]);

  // Display a simple loading/redirect message
  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
        <div className="text-green-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Opening Meeting...</h2>
        <p className="text-gray-600 mb-6">
          Your meeting is opening in a new tab. If it doesn't open automatically, 
          please check your browser's pop-up blocker.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => {
              const meetingId = meetingData?.meetingId || meetingData?._id || '';
              window.open(`https://meet.jit.si/${encodeURIComponent(meetingId)}`, '_blank');
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Open Meeting Again
          </button>
          
          <button
            onClick={onLeave}
            className="text-blue-500 hover:text-blue-600 font-medium text-sm"
          >
            ← Return to Dashboard
          </button>
        </div>
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${
            isVideoMuted
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
          title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        <button
          onClick={hangUp}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
          title="Leave meeting"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default VideoMeetingRoom;
