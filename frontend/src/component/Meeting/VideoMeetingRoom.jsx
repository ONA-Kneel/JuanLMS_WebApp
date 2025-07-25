import React, { useEffect } from 'react';

export const VideoMeetingRoom = ({ meetingData, onLeave, isOpen }) => {
  useEffect(() => {
    if (!isOpen) return;
    
    const meetingId = meetingData?.meetingId || meetingData?._id;
    if (!meetingId) {
      console.error('No meeting ID provided');
      return;
    }

    const meetingUrl = `https://meet.jit.si/${encodeURIComponent(meetingId)}`;
    window.open(meetingUrl, '_blank');
    
    if (onLeave) onLeave();
    
    const timer = setTimeout(() => {
      window.close();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isOpen, meetingData, onLeave]);

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center z-70">
        <div className="text-green-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Opening Meeting...</h2>
        <p className="text-gray-600 mb-6">
          Your meeting is opening in a new tab. If it doesn't open automatically, 
          please check your browser's pop-up blocker.
        </p>
        <button
          onClick={() => {
            const meetingId = meetingData?.meetingId || meetingData?._id || '';
            window.open(`https://meet.jit.si/${encodeURIComponent(meetingId)}`, '_blank');
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg"
        >
          Open Meeting Again
        </button>
      </div>
    </div>
  );
};

export default VideoMeetingRoom;
