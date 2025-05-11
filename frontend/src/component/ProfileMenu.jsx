// profileMenu
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import profileicon from "../assets/profileicon (1).svg";
import dropdown from "../assets/dropdown.png";
import ProfileModal from "./ProfileModal";

export default function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user'));
  const [im, setim] = useState(user?.profilePic || null);


  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center space-x-2 bg-gray-300 p-2 rounded-2xl hover:bg-gray-400 transition"
      >
        <img className="w-10 h-10 rounded-full bg-gray-600" src={im || profileicon} />
        <span className="text-sm md:text-base font-medium">{user?.name}</span>
        <img src={dropdown} alt="Dropdown" className="w-5 h-5" />
      </button>

      {isOpen && (
        <ProfileModal
          open={isOpen}
          onClose={() => {
            setIsOpen(false);
            navigate("/");  // Or logout or dashboard etc
          }}
          avatarImg={im || profileicon}
          name={user?.name}
          email={user?.email}
          phone={user?.phone}
          cropModalOpen={modalIsOpen}
          openCropModal={() => setModalIsOpen(true)}
          closeCropModal={() => setModalIsOpen(false)}
          onCrop={(newImgUrl) => {
            setim(newImgUrl);
            const user = JSON.parse(localStorage.getItem('user'));
            const updatedUser = { ...user, profilePic: newImgUrl };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }}          
          userType={user?.role}
        />
      )}
    </div>
  );
}
