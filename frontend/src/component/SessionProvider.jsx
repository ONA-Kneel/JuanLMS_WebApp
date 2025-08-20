import React, { useEffect } from 'react';
import { useSessionManager } from '../hooks/useSessionManager';
import SessionExpiredModal from './SessionExpiredModal';

const SessionProvider = ({ children }) => {
  const { isSessionExpired, forceSessionExpiration, resetSession } = useSessionManager();

  const handleCloseModal = () => {
    // Don't allow closing the modal - user must logout
    // This ensures security
  };

  // Listen for custom session expired events from API responses
  useEffect(() => {
    const handleSessionExpired = () => {
      forceSessionExpiration();
    };

    window.addEventListener('sessionExpired', handleSessionExpired);

    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
  }, [forceSessionExpiration]);

  return (
    <>
      {children}
      
      {/* Session Expired Modal */}
      <SessionExpiredModal 
        isOpen={isSessionExpired} 
        onClose={handleCloseModal}
      />
    </>
  );
};

export default SessionProvider;
