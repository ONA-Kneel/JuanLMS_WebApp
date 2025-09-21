import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import tokenService from '../services/tokenService.js';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef(null);

  const connectSocket = async () => {
    try {
      const token = await tokenService.getValidToken();
      const userId = localStorage.getItem('userID');
      
      if (!token || !userId) {
        console.log('[SOCKET] No valid token or userId, skipping connection');
        return null;
      }

      const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
      
      console.log('[SOCKET] Connecting with token...');
      
      const newSocket = io(API_BASE, {
        auth: {
          token: token,
          userId: userId
        },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 0, // We'll handle reconnection manually
        timeout: 10000
      });

      newSocket.on('connect', () => {
        console.log('[SOCKET] Connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        newSocket.emit('addUser', userId);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('[SOCKET] Disconnected:', reason);
        setIsConnected(false);
        
        // Only attempt reconnection if it wasn't a manual disconnect
        if (reason !== 'io client disconnect' && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('[SOCKET] Connection error:', error.message);
        setIsConnected(false);
        
        // Handle authentication errors
        if (error.message.includes('Authentication error')) {
          console.log('[SOCKET] Authentication error, attempting token refresh...');
          handleAuthError();
        } else if (reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      });

      return newSocket;
    } catch (error) {
      console.error('[SOCKET] Failed to connect:', error);
      return null;
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
    console.log(`[SOCKET] Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
    
    reconnectTimeout.current = setTimeout(async () => {
      reconnectAttempts.current++;
      const newSocket = await connectSocket();
      if (newSocket) {
        setSocket(newSocket);
      }
    }, delay);
  };

  const handleAuthError = async () => {
    try {
      console.log('[SOCKET] Attempting to refresh token...');
      await tokenService.refreshToken();
      
      // Reconnect with new token
      const newSocket = await connectSocket();
      if (newSocket) {
        setSocket(newSocket);
      }
    } catch (error) {
      console.error('[SOCKET] Token refresh failed:', error);
      // Let the session expiration modal handle this
    }
  };

  const disconnect = () => {
    if (socket) {
      console.log('[SOCKET] Manually disconnecting...');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    reconnectAttempts.current = 0;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userID');
    
    if (token && userId) {
      connectSocket().then(newSocket => {
        if (newSocket) {
          setSocket(newSocket);
        }
      });
    }

    // Listen for token refresh events
    const handleTokenRefresh = () => {
      console.log('[SOCKET] Token refreshed, reconnecting...');
      disconnect();
      connectSocket().then(newSocket => {
        if (newSocket) {
          setSocket(newSocket);
        }
      });
    };

    // Listen for session expiration
    const handleSessionExpired = () => {
      console.log('[SOCKET] Session expired, disconnecting...');
      disconnect();
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh);
    window.addEventListener('sessionExpired', handleSessionExpired);

    return () => {
      disconnect();
      window.removeEventListener('tokenRefreshed', handleTokenRefresh);
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
  }, []);

  const joinClass = (classId) => {
    if (socket && isConnected) {
      socket.emit('joinClass', classId);
    }
  };

  const leaveClass = (classId) => {
    if (socket && isConnected) {
      socket.emit('leaveClass', classId);
    }
  };

  const joinUserRoom = (userId) => {
    if (socket && isConnected) {
      socket.emit('joinUserRoom', userId);
    }
  };

  const leaveUserRoom = (userId) => {
    if (socket && isConnected) {
      socket.emit('leaveUserRoom', userId);
    }
  };

  const value = {
    socket,
    isConnected,
    joinClass,
    leaveClass,
    joinUserRoom,
    leaveUserRoom,
    disconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
