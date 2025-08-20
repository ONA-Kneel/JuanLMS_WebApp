import { useState, useEffect, useCallback } from 'react';

const useSessionManager = () => {
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
      // Decode JWT token (basic check - you might want to use a library like jwt-decode)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
      if (payload.exp && payload.exp < currentTime) {
        return true;
      }

      // Check if token is about to expire (within 5 minutes)
      if (payload.exp && (payload.exp - currentTime) < 300) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error parsing token:', error);
      return true;
    }
  }, []);

  // Check for inactivity (30 minutes)
  const isInactive = useCallback(() => {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    return (Date.now() - lastActivity) > INACTIVITY_TIMEOUT;
  }, [lastActivity]);

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Check session status
  const checkSession = useCallback(() => {
    if (isTokenExpired() || isInactive()) {
      setIsSessionExpired(true);
      return false;
    }
    return true;
  }, [isTokenExpired, isInactive]);

  // Force session expiration (for testing or manual logout)
  const forceSessionExpiration = useCallback(() => {
    setIsSessionExpired(true);
  }, []);

  // Reset session (after successful login)
  const resetSession = useCallback(() => {
    setIsSessionExpired(false);
    setLastActivity(Date.now());
  }, []);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [updateActivity]);

  // Check session periodically (every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      checkSession();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkSession]);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return {
    isSessionExpired,
    checkSession,
    forceSessionExpiration,
    resetSession,
    updateActivity
  };
};

export default useSessionManager;



