import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, Check, X } from 'lucide-react';
import pushNotificationService from '../services/pushNotificationService';

const NotificationSettings = ({ isOpen, onClose }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen) {
      checkNotificationStatus();
    }
  }, [isOpen]);

  const checkNotificationStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if push notifications are supported
      const supported = pushNotificationService.isSupported;
      setIsSupported(supported);

      if (supported) {
        // Check permission status
        setPermission(Notification.permission);
        
        // Check if user is subscribed
        const subscribed = await pushNotificationService.isSubscribed();
        setIsSubscribed(subscribed);
      }
    } catch (error) {
      console.error('Error checking notification status:', error);
      setError('Failed to check notification status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Initialize the service
      const initialized = await pushNotificationService.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize push notification service');
      }

      // Request permission
      const permissionResult = await pushNotificationService.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        // Subscribe to push notifications
        await pushNotificationService.subscribe();
        setIsSubscribed(true);
        setSuccess('Push notifications enabled successfully!');
      } else if (permissionResult === 'denied') {
        setError('Notification permission was denied. Please enable it in your browser settings.');
      } else {
        setError('Notification permission was dismissed.');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setError(error.message || 'Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await pushNotificationService.unsubscribe();
      setIsSubscribed(false);
      setSuccess('Push notifications disabled successfully!');
    } catch (error) {
      console.error('Error disabling notifications:', error);
      setError(error.message || 'Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = () => {
    try {
      pushNotificationService.showLocalNotification('Test Notification', {
        body: 'This is a test notification from JuanLMS',
        tag: 'test-notification',
        requireInteraction: true
      });
      setSuccess('Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      setError('Failed to send test notification');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {isSupported ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium text-gray-900">Browser Support</span>
                </div>
                <span className={`text-sm font-medium ${
                  isSupported ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isSupported ? 'Supported' : 'Not Supported'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {permission === 'granted' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium text-gray-900">Permission</span>
                </div>
                <span className={`text-sm font-medium ${
                  permission === 'granted' ? 'text-green-600' : 
                  permission === 'denied' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {permission === 'granted' ? 'Granted' : 
                   permission === 'denied' ? 'Denied' : 'Not Requested'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {isSubscribed ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium text-gray-900">Push Notifications</span>
                </div>
                <span className={`text-sm font-medium ${
                  isSubscribed ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isSubscribed ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <X className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {!isSubscribed && permission !== 'denied' && (
                <button
                  onClick={handleEnableNotifications}
                  disabled={isLoading || !isSupported}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                  <span>Enable Push Notifications</span>
                </button>
              )}

              {isSubscribed && (
                <button
                  onClick={handleDisableNotifications}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <BellOff className="w-5 h-5" />
                  )}
                  <span>Disable Push Notifications</span>
                </button>
              )}

              {isSubscribed && (
                <button
                  onClick={handleTestNotification}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  <span>Send Test Notification</span>
                </button>
              )}
            </div>

            {/* Help Text */}
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Push notifications</strong> will alert you about new announcements, 
                assignments, messages, and other important updates even when the app is not open.
              </p>
              {permission === 'denied' && (
                <p className="text-red-600">
                  <strong>Note:</strong> Notifications are currently blocked. To enable them, 
                  click the notification icon in your browser's address bar and allow notifications.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationSettings;
