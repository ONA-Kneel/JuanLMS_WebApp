// Login.jsx
// Login page for JuanLMS. Handles user authentication, auto-login, and role-based navigation.
// Features: Remember Me, password visibility toggle, JWT decode, and auto-login if credentials are stored.

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo/Logo4.svg';
import logo6 from '../assets/logo/SJDD Logo.svg';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { getProfileImageUrl } from '../utils/imageUtils';
import { jwtDecode } from 'jwt-decode'; // ✅ import for decoding JWT
import ValidationModal from './ValidationModal';
import { hasValidSession, getDashboardPathForRole } from '../utils/sessionUtils';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Login() {
  const navigate = useNavigate();

  // --- STATE ---
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [previousErrors, setPreviousErrors] = useState(new Set());
  const [isLocked, setIsLocked] = useState(() => {
    const lockoutEndTime = localStorage.getItem('lockoutEndTime');
    if (lockoutEndTime) {
      const remainingTime = Math.ceil((parseInt(lockoutEndTime) - Date.now()) / 1000);
      return remainingTime > 0;
    }
    return false;
  });
  const [lockoutTime, setLockoutTime] = useState(() => {
    const lockoutEndTime = localStorage.getItem('lockoutEndTime');
    if (lockoutEndTime) {
      const remainingTime = Math.ceil((parseInt(lockoutEndTime) - Date.now()) / 1000);
      return remainingTime > 0 ? remainingTime : 30;
    }
    return 30;
  });
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  // --- EFFECT: Auto-login if credentials are stored in localStorage ---
  useEffect(() => {
    // --- CHECK: If there's already an active session from another tab, redirect immediately ---
    const checkExistingSession = () => {
      if (hasValidSession()) {
        const role = localStorage.getItem('role');
        const targetPath = getDashboardPathForRole(role);
        
        if (targetPath !== '/') {
          console.log(`[Login Component] Active session detected, redirecting to ${targetPath} for role: ${role}`);
          navigate(targetPath, { replace: true });
          return true; // Session found and redirecting
        }
      }
      return false; // No active session
    };

    // Check for existing session first
    if (checkExistingSession()) {
      return; // Don't proceed with auto-login if redirecting
    }

    // --- HANDLER: Auto-login using stored credentials ---
    const handleAutoLogin = async (email, password) => {
      try {
        const response = await axios.post(
          `${API_BASE}/login`,
          { email, password },
          { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
        const { token } = response.data;
    
        // Decode JWT to extract user info and role
        const decoded = jwtDecode(token);
        const { _id, role, name, email: userEmail, phone, profilePic, userID } = decoded;
        const normalizedName = name ? name.normalize('NFC') : '';
    
        // Debug: Log the role to see what's being received
        console.log('Received role:', role);
        console.log('Role type:', typeof role);
    
        // If user has a profile picture, build the image URL
        const imageUrl = getProfileImageUrl(profilePic, API_BASE, null);
    
              // Store user info and token in localStorage
        localStorage.setItem('user', JSON.stringify({ _id, name: normalizedName, email: userEmail, phone, role, profilePic: imageUrl }));
        localStorage.setItem('token', token);
        localStorage.setItem('userID', userID);
        localStorage.setItem('role', role);
        
        // Clear the logout flag since auto-login means user had "Remember Me" enabled
        localStorage.removeItem('shouldLogoutOnReturn');

        // Navigate to dashboard based on user role using utility function
        const targetPath = getDashboardPathForRole(role);
        
        if (targetPath !== '/') {
          navigate(targetPath);
        } else {
          console.error('Unknown role received:', role);
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'Unknown Role',
            message: `Unknown role: ${role}. Please contact administrator.`
          });
        }
      } catch (error) {
        console.error('Auto-login failed:', error);
        // Clear stored credentials if auto-login fails
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }
    };

    // Check if we should logout when returning to login page
    const shouldLogout = localStorage.getItem('shouldLogoutOnReturn');
    const token = localStorage.getItem('token');
    
    if (shouldLogout === 'true' && token) {
      // Clear all user data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userID');
      localStorage.removeItem('role');
      localStorage.removeItem('shouldLogoutOnReturn');
      
      // Clear any stored credentials that might exist
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
      
      console.log('Auto-logout: User returned to login page without "Remember Me"');
      return; // Don't proceed with auto-login
    }
    
    // Check for stored credentials on component mount
    const storedEmail = localStorage.getItem('rememberedEmail');
    const storedPassword = localStorage.getItem('rememberedPassword');
    
    if (storedEmail && storedPassword) {
      // Auto-login with stored credentials
      handleAutoLogin(storedEmail, storedPassword);
    }
  }, [navigate, setValidationModal]);

  // --- EFFECT: Handle browser navigation and auto-logout ---
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Check if user is logged in but didn't use "Remember Me"
      const token = localStorage.getItem('token');
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      const rememberedPassword = localStorage.getItem('rememberedPassword');
      
      // If user is logged in but doesn't have remembered credentials, mark for logout
      if (token && (!rememberedEmail || !rememberedPassword)) {
        localStorage.setItem('shouldLogoutOnReturn', 'true');
      }
    };

    const handlePageShow = () => {
      // Check if we should logout when returning to login page
      const shouldLogout = localStorage.getItem('shouldLogoutOnReturn');
      const token = localStorage.getItem('token');
      
      if (shouldLogout === 'true' && token) {
        // Clear all user data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('userID');
        localStorage.removeItem('role');
        localStorage.removeItem('shouldLogoutOnReturn');
        
        // Clear any stored credentials that might exist
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        
        console.log('Auto-logout: User returned to login page without "Remember Me"');
      }
    };

    const handleVisibilityChange = () => {
      // Handle when page becomes visible again (e.g., switching tabs back)
      if (!document.hidden) {
        const shouldLogout = localStorage.getItem('shouldLogoutOnReturn');
        const token = localStorage.getItem('token');
        
        if (shouldLogout === 'true' && token) {
          // Clear all user data
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('userID');
          localStorage.removeItem('role');
          localStorage.removeItem('shouldLogoutOnReturn');
          
          // Clear any stored credentials that might exist
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
          
          console.log('Auto-logout: User returned to page without "Remember Me"');
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);




  // --- HANDLER: Lockout timer countdown ---
  useEffect(() => {
    let timer;
    if (isLocked && lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime((prev) => {
          const newTime = prev - 1;
          if (newTime === 0) {
            setIsLocked(false);
            setFailedAttempts(0);
            setPreviousErrors(new Set());
            localStorage.removeItem('lockoutEndTime');
            return 30;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockoutTime]);

  // --- HANDLER: Manual login form submission ---
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Check if account is locked
    if (isLocked) {
      return;
    }

    const email = e.target.elements[0].value;
    const password = e.target.elements[1].value;
  
    try {
      const response = await axios.post(
        `${API_BASE}/login`,
        { email, password },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
      const { token } = response.data;
  
      // Reset failed attempts and previous errors on successful login
      setFailedAttempts(0);
      setPreviousErrors(new Set());
  
      // Decode JWT to extract user info and role
      const decoded = jwtDecode(token);
      const { _id, role, name, email: userEmail, profilePic, userID } = decoded;
      const normalizedName = name ? name.normalize('NFC') : '';

      // Debug: Log the received data
      console.log('[Login Debug] JWT decoded:', decoded);
      console.log('[Login Debug] Role received:', role);
      console.log('[Login Debug] Role type:', typeof role);

      const imageUrl = getProfileImageUrl(profilePic, API_BASE, null);

      // Store user info and token in localStorage
      localStorage.setItem('user', JSON.stringify({ _id, name: normalizedName, email: userEmail, role, profilePic: imageUrl }));
      localStorage.setItem('token', token);
      localStorage.setItem('userID', userID);
      localStorage.setItem('role', role);

      // Debug: Log localStorage values
      console.log('[Login Debug] Stored in localStorage:', {
        user: JSON.parse(localStorage.getItem('user')),
        token: localStorage.getItem('token'),
        userID: localStorage.getItem('userID'),
        role: localStorage.getItem('role')
      });

      // Store credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
        // Clear the logout flag since user chose to be remembered
        localStorage.removeItem('shouldLogoutOnReturn');
      } else {
        // Clear any previously stored credentials
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        // Set flag to logout when returning to login page
        localStorage.setItem('shouldLogoutOnReturn', 'true');
      }

      // Navigate to dashboard based on user role using utility function
      const targetPath = getDashboardPathForRole(role);
      console.log('[Login Debug] Target path generated:', targetPath);
      
      if (targetPath !== '/') {
        console.log('[Login Debug] Navigating to:', targetPath);
        navigate(targetPath);
      } else {
        console.error('[Login Debug] Unknown role received:', role);
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Unknown Role',
          message: `Unknown role: ${role}. Please contact administrator.`
        });
      }
  
    } catch (error) {
      console.error('Login failed:', error);
      
      // Handle archived account case first
      if (
        error.response &&
        error.response.data &&
        error.response.data.message === 'Account is archived. Please contact admin.'
      ) {
        setShowArchivedModal(true);
        return;
      }
      
      // Increment failed attempts
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      // Check if account should be locked
      if (newFailedAttempts >= 5) {
        setIsLocked(true);
        const lockoutEndTime = Date.now() + (30 * 1000); // 30 minutes
        localStorage.setItem('lockoutEndTime', lockoutEndTime.toString());
        setLockoutTime(30); // 30 minutes in seconds
        return;
      }
      
      // Handle specific error cases
      let errorMessage = 'Invalid email or password.';
      let currentErrorType = '';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        // Custom error handling for email/password
        if (status === 401) {
          if (data.message === 'Invalid email') {
            currentErrorType = 'email';
            errorMessage = 'Invalid email address.';
          } else if (data.message === 'Invalid password') {
            currentErrorType = 'password';
            errorMessage = 'Incorrect password.';
          } else if (data.message && data.message.toLowerCase().includes('invalid email or password')) {
            errorMessage = 'Invalid email and password.';
          } else {
            errorMessage = data.message || 'Invalid email or password.';
          }
        } else if (status === 403) {
          errorMessage = data.message || 'Account is disabled or locked.';
        } else if (status === 404) {
          errorMessage = 'User account not found.';
        } else if (status === 422) {
          errorMessage = data.message || 'Invalid input data.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = data.message || `Login failed (${status}).`;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred.';
      }
      
      // Track error types and show combined message if both email and password have been wrong
      if (currentErrorType) {
        const newPreviousErrors = new Set(previousErrors);
        newPreviousErrors.add(currentErrorType);
        setPreviousErrors(newPreviousErrors);
        
        // If user has had both email and password errors, show combined message
        if (newPreviousErrors.has('email') && newPreviousErrors.has('password')) {
          errorMessage = 'Invalid email and password.';
        }
      }
      
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Login Failed',
        message: errorMessage
      });
    }
  };
  
  //heheh
  // --- RENDER ---
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 inset-shadow-black px-4">
      <div className="w-full max-w-4xl bg-white shadow-lg flex flex-col md:flex-row h-auto md:h-[30rem] lg:w-[120rem]">

        {/* Left Section (Login Form) */}
        <div className="w-full md:w-1/2 p-8 md:p-12">
          <h2 className="text-3xl mb-8 font-poppinsb text-gray-900">Login</h2>

          <form onSubmit={handleLogin} acceptCharset="UTF-8" className="space-y-4 mt-8">
            <div>
              <label className="block text-base font-poppinsr mb-2">Email</label>
              <input
                type="text"
                required
                disabled={isLocked}
                inputMode="email"
                autoComplete="email"
                spellCheck="false"
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-poppinsr text-base border-blue-900"
                placeholder="School E-mail"
              />
            </div>

            <div>
              <label className="block text-base font-poppinsr mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLocked}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-poppinsr text-base border-blue-900 pr-12"
                  placeholder="********"
                />
                {/* Password visibility toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLocked}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600 hover:text-blue-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="h-5 mb-2">
              {failedAttempts > 0 && !isLocked && (
                <div className="text-red-600 font-poppinsr text-sm">
                  {validationModal.message || 'Invalid email or password.'}
                </div>
              )}
              {isLocked && (
                <div className="text-red-600 font-poppinsr text-sm">
                  Account locked. Please try again in {lockoutTime} seconds.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center font-poppinsr text-sm">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLocked}
                />
                Remember Me
              </label>
              <Link to="/forgot-password" className="text-blue-600 hover:underline font-poppinsr text-sm">
                Forgot Password?  
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLocked}
              className={`w-full p-3 rounded-t-lg transition font-poppinsr text-base ${
                isLocked 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-900 text-white hover:bg-blue-950'
              }`}
            >
              {isLocked ? `Locked (${lockoutTime}s)` : 'Login'}
            </button>
            {/* Register Link - directly below the button, no margin */}
            <div className="text-center text-sm">
              <span className="text-gray-700">New Student? </span>
              <Link to="/register" className="text-blue-600 hover:underline font-poppinsr">Register Here</Link>
            </div>
          </form>
        </div>

        {/* Right Section (Welcome Message) */}
        <div className="relative w-full md:w-1/2 flex flex-col items-start justify-center p-8 md:p-10 bg-[url('/src/assets/bg-JuanLMS.svg')] bg-cover bg-center text-white">
          <div className="absolute top-5 right-5 md:right-10 ">
            <img src={logo} className="w-35 md:w-38" alt="JUANLMS Logo" />
          </div>

          <div className="absolute top-7 right-10 md:right-35 pr-12">
            <img src={logo6} className="w-28 md:w-33" alt="SJDDEFI Logo" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-poppinsb pt-20">Hello,</h2>
          <h2 className="text-3xl md:text-4xl font-bold font-poppinsb">welcome!</h2>
          <p className="text-sm mt-4 font-poppinsl max-w-xs">
            San Juan De Dios Educational Foundation, Inc. Learning Management System
          </p>
        </div>

      </div>
      {/* Archived Account Modal */}
      {showArchivedModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Account Archived</h3>
            <p className="mb-4">Your account is archived. Please contact the administrator for assistance.</p>
            <button
              onClick={() => setShowArchivedModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
            >
              OK
            </button>
          </div>
        </div>
      )}
      <ValidationModal
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
        type={validationModal.type}
        title={validationModal.title}
        message={validationModal.message}
      />
    </div>
  );
}