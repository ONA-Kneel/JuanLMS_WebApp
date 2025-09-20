import React, { useState, useEffect } from 'react';
import { Bell, Check, X, AlertCircle } from 'lucide-react';
import pushNotificationService from '../services/pushNotificationService';

const PushNotificationTest = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsSupported(pushNotificationService.isSupported);
    setPermission(Notification.permission);
    const subscribed = await pushNotificationService.isSubscribed();
    setIsSubscribed(subscribed);
  };

  const handleEnable = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      await pushNotificationService.initialize();
      const permissionResult = await pushNotificationService.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        await pushNotificationService.subscribe();
        setIsSubscribed(true);
        setTestResult({ type: 'success', message: 'Push notifications enabled successfully!' });
      } else {
        setTestResult({ type: 'error', message: 'Permission denied or dismissed' });
      }
    } catch (error) {
      setTestResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = () => {
    try {
      pushNotificationService.showLocalNotification('Test Notification', {
        body: 'This is a test notification from JuanLMS',
        tag: 'test-notification',
        requireInteraction: true
      });
      setTestResult({ type: 'success', message: 'Test notification sent!' });
    } catch (error) {
      setTestResult({ type: 'error', message: 'Failed to send test notification' });
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    try {
      await pushNotificationService.unsubscribe();
      setIsSubscribed(false);
      setTestResult({ type: 'success', message: 'Push notifications disabled' });
    } catch (error) {
      setTestResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Push Notification Test</h2>
      
      {/* Status */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span className="font-medium">Browser Support</span>
          <div className="flex items-center space-x-2">
            {isSupported ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-600" />
            )}
            <span className={isSupported ? 'text-green-600' : 'text-red-600'}>
              {isSupported ? 'Supported' : 'Not Supported'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span className="font-medium">Permission</span>
          <div className="flex items-center space-x-2">
            {permission === 'granted' ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-600" />
            )}
            <span className={permission === 'granted' ? 'text-green-600' : 'text-red-600'}>
              {permission === 'granted' ? 'Granted' : 'Not Granted'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span className="font-medium">Subscription</span>
          <div className="flex items-center space-x-2">
            {isSubscribed ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-600" />
            )}
            <span className={isSubscribed ? 'text-green-600' : 'text-red-600'}>
              {isSubscribed ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-4 rounded-lg mb-4 ${
          testResult.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {testResult.type === 'success' ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={testResult.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {testResult.message}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {!isSubscribed && permission !== 'denied' && (
          <button
            onClick={handleEnable}
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
            onClick={handleTest}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span>Send Test Notification</span>
          </button>
        )}

        {isSubscribed && (
          <button
            onClick={handleDisable}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <X className="w-5 h-5" />
            )}
            <span>Disable Push Notifications</span>
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-600">
        <p className="mb-2">
          <strong>Instructions:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Enable Push Notifications" to request permission</li>
          <li>Allow notifications when prompted by your browser</li>
          <li>Click "Send Test Notification" to test the functionality</li>
          <li>You should see a browser notification appear</li>
        </ol>
      </div>
    </div>
  );
};

export default PushNotificationTest;


