import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SessionExpiredModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (isOpen) {
      setCountdown(3);
      
      // Countdown timer
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownTimer);
    }
  }, [isOpen]);

  const handleLogout = () => {
    console.log('Session expired - performing logout...');
    
    // Clear all authentication data with validation
    const keysToRemove = [
      'token',
      'user',
      'userID', 
      'role',
      'rememberedEmail',
      'rememberedPassword',
      'shouldLogoutOnReturn',
      'schoolID',
      'globalQuarter',
      'globalTerm',
      'globalAcademicYear'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear session storage
    sessionStorage.clear();
    
    // Validate logout
    const remainingAuthData = keysToRemove.filter(key => localStorage.getItem(key));
    if (remainingAuthData.length > 0) {
      console.error('❌ Session logout validation failed. Remaining data:', remainingAuthData);
      // Force clear any remaining data
      remainingAuthData.forEach(key => localStorage.removeItem(key));
    } else {
      console.log('✅ Session logout validation successful');
    }
    
    // Close modal
    onClose();
    
    // Redirect to login page
    navigate('/', { replace: true });
  };

  const handleLogoutNow = () => {
    handleLogout();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border-2 border-red-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h2>
          <p className="text-gray-600">Your session has expired due to inactivity or invalid credentials.</p>
        </div>

        {/* Content */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-red-800">
              <p className="font-medium mb-1">What happened?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Your login token has expired</li>
                <li>You've been inactive for too long</li>
                <li>Your session was invalidated</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600 mb-2">You will be automatically logged out in:</p>
          <div className="text-2xl font-bold text-red-600">{countdown} second{countdown !== 1 ? 's' : ''}</div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogoutNow}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Logout Now
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            For security reasons, you must log in again to continue.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
