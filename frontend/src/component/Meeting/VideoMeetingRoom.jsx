import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Users } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

        // Configure Jitsi Meet options
        const options = {
          roomName: meetingData?.meetingId,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            enableUserRolesBasedOnToken: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
              'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
              'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
              'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
            ],
            SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
            APP_NAME: 'JuanLMS Meeting',
            NATIVE_APP_NAME: 'JuanLMS Meeting',
            DEFAULT_BACKGROUND: '#1f2937',
            DISABLE_VIDEO_BACKGROUND: false,
            INITIAL_TOOLBAR_TIMEOUT: 20000,
            TOOLBAR_TIMEOUT: 4000,
            TOOLBAR_ALWAYS_VISIBLE: false,
          },
          userInfo: {
            displayName: (userInfo && userInfo.name) || 'Anonymous User',
            email: (userInfo && userInfo.email) || ''
          }
        };

        // Initialize Jitsi Meet API
        const api = new window.JitsiMeetExternalAPI('meet.jit.si', options);
        jitsiApiRef.current = api;

        // Event listeners
        api.addEventListener('videoConferenceJoined', (event) => {
          console.log('User joined the meeting:', event);
          setIsLoading(false);
          setError('');
        });

        api.addEventListener('videoConferenceLeft', (event) => {
          console.log('User left the meeting:', event);
          handleLeaveMeeting();
        });

        api.addEventListener('participantJoined', (event) => {
          console.log('Participant joined:', event);
          setParticipantCount(prev => prev + 1);
        });

        api.addEventListener('participantLeft', (event) => {
          console.log('Participant left:', event);
          setParticipantCount(prev => Math.max(0, prev - 1));
        });

        api.addEventListener('audioMuteStatusChanged', (event) => {
          setIsAudioMuted(event.muted);
        });

        api.addEventListener('videoMuteStatusChanged', (event) => {
          setIsVideoMuted(event.muted);
        });

        api.addEventListener('readyToClose', () => {
          handleLeaveMeeting();
        });

        api.addEventListener('participantRoleChanged', (event) => {
          console.log('Participant role changed:', event);
        });

        // Handle errors
        api.addEventListener('errorOccurred', (event) => {
          console.error('Jitsi error:', event);
          setError('An error occurred during the meeting');
        });

      } catch (error) {
        console.error('Error initializing Jitsi:', error);
        setError('Failed to load video meeting. Please try again.');
        setIsLoading(false);
      }
    };

    initializeJitsi();

    // Cleanup function
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [meetingData, userInfo]);

  const handleLeaveMeeting = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Notify backend that user is leaving
      await fetch(`${API_BASE}/api/meetings/${meetingData?._id}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Dispose Jitsi API
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }

      // Call parent callback
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error leaving meeting:', error);
      // Still close the meetingData room even if API call fails
      if (onClose) {
        onClose();
      }
    }
  };

  const toggleAudio = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
  };

  const hangUp = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('hangup');
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <X className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Meeting Error
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{meetingData?.title}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Users className="w-4 h-4" />
            <span>{participantCount} participants</span>
          </div>
        </div>
        
        <button
          onClick={handleLeaveMeeting}
          className="text-gray-300 hover:text-white transition-colors"
          title="Leave meeting"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg">Joining meeting...</p>
            <p className="text-sm text-gray-300 mt-2">Please wait while we connect you</p>
          </div>
        </div>
      )}

      {/* Jitsi Meet Container */}
      <div className="flex-1 relative">
        <div
          ref={jitsiContainerRef}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
      </div>

      {/* Custom Controls (Optional - Jitsi has its own toolbar) */}
      <div className="bg-gray-800 p-4 flex items-center justify-center gap-4">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            isAudioMuted
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
          title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

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
