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

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
    console.log('Notification clicked:', notification);
    
    // Close notification center
    setShowNotificationCenter(false);
    
    // Get user role for proper navigation
    const userRole = userInfo.role || localStorage.getItem('role');
    const isFaculty = userRole === 'faculty';
    const isStudent = userRole === 'students';
    const isAdmin = userRole === 'admin';
    const isPrincipal = userRole === 'principal';
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'announcement':
        // Navigate to the class where the announcement was posted
        if (notification.classID && notification.classID !== 'direct_message') {
          if (isFaculty) {
            navigate(`/faculty_class/${notification.classID}`);
          } else if (isStudent) {
            navigate(`/student_class/${notification.classID}`);
          }
        }
        break;
        
      case 'assignment':
        // Navigate to the class where the assignment was posted
        if (notification.classID && notification.classID !== 'direct_message') {
          if (isFaculty) {
            navigate(`/faculty_class/${notification.classID}`);
          } else if (isStudent) {
            navigate(`/student_class/${notification.classID}`);
          }
        }
        break;
        
      case 'quiz':
        // Navigate to the class where the quiz was posted
        if (notification.classID && notification.classID !== 'direct_message') {
          if (isFaculty) {
            navigate(`/faculty_class/${notification.classID}`);
          } else if (isStudent) {
            navigate(`/student_class/${notification.classID}`);
          }
        }
        break;
        
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
        console.log('Unknown notification type:', notification.type);
    }
  };

  // Fetch user info from backend
  const fetchUserInfo = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user._id) return;
    try {
      const res = await axios.get(`${API_BASE}/users/${user._id}`);
      setUserInfo(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch {
      setUserInfo({});
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // Helper to get the correct profile image URL
  const getProfileImg = () => {
    if (userInfo.profilePic) {
      return `${API_BASE}/uploads/${userInfo.profilePic}`;
    }
    return profileicon;
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
              userType={userInfo.role}
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