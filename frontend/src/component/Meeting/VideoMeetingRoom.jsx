import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FaSpinner, 
  FaVideo, 
  FaTimes, 
  FaRedo, 
  FaExclamationTriangle, 
  FaUserShield,
  FaUserFriends,
  FaExpand,
  FaCompress,
  FaCog
} from 'react-icons/fa';
import './VideoMeetingRoom.css';

const JITSI_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si';

const VideoMeetingRoom = ({ isOpen, onClose, meetingData, currentUser, isModerator = false, onLeave }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const jitsiContainer = useRef(null);
  const jitsiApi = useRef(null);
  const scriptLoadAttempts = useRef(0);
  const MAX_SCRIPT_LOAD_ATTEMPTS = 3;

  const getMeetingId = useCallback(() => {
    return meetingData?.meetingId || meetingData?._id || '';
  }, [meetingData]);

  // Prefer backend-provided roomUrl when available to ensure all clients join the same room
  const getRoomName = useCallback(() => {
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
    const id = getMeetingId();
    return id ? String(id) : '';
  }, [meetingData, getMeetingId]);

  const handleLeaveMeeting = useCallback(() => {
    if (onLeave) onLeave();
    if (onClose) onClose();
  }, [onLeave, onClose]);

  const loadJitsiScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        return resolve(true);
      }

      scriptLoadAttempts.current += 1;
      if (scriptLoadAttempts.current > MAX_SCRIPT_LOAD_ATTEMPTS) {
        return reject(new Error('Max script load attempts reached'));
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load Jitsi script'));
      // Add a random query parameter to bypass caching
      script.src += `?v=${Date.now()}`;
      document.head.appendChild(script);
    });
  }, []);

  const initializeJitsi = useCallback(async () => {
    if (!isOpen || !jitsiContainer.current) return;

    const meetingId = getMeetingId();
    if (!meetingId) {
      setError('Invalid meeting ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await loadJitsiScript();

      if (!jitsiContainer.current) {
        throw new Error('Jitsi container not found');
      }

      // Clear any existing Jitsi instance
      if (jitsiApi.current) {
        try {
          jitsiApi.current.dispose();
        } catch {
          void 0;
        }
        jitsiApi.current = null;
      }

      const roomName = getRoomName();
      const options = {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainer.current,
        userInfo: {
          displayName: currentUser?.name || 'Participant',
          email: currentUser?.email || ''
        },
        jwt: meetingData?.jwt || undefined,
        configOverwrite: {
          disableDeepLinking: true,
          disableInviteFunctions: true,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          enableClosePage: false,
          enableNoAudioDetection: true,
          enableNoisyMicDetection: true,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          // Harden connectivity
          p2p: { enabled: false },
          preferH264: true,
          disableThirdPartyRequests: true,
          enableLipSync: false,
          enableLayerSuspension: true,
          // UI
          toolbarButtons: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'info', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
            'mute-video-everyone', 'security'
          ]
        },
        interfaceConfigOverwrite: {
          APP_NAME: 'JuanLMS',
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          DISABLE_PRESENCE_STATUS: true,
          DISABLE_VIDEO_BACKGROUND: true,
          HIDE_INVITE_MORE_HEADER: true,
          MOBILE_APP_PROMO: false,
          SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
          SHOW_CHROME_EXTENSION_BANNER: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_POWERED_BY: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'info', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
            'mute-video-everyone', 'security'
          ],
          VERTICAL_FILMSTRIP: true,
          VIDEO_QUALITY_LABEL_DISABLED: false,
          DISABLE_VIDEO_QUALITY_LABEL: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          ENABLE_FEEDBACK_ANIMATION: false,
          DISABLE_TRANSCRIPTION_SUBTITLES: true,
          DISABLE_RINGING: !isModerator,
          ENABLE_DIAL_OUT: isModerator,
          ENABLE_RECORDING: isModerator,
          LOCAL_THUMBNAIL_RATIO: 1,
          REMOTE_THUMBNAIL_RATIO: 1,
          TOOLBAR_ALWAYS_VISIBLE: true
        }
      };

      const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, options);
      jitsiApi.current = api;

      // Connection timeout fallback: open in new tab if embed doesn't join
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          const url = `https://${JITSI_DOMAIN}/${encodeURIComponent(roomName)}`;
          window.open(url, '_blank');
        }
      }, 12000);

      api.addEventListeners({
        iframeReady: () => {
          setIsLoading(false);
        },
        readyToClose: () => {
          handleLeaveMeeting();
        },
        videoConferenceJoined: () => {
          clearTimeout(timeoutId);
          setIsLoading(false);
          if (isModerator) {
            api.executeCommand('displayName', `${currentUser?.name} (Host)`);
          }
        },
        videoConferenceLeft: () => {
          clearTimeout(timeoutId);
          handleLeaveMeeting();
        },
        error: (evt) => {
          clearTimeout(timeoutId);
          setError(evt?.message || 'Unknown meeting error');
          setIsLoading(false);
        }
      });
    } catch (e) {
      setError(e?.message || 'Failed to initialize meeting');
      setIsLoading(false);
      // Auto-retry after a delay if we haven't exceeded max attempts
      if (scriptLoadAttempts.current < MAX_SCRIPT_LOAD_ATTEMPTS) {
        setTimeout(() => {
          initializeJitsi();
        }, 2000);
      }
    }
  }, [isOpen, getMeetingId, currentUser, isModerator, handleLeaveMeeting, getRoomName, loadJitsiScript, isLoading, meetingData?.jwt]);

  const handleRetry = useCallback(() => {
    setError(null);
    scriptLoadAttempts.current = 0;
    initializeJitsi();
  }, [initializeJitsi]);

  // Initialize and cleanup
  useEffect(() => {
    if (isOpen) {
      // Prevent background scroll and interactions
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      initializeJitsi();
      return () => {
        document.body.style.overflow = previousOverflow;
        if (jitsiApi.current) {
          try {
            jitsiApi.current.dispose();
          } catch {
            void 0;
          }
          jitsiApi.current = null;
        }
      };
    }
    return () => {
      if (jitsiApi.current) {
        try {
          jitsiApi.current.dispose();
        } catch {
          void 0;
        }
        jitsiApi.current = null;
      }
    };
  }, [isOpen, initializeJitsi, meetingData]);

  if (!isOpen) return null;

  return (
    <div className="video-meeting-room">
      <header className="video-meeting-header">
        <h3>
          <FaVideo />
          <span>{meetingData?.title || 'JuanLMS Video Meeting'}</span>
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
        <div ref={jitsiContainer} className="jitsi-container" />
        
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <FaSpinner className="spinner" />
              <p>Connecting to meeting room...</p>
              <small>This may take a moment</small>
            </div>
          </div>
        )}
        
        {error && (
          <div className="error-overlay">
            <div className="error-content">
              <FaExclamationTriangle className="error-icon" />
              <h4>Connection Error</h4>
              <p>{typeof error === 'string' ? error : (error?.message || 'We couldn\'t connect to the meeting. Please check your internet connection and try again.')}</p>
              <div className="button-group">
                <button 
                  className="retry-button" 
                  onClick={handleRetry}
                  aria-label="Retry connection"
                >
                  <FaRedo /> Retry
                </button>
                <button 
                  className="leave-button" 
                  onClick={handleLeaveMeeting}
                  aria-label="Leave meeting"
                >
                  <FaTimes /> Leave
                </button>
              </div>
            </div>
          </div>
        )}
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
          <span className="connection-indicator"></span>
          <span>Connected</span>
        </div>
      </footer>
    </div>
  );
};

export default VideoMeetingRoom;
