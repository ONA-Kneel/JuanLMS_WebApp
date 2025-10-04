// components/NotificationCenter.jsx - Simplified version
import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

const NotificationCenter = ({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onClose,
  onNotificationClick,
  onFetchNotifications
}) => {
  const [activeTab, setActiveTab] = useState('announcements');
  const [acknowledgedAnnouncements, setAcknowledgedAnnouncements] = useState([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const API_BASE = "https://juanlms-webapp-server.onrender.com";

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diff = now - notificationTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return notificationTime.toLocaleDateString();
  };

  // Fetch acknowledged announcements
  const fetchAcknowledgedAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/general-announcements/acknowledged`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAcknowledgedAnnouncements(data);
      } else {
        // Failed to fetch acknowledged announcements
        setAcknowledgedAnnouncements([]);
      }
    } catch (error) {
      // Error fetching acknowledged announcements
      setAcknowledgedAnnouncements([]);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  // Filter notifications based on active tab
  const getFilteredNotifications = () => {
    if (activeTab === 'announcements') {
      // Show acknowledged announcements from Principal/VPE
      return acknowledgedAnnouncements.filter(announcement => 
        announcement.createdBy?.role?.toLowerCase() === 'principal' || 
        announcement.createdBy?.role?.toLowerCase() === 'vice president of education'
      );
    } else {
      // Show all other notifications (messages, activities, etc.)
      return notifications.filter(n => 
        n.type !== 'announcement' || 
        (!n.faculty?.toLowerCase().includes('principal') && 
         !n.faculty?.toLowerCase().includes('vpe') &&
         !n.faculty?.toLowerCase().includes('vice president'))
      );
    }
  };

  const filteredItems = getFilteredNotifications();

  // Fetch announcements when component mounts or tab changes
  useEffect(() => {
    if (activeTab === 'announcements') {
      fetchAcknowledgedAnnouncements();
    }
  }, [activeTab]);

  // Trigger real-time notification fetch when panel opens
  useEffect(() => {
    if (onFetchNotifications) {
      onFetchNotifications();
    }
  }, [onFetchNotifications]);

  // Format date for announcements
  const formatAnnouncementDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Notification Panel */}
      <div className="fixed top-16 right-4 w-96 bg-white shadow-xl rounded-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  if (isLoadingAnnouncements) return;
                  setIsLoadingAnnouncements(true);
                  try { await onMarkAllAsRead(); } finally { setIsLoadingAnnouncements(false); }
                }}
                disabled={isLoadingAnnouncements}
                className={`text-sm font-medium ${isLoadingAnnouncements ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
              >
                {isLoadingAnnouncements ? 'Marking…' : 'Mark all as read'}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'announcements'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Announcements
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'updates'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Updates
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-80">
          {activeTab === 'announcements' ? (
            // Announcements Tab Content
            isLoadingAnnouncements ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p>Loading announcements...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No acknowledged announcements yet</p>
              </div>
            ) : (
              filteredItems.map((announcement) => (
                <div
                  key={announcement._id}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                  onClick={() => {
                    if (onNotificationClick) {
                      onNotificationClick(announcement);
                    }
                  }}
                  title="Click to view"
                >
                  {/* Announcement Card Design */}
                  <div className="space-y-2">
                    {/* Header - Title */}
                    <div className="font-semibold text-gray-900 text-sm leading-tight">
                      {announcement.title}
                    </div>
                    
                    {/* Date underneath */}
                    <div className="text-xs text-gray-500">
                      {formatAnnouncementDate(announcement.createdAt)}
                    </div>
                    
                    {/* Creator info */}
                    <div className="text-xs text-gray-600">
                      👤 {announcement.createdBy?.firstname} {announcement.createdBy?.lastname} ({announcement.createdBy?.role})
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            // Updates Tab Content
            filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No updates yet</p>
              </div>
            ) : (
              filteredItems.map((notification) => (
                <div
                  key={notification._id || notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => {
                    onMarkAsRead(notification._id || notification.id);
                    if (onNotificationClick) {
                      onNotificationClick(notification);
                    }
                  }}
                  title="Click to view"
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">
                      {notification.type === 'announcement' ? '📢' : 
                       notification.type === 'message' ? '💬' : '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>👤 {notification.faculty}</span>
                        <div className="flex items-center space-x-2">
                          <span>{getTimeAgo(notification.timestamp)}</span>
                          <span className="text-blue-500 text-xs">→</span>
                        </div>
                      </div>
                      {notification.className && notification.classID !== 'direct_message' && (
                        <div className="flex items-center text-xs text-blue-600 mt-1">
                          <span>📚 {notification.className} ({notification.classCode})</span>
                        </div>
                      )}
                      {notification.classID === 'direct_message' && (
                        <div className="flex items-center text-xs text-green-600 mt-1">
                          <span>💬 Direct Message</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationCenter;