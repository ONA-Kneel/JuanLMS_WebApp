// ProfileMenu.jsx - Simplified version with react-toastify
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import profileicon from "../assets/profileicon (1).svg";
import dropdown from "../assets/dropdown.png";
import ProfileModal from "./ProfileModal";
import { Bell } from "lucide-react";
import axios from "axios";

import NotificationCenter from "./NotificationCenter";
import { useNotifications } from "../hooks/useNotifications";
import { getProfileImageUrl } from "../utils/imageUtils";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const navigate = useNavigate();

  // Use the notifications hook
  const {
    notifications,
    unreadCount,
    showNotificationCenter,
    setShowNotificationCenter,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  // Handle notification clicks
  const handleNotificationClick = (notification) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const role = user?.role?.toLowerCase();
    
    const isFaculty = role === 'faculty';
    const isStudent = role === 'students' || role === 'student';
    const isAdmin = role === 'admin';
    const isPrincipal = role === 'principal';
    const isVPE = role === 'vice president of education';

    switch (notification.type) {
      case 'message':
        // Navigate to role-specific chat routes
        if (isFaculty) {
          navigate('/faculty_chats');
        } else if (isStudent) {
          navigate('/student_chats');
        } else if (isAdmin) {
          navigate('/admin_chats');
        } else if (isPrincipal) {
          navigate('/principal_chats');
        } else if (isVPE) {
          navigate('/vpe_chats');
        } else {
          // Fallback for other roles
          navigate('/faculty_chats');
        }
        break;
        
      case 'activity':
        // Navigate to the class where the activity was posted
        if (notification.classID && notification.classID !== 'direct_message') {
          if (isFaculty) {
            navigate(`/faculty_class/${notification.classID}`);
          } else if (isStudent) {
            navigate(`/student_class/${notification.classID}`);
          }
        }
        break;
        
      default:
        // Unknown notification type
    }
  };

  // Fetch user info from backend
  const fetchUserInfo = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user._id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserInfo(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch {
      setUserInfo({});
    }
  };

  // Helper to get the correct user role with fallbacks
  const getUserRole = () => {
    // First try to get role from userInfo (backend data)
    if (userInfo.role) {
      return userInfo.role;
    }
    
    // Fallback to localStorage user data
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role) {
      return user.role;
    }
    
    // Final fallback to localStorage role
    const role = localStorage.getItem('role');
    if (role) {
      return role;
    }
    
    // Default fallback
    // No role found, using default: user
    return 'user';
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // Helper to get the correct profile image URL
  const getProfileImg = () => {
    return getProfileImageUrl(userInfo.profilePic, API_BASE, profileicon);
  };



  return (
    <>
    <div className="flex flex-row items-center justify-end ">
    <div className="relative flex flex-row items-center justify-end ">
        {/* Right side - Buttons and profile */}
        <div className="flex items-center space-x-5 ml-auto">

          {/* Notification Bell Button */}
          <button
            onClick={() => setShowNotificationCenter(!showNotificationCenter)}
            className="relative  p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Bell size={27} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* Profile Button */}
          <button
            onClick={() => setIsOpen(prev => !prev)}
            className="flex items-center z-50 space-x-2 bg-gray-300 p-2 rounded-2xl hover:bg-gray-400 transition"
          >
            <img className="w-10 h-10 rounded-full bg-gray-600" src={getProfileImg()} alt="Profile" />
            <span className="text-sm md:text-base font-medium">
              {userInfo.firstname} {userInfo.lastname}
            </span>
            <img src={dropdown} alt="Dropdown" className="w-5 h-5" />
          </button>

          {/* Profile Modal */}
          {isOpen && (
            <ProfileModal
              open={isOpen}
              onClose={() => setIsOpen(false)}
              cropModalOpen={modalIsOpen}
              openCropModal={() => setModalIsOpen(true)}
              closeCropModal={() => setModalIsOpen(false)}
              onCrop={() => fetchUserInfo()}
              userType={getUserRole()}
            />
          )}
        </div>
      </div>

      {/* Notification Center */}
      {showNotificationCenter && (
        <NotificationCenter
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClose={() => setShowNotificationCenter(false)}
          onNotificationClick={handleNotificationClick}
        />
      )}

      {/* Toast Container - Add this to your main App.jsx or here */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        className="toast-container"
      />

      {/* Custom CSS for toast styling */}
      <style>{`
        .toast-urgent {
          border-left: 4px solid #ef4444;
        }
        .toast-normal {
          border-left: 4px solid #3b82f6;
        }
        .toast-container .Toastify__toast {
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
      `}</style>

    </div>
      
    </>
  );
}