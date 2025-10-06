import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

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
  const quizCompletionListeners = useRef([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Prefer stored user object (used throughout app) and fall back to legacy key
    let userId = null;
    try {
      const storedUser = localStorage.getItem('user');
      userId = storedUser ? JSON.parse(storedUser)?._id : null;
    } catch {
      userId = null;
    }
    if (!userId) {
      userId = localStorage.getItem('userID');
    }

    if (token && userId) {
      const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
      
      const newSocket = io(API_BASE, {
        auth: {
          token: token,
          userId: userId
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        newSocket.emit('addUser', userId);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      newSocket.on('connect_error', () => {
        setIsConnected(false);
      });

      // Add quiz completion event listener
      newSocket.on('quizCompleted', (data) => {
        console.log('[SocketContext] Quiz completed event received:', data);
        // Notify all registered listeners
        quizCompletionListeners.current.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error('[SocketContext] Error in quiz completion listener:', error);
          }
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
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

  const addQuizCompletionListener = (listener) => {
    quizCompletionListeners.current.push(listener);
    return () => {
      quizCompletionListeners.current = quizCompletionListeners.current.filter(l => l !== listener);
    };
  };

  const value = {
    socket,
    isConnected,
    joinClass,
    leaveClass,
    joinUserRoom,
    leaveUserRoom,
    addQuizCompletionListener
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
