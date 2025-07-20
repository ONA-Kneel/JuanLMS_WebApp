// profileMenu
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import profileicon from "../assets/profileicon (1).svg";
import dropdown from "../assets/dropdown.png";
import ProfileModal from "./ProfileModal";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const navigate = useNavigate();

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
    // eslint-disable-next-line
  }, []);

  // Helper to get the correct profile image URL
  const getProfileImg = () => {
    if (userInfo.profilePic) {
      return `${API_BASE}/uploads/${userInfo.profilePic}`;
    }
    return profileicon;
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center space-x-2 bg-gray-300 p-2 rounded-2xl hover:bg-gray-400 transition"
      >
        <img className="w-10 h-10 rounded-full bg-gray-600" src={getProfileImg()} alt="Profile" />
        <span className="text-sm md:text-base font-medium">
          {userInfo.firstname} {userInfo.lastname}
        </span>
        <img src={dropdown} alt="Dropdown" className="w-5 h-5" />
      </button>

      {isOpen && (
        <ProfileModal
          open={isOpen}
          onClose={() => {
            setIsOpen(false);
            // navigate("/");
          }}
          cropModalOpen={modalIsOpen}
          openCropModal={() => setModalIsOpen(true)}
          closeCropModal={() => setModalIsOpen(false)}
          onCrop={() => {
            fetchUserInfo();
          }}
          userType={userInfo.role}
        />
      )}
    </div>
  );
}
