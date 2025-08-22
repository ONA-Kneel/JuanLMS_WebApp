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
    console.log('[DEBUG] getRoomName - meetingData:', meetingData);
    console.log('[DEBUG] getRoomName - roomUrl:', meetingData?.roomUrl);
    
    const roomUrl = meetingData?.roomUrl;
    if (roomUrl) {
      try {
        const url = new URL(roomUrl);
        const path = url.pathname || '';
        const name = path.startsWith('/') ? path.slice(1) : path;
        const result = decodeURIComponent(name);
        console.log('[DEBUG] getRoomName - extracted from URL:', result);
        return result;
      } catch (error) {
        console.error('[DEBUG] getRoomName - URL parsing failed:', error);
        // Fallback to meetingId if URL parsing fails
      }
    }
    
    const id = getMeetingId();
    const fallbackResult = id ? String(id) : '';
    console.log('[DEBUG] getRoomName - fallback to meetingId:', fallbackResult);
    return fallbackResult;
  }, [meetingData, getMeetingId]);

  const handleLeaveMeeting = useCallback(() => {
    if (onLeave) onLeave();
    if (onClose) onClose();
  }, [onLeave, onClose]);

  const loadJitsiScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        console.log('Jitsi script already loaded');
        return resolve(true);
      }

      scriptLoadAttempts.current += 1;
      
      if (scriptLoadAttempts.current > MAX_SCRIPT_LOAD_ATTEMPTS) {
        return reject(new Error('Max script load attempts reached'));
      }

      console.log(`Loading Jitsi script (attempt ${scriptLoadAttempts.current})`);
      
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        console.log('Jitsi script loaded successfully');
        resolve(true);
      };
      script.onerror = (error) => {
        console.error('Error loading Jitsi script:', error);
        reject(new Error('Failed to load Jitsi script'));
      };
      
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
        } catch (e) {
          console.warn('Error disposing previous Jitsi instance:', e);
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

      console.log('Initializing Jitsi with options:', options);
      
      const api = new window.JitsiMeetExternalAPI('meet.jit.si', options);
      jitsiApi.current = api;

      // Connection timeout fallback: open in new tab if embed doesn't join
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.warn('Jitsi embed connection slow; opening room in new tab');
          const url = `https://meet.jit.si/${encodeURIComponent(roomName)}`;
          window.open(url, '_blank');
        }
      }, 12000);
      
      api.addEventListeners({
        iframeReady: () => {
          setIsLoading(false);
        },
        readyToClose: () => {
          console.log('Jitsi ready to close');
          handleLeaveMeeting();
        },
        videoConferenceJoined: () => {
          console.log('User joined the conference');
          clearTimeout(timeoutId);
          setIsLoading(false);
          if (isModerator) {
            api.executeCommand('displayName', `${currentUser?.name} (Host)`);
          }
        },
        videoConferenceLeft: () => {
          console.log('User left the conference');
          clearTimeout(timeoutId);
          handleLeaveMeeting();
        },
        error: (error) => {
          console.error('Jitsi error:', error);
          clearTimeout(timeoutId);
          setError('Error in meeting: ' + (error?.message || 'Unknown error'));
          setIsLoading(false);
        },
        participantRoleChanged: (event) => {
          console.log('Participant role changed:', event);
        },
        endpointTextMessageReceived: (event) => {
          console.log('Message received:', event);
        },
        deviceListChanged: (event) => {
          console.log('Device list changed:', event);
        },
        devicesChanged: (event) => {
          console.log('Devices changed:', event);
        },
        deviceListAvailable: (event) => {
          console.log('Device list available:', event);
        }
      });
      
      console.log('Jitsi API initialized successfully');
      
    } catch (error) {
      console.error('Error initializing Jitsi:', error);
      setError('Failed to initialize meeting. ' + (error.message || 'Please try again.'));
      setIsLoading(false);
      
      // Auto-retry after a delay if we haven't exceeded max attempts
      if (scriptLoadAttempts.current < MAX_SCRIPT_LOAD_ATTEMPTS) {
        console.log(`Retrying Jitsi initialization (attempt ${scriptLoadAttempts.current + 1}/${MAX_SCRIPT_LOAD_ATTEMPTS})`);
        setTimeout(() => {
          initializeJitsi();
        }, 2000); // 2 second delay before retry
      }
    }
  }, [isOpen, getMeetingId, currentUser, isModerator, handleLeaveMeeting, getRoomName]);

  const handleRetry = useCallback(() => {
    setError(null);
    scriptLoadAttempts.current = 0;
    initializeJitsi();
  }, [initializeJitsi]);

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
              <p>{error.message || 'We couldn\'t connect to the meeting. Please check your internet connection and try again.'}</p>
              <div className="button-group">
                <button 
                  className="retry-button" 
                  onClick={initializeJitsi}
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
