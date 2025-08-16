// hooks/useNotifications.js - NO JSX VERSION
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user._id) return;

      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/notifications/${user._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Sample data for testing
      setSampleNotifications();
    }
  };

  const setSampleNotifications = () => {
    const sampleData = [
      {
        id: 1,
        type: 'announcement',
        title: 'New Course Material Available',
        message: 'Dr. Smith has posted new lecture notes for Computer Science 101',
        faculty: 'Dr. Sarah Smith',
        className: 'Computer Science 101',
        classCode: 'CS101',
        timestamp: new Date(Date.now() - 300000),
        read: false,
        priority: 'high'
      },
      {
        id: 2,
        type: 'activity',
        title: 'Assignment Due Reminder',
        message: 'Programming Assignment #3 is due tomorrow at 11:59 PM',
        faculty: 'Prof. Johnson',
        className: 'Advanced Programming',
        classCode: 'CS201',
        timestamp: new Date(Date.now() - 900000),
        read: false,
        priority: 'urgent'
      },
      {
        id: 3,
        type: 'message',
        title: 'New Message Received',
        message: '"Hey, can you help me with the assignment?"',
        faculty: 'John Doe',
        className: 'Direct Message',
        classCode: 'DM',
        timestamp: new Date(Date.now() - 600000),
        read: false,
        priority: 'normal'
      }
    ];
    setNotifications(sampleData);
  };

  // Show simple text toast notification
  const showToast = (notification) => {
    const icon = notification.type === 'announcement' ? '📢' : 
                 notification.type === 'message' ? '💬' : '📝';
    let message = `${icon} ${notification.title}\n${notification.message}\n👤 ${notification.faculty}`;
    
    // Add class information if available (skip for direct messages)
    if (notification.className && notification.classID !== 'direct_message') {
      message += `\n📚 ${notification.className} (${notification.classCode})`;
    }
    
    const toastConfig = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      className: notification.priority === 'urgent' ? 'toast-urgent' : 'toast-normal'
    };

    if (notification.priority === 'urgent') {
      toast.error(message, toastConfig);
    } else if (notification.priority === 'high') {
      toast.warn(message, toastConfig);
    } else {
      toast.info(message, toastConfig);
    }
  };



  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/notifications/${notificationId}/read`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => 
        prev.map(n => 
          (n._id || n.id) === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user._id) return;
      
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/notifications/${user._id}/read-all`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    showNotificationCenter,
    setShowNotificationCenter,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  };
};