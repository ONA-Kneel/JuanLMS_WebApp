import React, { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userID');
    
    if (token && userId) {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
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

      newSocket.on('connect_error', (error) => {
        setIsConnected(false);
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

  const value = {
    socket,
    isConnected,
    joinClass,
    leaveClass,
    joinUserRoom,
    leaveUserRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
