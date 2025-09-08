import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
  SpeakerLayout,
  CallParticipantsList,
  CallStatsButton,
  RecordCallButton,
} from '@stream-io/video-react-sdk';
import { PhoneOff, MonitorUp, Mic, MicOff, Video as VideoIcon, VideoOff, BarChart3, Circle, CircleStop } from 'lucide-react';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import './StreamMeetingRoom.css';

// Stream meeting room wrapper
// Props:
// - isOpen: boolean to mount/unmount the meeting
// - onClose: optional callback when closing
// - onLeave: callback when the user leaves
// - meetingData: object possibly containing meetingId/_id/title/roomUrl
// - currentUser: { name, email } used for display name metadata
// - credentials: { apiKey, token, userId, callId? } required to connect to Stream
const StreamMeetingRoom = ({
  isOpen,
  onClose,
  onLeave,
  meetingData,
  currentUser,
  credentials,
  isHost = false,
  hostUserId,
}) => {
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const statsButtonRef = React.useRef(null);
  const recordButtonRef = React.useRef(null);
  const [hostPresent, setHostPresent] = useState(true);

  const apiKey = credentials?.apiKey;
  const userToken = credentials?.token;
  const userId = credentials?.userId;

  // Determine callId preference: explicit credentials.callId, then meetingData.meetingId/_id, then parsed from roomUrl
  const resolvedCallId = useMemo(() => {
    if (credentials?.callId) return String(credentials.callId);
    if (meetingData?.meetingId) return String(meetingData.meetingId);
    if (meetingData?._id) return String(meetingData._id);
    try {
      if (meetingData?.roomUrl) {
        const url = new URL(meetingData.roomUrl);
        const path = url.pathname || '';
        const name = path.startsWith('/') ? path.slice(1) : path;
        if (name) return decodeURIComponent(name);
      }
    } catch (e) {
      console.debug('StreamMeetingRoom: failed to parse roomUrl', e);
    }
    return '';
  }, [credentials?.callId, meetingData]);

  const userInfo = useMemo(() => {
    let displayName = currentUser?.name;
    // Fallback: try to read from app JWT stored in localStorage
    if (!displayName) {
      try {
        const appToken = localStorage.getItem('token');
        if (appToken) {
          const payload = JSON.parse(atob(appToken.split('.')[1] || '')) || {};
          const full = payload.firstName && payload.lastName ? `${payload.firstName} ${payload.lastName}` : '';
          displayName = full || payload.username || payload.name || displayName;
        }
      } catch (e) {
        console.debug('StreamMeetingRoom: failed to decode app token', e);
      }
    }
    if (!displayName) displayName = userId || 'User';
    return {
      id: String(userId || 'anonymous_user'),
      name: String(displayName),
    };
  }, [currentUser?.name, userId]);

  const handleLeave = useCallback(async () => {
    try {
      if (call) {
        await call.leave();
      }
    } catch (e) {
      console.debug('StreamMeetingRoom: error on leave call', e);
    }
    try {
      if (client) {
        await client.disconnectUser();
      }
    } catch (e) {
      console.debug('StreamMeetingRoom: error on disconnect user', e);
    }
    if (onLeave) onLeave();
    if (onClose) onClose();
  }, [call, client, onLeave, onClose]);

  const handleEndForAll = useCallback(async () => {
    try {
      if (call) {
        if (typeof call.end === 'function') {
          await call.end();
        } else if (typeof call.endCall === 'function') {
          await call.endCall();
        } else if (call.state && typeof call.state.setEnded === 'function') {
          await call.state.setEnded();
        }
      }
    } catch (e) {
      console.debug('StreamMeetingRoom: end for all error', e);
    } finally {
      setShowConfirmLeave(false);
      await handleLeave();
    }
  }, [call, handleLeave]);

  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (!call) return;
      // Try common API shapes across SDK versions
      if (typeof call.toggleScreenShare === 'function') {
        await call.toggleScreenShare();
      } else if (call.camera && typeof call.camera.toggleScreenShare === 'function') {
        await call.camera.toggleScreenShare();
      } else if (call.screenShare && typeof call.screenShare.toggle === 'function') {
        await call.screenShare.toggle();
      } else if (call.camera && typeof call.camera.startScreenShare === 'function' && typeof call.camera.stopScreenShare === 'function') {
        if (isScreenSharing) {
          await call.camera.stopScreenShare();
        } else {
          await call.camera.startScreenShare();
        }
      }
      setIsScreenSharing((v) => !v);
    } catch (e) {
      console.debug('StreamMeetingRoom: toggle screenshare error', e);
    }
  }, [call, isScreenSharing]);

  const handleToggleMic = useCallback(async () => {
    try {
      if (!call) return;
      // Try common API shapes across SDK versions
      if (call.microphone && typeof call.microphone.toggle === 'function') {
        await call.microphone.toggle();
      } else if (typeof call.toggleAudio === 'function') {
        await call.toggleAudio();
      } else if (call.microphone && typeof call.microphone.setEnabled === 'function') {
        await call.microphone.setEnabled(!isMicOn);
      }
      setIsMicOn((v) => !v);
    } catch (e) {
      console.debug('StreamMeetingRoom: toggle mic error', e);
    }
  }, [call, isMicOn]);

  const handleToggleCamera = useCallback(async () => {
    try {
      if (!call) return;
      if (call.camera && typeof call.camera.toggle === 'function') {
        await call.camera.toggle();
      } else if (typeof call.toggleVideo === 'function') {
        await call.toggleVideo();
      } else if (call.camera && typeof call.camera.setEnabled === 'function') {
        await call.camera.setEnabled(!isCameraOn);
      }
      setIsCameraOn((v) => !v);
    } catch (e) {
      console.debug('StreamMeetingRoom: toggle camera error', e);
    }
  }, [call, isCameraOn]);

  useEffect(() => {
    let isCancelled = false;

    const join = async () => {
      if (!isOpen) return;
      if (!apiKey || !userToken || !userId) {
        setError('Missing Stream credentials');
        return;
      }
      if (!resolvedCallId) {
        setError('Missing callId');
        return;
      }
      setIsJoining(true);
      setError('');
      try {
        const c = new StreamVideoClient({ apiKey });
        await c.connectUser(userInfo, userToken);
        if (isCancelled) return;

        const callInstance = c.call('default', resolvedCallId);
        // Try to join; create if it does not exist
        await callInstance.join({ create: true });
        if (isCancelled) {
          await callInstance.leave().catch((e) => console.debug('leave cancelled error', e));
          await c.disconnectUser().catch((e) => console.debug('disconnect cancelled error', e));
          return;
        }
        setClient(c);
        setCall(callInstance);
      } catch (e) {
        setError(e?.message || 'Failed to join the call');
      } finally {
        if (!isCancelled) setIsJoining(false);
      }
    };

    join();

    return () => {
      isCancelled = true;
      // Cleanup on unmount
      (async () => {
        try { if (call) await call.leave(); } catch (e) { console.debug('cleanup leave error', e); }
        try { if (client) await client.disconnectUser(); } catch (e) { console.debug('cleanup disconnect error', e); }
      })();
    };
  }, [apiKey, userToken, userId, resolvedCallId, userInfo, isOpen]);

  // Watch for host presence for students; show overlay until host joins
  useEffect(() => {
    if (!call || isHost !== false || !hostUserId) return;
    const updatePresence = () => {
      try {
        const participants = Array.from(call.state?.participants || []);
        const list = participants.map((p) => p.userId || p?.user?.id).filter(Boolean);
        const present = list.some((id) => String(id) === String(hostUserId));
        setHostPresent(present);
      } catch (err) {
        void err;
      }
    };
    updatePresence();
    const interval = setInterval(updatePresence, 1500);
    return () => clearInterval(interval);
  }, [call, hostUserId, isHost]);

  // If call ends (host clicked end for everyone), auto leave/redirect
  useEffect(() => {
    if (!call) return;
    let endedInterval;
    try {
      if (typeof call.on === 'function') {
        call.on('call.ended', handleLeave);
        call.on('ended', handleLeave);
      }
    } catch (err) { void err; }
    endedInterval = setInterval(() => {
      try {
        const ended = !!(call.state?.call?.ended || call.state?.ended || call.state?.status === 'ended');
        if (ended) {
          clearInterval(endedInterval);
          handleLeave();
        }
      } catch (err) { void err; }
    }, 1500);
    return () => {
      clearInterval(endedInterval);
      try { if (typeof call.off === 'function') { call.off('call.ended', handleLeave); call.off('ended', handleLeave); } } catch (err) { void err; }
    };
  }, [call, handleLeave]);

  if (!isOpen) return null;

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-lg font-semibold mb-2">Unable to start meeting</h2>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={handleLeave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (isJoining || !client || !call) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-700">Joining meeting...</p>
        </div>
      </div>
    );
  }

  const meetingTitle = meetingData?.title || `Call ${resolvedCallId}`;

  return (
    <div className="stream-meeting-overlay">
      <div className="stream-meeting-header">
        <div className="font-semibold truncate">{meetingTitle}</div>
        {/* Removed top-right leave button by request */}
      </div>
      <div className="stream-meeting-body">
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <div className="stream-meeting-grid">
              <div className="stream-meeting-stage">
                <div className="stage-primary">
                  {!hostPresent ? (
                    <div className="waiting-host">
                      <div className="waiting-card">
                        <div className="waiting-title">Host is not yet present</div>
                        <div className="waiting-sub">Please wait for the host to join this meeting.</div>
                      </div>
                    </div>
                  ) : (
                    <SpeakerLayout />
                  )}
                </div>
                <div className="stream-meeting-sidepanel">
                  <CallParticipantsList />
                </div>
              </div>
              <div className="stream-controls-wrap">
                <div className="stream-controls flex items-center gap-2">
                  <button onClick={handleToggleMic} className="px-3 py-2 rounded flex items-center gap-1" title="Mic">
                    {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                  <button onClick={handleToggleCamera} className="px-3 py-2 rounded flex items-center gap-1" title="Video">
                    {isCameraOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
                  </button>
                  <button onClick={handleToggleScreenShare} className="px-3 py-2 rounded flex items-center gap-1" title="Screen Share">
                    <MonitorUp size={18} />
                  </button>
                  {/* Hidden functional buttons; trigger via custom icons to ensure consistent visuals */}
                  <div style={{ display: 'none' }}>
                    <CallStatsButton ref={statsButtonRef} title="Stats" />
                    <RecordCallButton ref={recordButtonRef} title="Record" />
                  </div>
                  <button onClick={() => statsButtonRef.current?.click()} className="px-3 py-2 rounded flex items-center gap-1" title="Statistics">
                    <BarChart3 size={18} />
                  </button>
                  <button onClick={() => { recordButtonRef.current?.click(); setIsRecording((v)=>!v); }} className="px-3 py-2 rounded flex items-center gap-1" title="Record">
                    {isRecording ? <CircleStop size={18} /> : <Circle size={18} />}
                  </button>
                  <button onClick={() => setShowConfirmLeave(true)} className="stream-leave-button px-3 py-2 rounded flex items-center gap-1" title="Leave">
                    <PhoneOff size={18} />
                  </button>
                </div>
              </div>
            </div>
          </StreamCall>
        </StreamVideo>
      </div>
      {showConfirmLeave && (
        <div className="stream-confirm fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-md">
            <div className="text-lg font-semibold mb-2">Leave meeting?</div>
            <p className="text-sm text-gray-600 mb-4">You can leave the meeting{isHost ? ', or end it for everyone if you are the host.' : '.'}</p>
            <div className="flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setShowConfirmLeave(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={handleLeave}>Leave</button>
              {isHost && (
                <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={handleEndForAll}>End for everyone</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamMeetingRoom;
