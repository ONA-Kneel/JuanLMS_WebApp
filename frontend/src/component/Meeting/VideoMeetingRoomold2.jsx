import React, { useCallback, useEffect, useRef, useState } from 'react';

const VideoMeetingRoom = ({ meetingData, onLeave, isOpen, isModerator = false, user = {} }) => {
  const jitsiContainer = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jitsiApi, setJitsiApi] = useState(null);

  // Get user info from localStorage
  const currentUser = (() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      return {
        name: userData.name || 'User',
        email: userData.email || ''
      };
    } catch (e) {
      console.error('Error parsing user data:', e);
      return { name: 'User', email: '' };
    }
  })();

  // Get meeting ID from either meetingId or _id property
  const getMeetingId = useCallback(() => {
    if (meetingData?.meetingId) return meetingData.meetingId;
    if (meetingData?._id) return meetingData._id;
    return null;
  }, [meetingData]);

  const loadJitsiScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        console.log('Jitsi Meet API already loaded');
        resolve();
        return;
      }

      console.log('Loading Jitsi Meet API script...');
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        console.log('Jitsi Meet API script loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('Error loading Jitsi Meet API script:', error);
        reject(new Error('Failed to load Jitsi Meet API'));
      };
      document.body.appendChild(script);
    });
  }, []);

  const initializeJitsi = useCallback(async () => {
    if (!isOpen) return;
    
    const meetingId = getMeetingId();
    if (!meetingId) {
      setError('Invalid meeting ID');
      setIsLoading(false);
      return;
    }

    try {
      await loadJitsiScript();
      
      if (!jitsiContainer.current) {
        throw new Error('Jitsi container not found');
      }

      console.log('Initializing Jitsi Meet with container:', jitsiContainer.current);
      
      const options = {
        roomName: `JuanLMS-${meetingId}`,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainer.current,
        userInfo: {
          displayName: currentUser.name,
          email: currentUser.email
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          disableModeratorIndicator: false,
          startAudioOnly: false,
          enableNoAudioDetection: true,
          enableNoisyMicDetection: true,
        },
        interfaceConfigOverwrite: {
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#f0f2f5',
          DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
          DEFAULT_LOCAL_DISPLAY_NAME: currentUser.name,
          SHOW_CHROME_EXTENSION_BANNER: false,
          GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
          ],
        },
        onload: () => {
          console.log('Jitsi Meet API loaded');
        }
      };

      const api = new window.JitsiMeetExternalAPI('meet.jit.si', options);
      setJitsiApi(api);
      
      api.addEventListeners({
        readyToClose: () => {
          console.log('Jitsi ready to close');
          if (onLeave) onLeave();
        },
        videoConferenceJoined: () => {
          console.log('Local user joined');
          setIsLoading(false);
          if (isModerator) {
            api.executeCommand('displayName', `${currentUser.name} (Host)`);
          }
        },
        videoConferenceLeft: () => {
          console.log('Local user left');
          if (onLeave) onLeave();
        },
        error: (error) => {
          console.error('Jitsi error:', error);
          setError('Error in meeting: ' + (error?.message || 'Unknown error'));
          setIsLoading(false);
        }
      });
      
      return () => {
        console.log('Cleaning up Jitsi instance');
        if (api) {
          try {
            api.dispose();
          } catch (e) {
            console.error('Error disposing Jitsi:', e);
          }
        }
      };
      
    } catch (error) {
      console.error('Failed to initialize Jitsi:', error);
      setError('Failed to initialize meeting. ' + (error.message || 'Please try again.'));
      setIsLoading(false);
    }
  }, [isOpen, getMeetingId, currentUser, isModerator, onLeave]);

  useEffect(() => {
    if (!isOpen) return;
    
    document.body.classList.add('meeting-active');
    console.log('Added meeting-active class to body');
    
    initializeJitsi();
    
    return () => {
      document.body.classList.remove('meeting-active');
      console.log('Removed meeting-active class from body');
      
      if (jitsiApi) {
        try {
          jitsiApi.dispose();
          setJitsiApi(null);
        } catch (e) {
          console.error('Error cleaning up Jitsi:', e);
        }
      }
    };
  }, [isOpen, initializeJitsi, jitsiApi]);
    
    // Check if Jitsi script is already loaded
    if (window.JitsiMeetExternalAPI) {
      console.log('Jitsi API already loaded, initializing...');
      initializeJitsi();
      return;
    }
    
    console.log('Loading Jitsi Meet API script...');
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => {
      console.log('Jitsi Meet API script loaded successfully');
      initializeJitsi();
    };
    script.onerror = (error) => {
      console.error('Failed to load Jitsi Meet API script:', error);
      setError('Failed to load meeting interface. Please check your internet connection and refresh the page.');
      setIsLoading(false);
    };
    
    console.log('Appending Jitsi script to document.body');
    document.body.appendChild(script);

    // Cleanup function
    return () => {
      document.body.classList.remove('meeting-active');
      if (window.JitsiMeetExternalAPI) {
        try {
          if (window.jitsiApi) {
            window.jitsiApi.dispose();
            window.jitsiApi = null;
          }
        } catch (e) {
          console.error('Error cleaning up Jitsi:', e);
        }
      }
    };
  }, [isOpen, getMeetingId, meetingData]);

  const initializeJitsi = () => {
    console.log('initializeJitsi called');
    
    if (!jitsiContainer.current) {
      const errorMsg = 'Jitsi container ref is not set';
      console.error(errorMsg);
      setError('Failed to initialize meeting. ' + errorMsg);
      setIsLoading(false);
      return;
    }
    
    console.log('Jitsi container found:', jitsiContainer.current);
    
    if (!window.JitsiMeetExternalAPI) {
      const errorMsg = 'JitsiMeetExternalAPI is not available';
      console.error(errorMsg);
      setError('Failed to load meeting interface. Please refresh the page.');
      setIsLoading(false);
      return;
    }
    
    const meetingId = getMeetingId();
    if (!meetingId) {
      const errorMsg = 'No valid meeting ID found';
      console.error(errorMsg);
      setError('Failed to start meeting: ' + errorMsg);
      setIsLoading(false);
      return;
    }

    try {
    
    const meetingId = meetingData?.meetingId || meetingData?._id;
    if (!meetingId) {
      console.error('No meeting ID provided');
      setError('Meeting ID is missing');
      return;
    }

    try {
      // Configure Jitsi Meet options
      const domain = 'meet.jit.si';
      const options = {
        roomName: meetingId,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainer.current,
        userInfo: {
          displayName: user?.name || currentUser.name || 'User',
          email: user?.email || currentUser.email || '',
        },
        configOverwrite: {
          startWithAudioMuted: !isModerator, // Mute non-moderators by default
          startWithVideoMuted: !isModerator, // Turn off video for non-moderators by default
          enableWelcomePage: false,
          enableClosePage: false,
          disableInviteFunctions: !isModerator,
          toolbarButtons: isModerator ? [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'info', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
            'security', 'select-background', 'shareaudio'
          ] : [
            'microphone', 'camera', 'hangup', 'chat', 'raisehand', 'tileview'
          ]
        },
        interfaceConfigOverwrite: {
          APP_NAME: 'JuanLMS',
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
          DEFAULT_LOCAL_DISPLAY_NAME: 'Me',
          TOOLBAR_BUTTONS: isModerator ? [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'info', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
            'security', 'select-background', 'shareaudio'
          ] : [
            'microphone', 'camera', 'hangup', 'chat', 'raisehand', 'tileview'
          ]
        },
      };

      // Initialize Jitsi Meet API
      const api = new window.JitsiMeetExternalAPI(domain, options);
      apiRef.current = api;
      setJitsi(api);

      // Handle API events
      api.addEventListeners({
        readyToClose: () => {
          console.log('Jitsi is ready to close');
          if (onLeave) onLeave();
        },
        participantRoleChanged: (event) => {
          console.log('Participant role changed:', event);
        },
        videoConferenceJoined: (event) => {
          console.log('Local user joined', event);
          if (isModerator) {
            api.executeCommand('displayName', `${user?.name} (Moderator)`);
            // Lock the room if you want only moderators to let people in
            // api.executeCommand('toggleLobby', true);
          }
        },
        errorOccurred: (error) => {
          console.error('Jitsi error:', error);
          setError('An error occurred in the meeting. Please try again.');
        },
      });

      // Cleanup function
      return () => {
        if (api) {
          try {
            api.dispose();
          } catch (e) {
            console.error('Error disposing Jitsi:', e);
          }
        }
      };
    } catch (err) {
      console.error('Failed to initialize Jitsi:', err);
      setError('Failed to initialize the meeting. Please try again.');
    }
    } catch (err) {
      console.error('Error initializing Jitsi:', err);
      setError('Failed to initialize the meeting. Please try again.');
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (isOpen && window.JitsiMeetExternalAPI) {
      initializeJitsi();
    }
  }, [isOpen, meetingData, isModerator, user]);

  // Show loading state
  // Hide other UI elements when meeting is active
  useEffect(() => {
    // Add class to hide UI elements
    document.body.classList.add('meeting-active');
    document.documentElement.style.overflow = 'hidden';
    
    // Cleanup function
    return () => {
      document.body.classList.remove('meeting-active');
      document.documentElement.style.overflow = '';
    };
  }, []);

  console.log('Rendering VideoMeetingRoom with state:', {
    isLoading,
    error,
        }
      };
    }
  }, [jitsiApi]);

  return (
    <div className="video-meeting-room fixed inset-0 z-50 flex flex-col bg-white">
      {/* Hidden container for Jitsi */}
      <div 
        ref={jitsiContainer} 
        className="absolute inset-0 w-full h-full"
        style={{ display: isLoading || error ? 'none' : 'block' }}
      />
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Preparing your meeting</h3>
            <p className="text-gray-600">This may take a moment...</p>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
          <div className="text-center max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load meeting</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  initializeJitsi();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={onLeave}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Status bar */}
      <div className="bg-white border-t border-gray-200 p-2 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {isModerator ? (
            <span className="inline-flex items-center text-green-600 font-medium">
              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              You are the host
            </span>
          ) : (
            <span>You are a participant</span>
          )}
        </div>
        <button
          margin: 0 !important;
          max-width: 100% !important;
        }
      `}</style>
              <button 
          onClick={() => {
            if (jitsi) {
              jitsi.executeCommand('hangup');
            }
            if (onLeave) onLeave();
          }}
          className="text-red-600 hover:text-red-800 font-medium"
        >
          Leave Meeting
        </button>
      
    </div>
  );

};

export default VideoMeetingRoom;
