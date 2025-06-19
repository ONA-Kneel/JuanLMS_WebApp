// Login.jsx
// Login page for JuanLMS. Handles user authentication, auto-login, and role-based navigation.
// Features: Remember Me, password visibility toggle, JWT decode, and auto-login if credentials are stored.

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo/Logo4.svg';
import logo6 from '../assets/logo/SJDD Logo.svg';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { jwtDecode } from 'jwt-decode'; // ✅ import for decoding JWT

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Login() {
  const navigate = useNavigate();

  // --- STATE ---
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
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

  // --- EFFECT: Auto-login if credentials are stored in localStorage ---
  useEffect(() => {
    // Check for stored credentials on component mount
    const storedEmail = localStorage.getItem('rememberedEmail');
    const storedPassword = localStorage.getItem('rememberedPassword');
    
    if (storedEmail && storedPassword) {
      // Auto-login with stored credentials
      handleAutoLogin(storedEmail, storedPassword);
    }
  }, []);

  // --- HANDLER: Auto-login using stored credentials ---
  const handleAutoLogin = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE}/login`, { email, password });
      const { token } = response.data;
  
      // Decode JWT to extract user info and role
      const decoded = jwtDecode(token);
      const { _id, role, name, email: userEmail, phone, profilePic, userID } = decoded;
  
      // If user has a profile picture, build the image URL
      const imageUrl = profilePic ? `${API_BASE}/uploads/${profilePic}` : null;
  
      // Store user info and token in localStorage
      localStorage.setItem('user', JSON.stringify({ _id, name, email: userEmail, phone, role, profilePic: imageUrl }));
      localStorage.setItem('token', token);
      localStorage.setItem('userID', userID);
      localStorage.setItem('role', role);
  
      // Navigate to dashboard based on user role
      if (role === 'students') navigate('/student_dashboard');
      else if (role === 'faculty') navigate('/faculty_dashboard');
      else if (role === 'parent') navigate('/parent_dashboard');
      else if (role === 'admin') navigate('/admin_dashboard');
      else if (role === 'director') navigate('/director_dashboard');
      else alert('Unknown role');
    } catch (error) {
      console.log(error);
      // Clear stored credentials if auto-login fails
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
    }
  };

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
      const response = await axios.post(`${API_BASE}/login`, { email, password });
      const { token } = response.data;
  
      // Reset failed attempts on successful login
      setFailedAttempts(0);
  
      // Decode JWT to extract user info and role
      const decoded = jwtDecode(token);
      const { _id, role, name, email: userEmail, phone, profilePic, userID } = decoded;
  
      const imageUrl = profilePic ? `${API_BASE}/uploads/${profilePic}` : null;
  
      // Store user info and token in localStorage
      localStorage.setItem('user', JSON.stringify({ _id, name, email: userEmail, phone, role, profilePic: imageUrl }));
      localStorage.setItem('token', token);
      localStorage.setItem('userID', userID);
      localStorage.setItem('role', role);

      // Store credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        // Clear any previously stored credentials
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }
  
      // Navigate to dashboard based on user role
      if (role === 'students') navigate('/student_dashboard');
      else if (role === 'faculty') navigate('/faculty_dashboard');
      else if (role === 'parent') navigate('/parent_dashboard');
      else if (role === 'admin') navigate('/admin_dashboard');
      else if (role === 'director') navigate('/director_dashboard');
      else alert('Unknown role');
  
    } catch (error) {
      console.log(error);
      // Increment failed attempts
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      if (newFailedAttempts >= 3) {
        setIsLocked(true);
        const lockoutEndTime = Date.now() + (30 * 1000); // 30 seconds from now
        localStorage.setItem('lockoutEndTime', lockoutEndTime.toString());
      }
      if (
        error.response &&
        error.response.data &&
        error.response.data.message === 'Account is archived. Please contact admin.'
      ) {
        setShowArchivedModal(true);
        return;
      }
    }
  };
  

  // --- RENDER ---
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 inset-shadow-black px-4">
      <div className="w-full max-w-4xl bg-white shadow-lg flex flex-col md:flex-row h-auto md:h-[30rem] lg:w-[120rem]">

        {/* Left Section (Login Form) */}
        <div className="w-full md:w-1/2 p-8 md:p-12">
          <h2 className="text-3xl mb-8 font-poppinsb text-gray-900">Login</h2>

          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <div>
              <label className="block text-base font-poppinsr mb-2">Email</label>
              <input
                type="email"
                required
                disabled={isLocked}
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
                  Invalid email or password.
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
          <img src={logo} className="w-20 md:w-24 absolute top-5 right-5 md:right-10" alt="JUANLMS Logo" />
          <img src={logo6} className="w-18 md:w-20 absolute top-7 right-10 md:right-35" alt="SJDDEFI Logo" />
          <h2 className="text-3xl md:text-4xl font-bold font-poppinsb">Hello,</h2>
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
    </div>
  );
}