// components/NotificationCenter.jsx - Simplified version
import React from 'react';
import { Bell } from 'lucide-react';

const NotificationCenter = ({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onClose 
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Notification Panel */}
      <div className="fixed top-16 right-4 w-96 bg-white shadow-xl rounded-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification._id || notification.id}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => onMarkAsRead(notification._id || notification.id)}
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
                      <span>{getTimeAgo(notification.timestamp)}</span>
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
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationCenter;