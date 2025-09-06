// Logout Validation Test Component
// This component can be used to test logout validation functionality

import React, { useState, useEffect } from 'react';
import { validateLogout, forceLogout, getLogoutStatus } from '../utils/logoutValidation';

const LogoutValidationTest = () => {
  const [logoutStatus, setLogoutStatus] = useState(null);
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    checkLogoutStatus();
  }, []);

  const checkLogoutStatus = () => {
    const status = getLogoutStatus();
    setLogoutStatus(status);
  };

  const runLogoutValidationTest = () => {
    const results = [];
    
    // Test 1: Check current logout status
    const currentStatus = getLogoutStatus();
    results.push({
      test: 'Current Logout Status Check',
      success: currentStatus.isLoggedOut,
      details: currentStatus.validation.message
    });

    // Test 2: Validate logout
    const validation = validateLogout();
    results.push({
      test: 'Logout Validation',
      success: validation.success,
      details: validation.message
    });

    // Test 3: Check specific auth data
    const hasToken = !!localStorage.getItem('token');
    const hasUser = !!localStorage.getItem('user');
    const hasRole = !!localStorage.getItem('role');
    
    results.push({
      test: 'Auth Data Check',
      success: !hasToken && !hasUser && !hasRole,
      details: `Token: ${hasToken}, User: ${hasUser}, Role: ${hasRole}`
    });

    setTestResults(results);
  };

  const testForceLogout = () => {
    const result = forceLogout();
    setTestResults(prev => [...prev, {
      test: 'Force Logout Test',
      success: result.success,
      details: result.message
    }]);
    checkLogoutStatus();
  };

  const clearAllData = () => {
    const keysToRemove = [
      'token', 'user', 'userID', 'role', 'rememberedEmail', 'rememberedPassword',
      'shouldLogoutOnReturn', 'schoolID', 'globalQuarter', 'globalTerm', 'globalAcademicYear'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    checkLogoutStatus();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Logout Validation Test</h2>
      
      {/* Current Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Current Status</h3>
        {logoutStatus && (
          <div className={`p-4 rounded-lg ${logoutStatus.isLoggedOut ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
            <p className={`font-medium ${logoutStatus.isLoggedOut ? 'text-green-800' : 'text-red-800'}`}>
              {logoutStatus.isLoggedOut ? '✅ User is logged out' : '❌ User is still logged in'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Token: {logoutStatus.hasToken ? 'Present' : 'Absent'} | 
              User: {logoutStatus.hasUser ? 'Present' : 'Absent'} | 
              Role: {logoutStatus.hasRole ? 'Present' : 'Absent'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Last checked: {new Date(logoutStatus.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Test Controls</h3>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={checkLogoutStatus}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Status
          </button>
          <button
            onClick={runLogoutValidationTest}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Run Validation Test
          </button>
          <button
            onClick={testForceLogout}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Test Force Logout
          </button>
          <button
            onClick={clearAllData}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All Data
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Test Results</h3>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.test}</span>
                  <span className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.success ? '✅ PASS' : '❌ FAIL'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{result.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local Storage Contents */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Local Storage Contents</h3>
        <div className="bg-gray-100 p-4 rounded-lg max-h-40 overflow-y-auto">
          {Object.keys(localStorage).length === 0 ? (
            <p className="text-gray-500">No data in localStorage</p>
          ) : (
            <div className="space-y-1">
              {Object.keys(localStorage).map(key => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="font-medium">{key}:</span>
                  <span className="text-gray-600">
                    {localStorage.getItem(key)?.substring(0, 50)}
                    {localStorage.getItem(key)?.length > 50 ? '...' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">How to Test:</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Login to the application first</li>
          <li>Click "Refresh Status" to see current state</li>
          <li>Click "Run Validation Test" to test logout validation</li>
          <li>Perform a logout from the application</li>
          <li>Click "Refresh Status" again to verify logout was successful</li>
          <li>Use "Test Force Logout" to test the force logout function</li>
        </ol>
      </div>
    </div>
  );
};

export default LogoutValidationTest;
