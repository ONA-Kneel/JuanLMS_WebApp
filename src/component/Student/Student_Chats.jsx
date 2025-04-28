import { useState } from "react";
import dropdown from "../../../src/assets/dropdown.png";
import videocall from "../../../src/assets/videocall.png";
import voicecall from "../../../src/assets/voicecall.png";
import uploadfile from "../../../src/assets/uploadfile.png";
import uploadpicture from "../../../src/assets/uploadpicture.png";
import profileicon from "../../../src/assets/profileicon (1).svg"; 
import Student_Navbar from "./Student_Navbar";
import ProfileModal from "../ProfileModal";
import { useNavigate } from "react-router-dom";

export default function Student_Chats() {
  const [selectedChat, setSelectedChat] = useState("Chat 1");
  const [isOpen, setisOpen] = useState(false);
  const [im, setim] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const navigate = useNavigate();

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => setModalIsOpen(false);

  const chatData = {
    "Chat 1": ["pasend code"],
    "Chat 2": ["may gawa ka na?"],
  };

  return (
    <div className="flex min-h-screen">
      <Student_Navbar />

      <div className="flex-1 flex flex-col bg-gray-100 font-poppinsr overflow-hidden">

        <div className="flex flex-col md:flex-row justify-between items-center px-10 py-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Chats</h2>
            <p className="text-base md:text-lg">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div>
            <button
              onClick={() => setisOpen((prev) => !prev)}
              className="flex items-center space-x-2 bg-gray-300 p-2 rounded-2xl hover:bg-gray-400 transition z-40 relative"
            >
              <img
                className="w-10 h-10 rounded-full bg-gray-600"
                src={im ? im : profileicon}
                alt="Profile"
              />
              <span className="text-sm md:text-base font-medium">Doe, John</span>
              <img src={dropdown} alt="Dropdown" className="w-5 h-5" />
            </button>

            {isOpen && (
              <div className="absolute right-10 mt-2 z-50">
                <ProfileModal
                  open={isOpen}
                  onClose={() => navigate("/")}
                  avatarImg={im || profileicon}
                  name="Doe, John"
                  email="doejohn@sjdfdef.edu.ph"
                  phone="09"
                  cropModalOpen={modalIsOpen}
                  openCropModal={openModal}
                  closeCropModal={closeModal}
                  onCrop={(i) => setim(i)}
                  userType="student"
                />
              </div>
            )}
          </div>
        </div>


        <div className="flex flex-1 overflow-hidden">

          <div className="w-1/3 p-4 overflow-y-auto">
            {Object.keys(chatData).map((chatName) => (
              <div
                key={chatName}
                className={`p-3 rounded-lg mb-3 cursor-pointer shadow-sm transition-all ${
                  selectedChat === chatName
                    ? "bg-white"
                    : "bg-gray-100 hover:bg-gray-300"
                }`}
                onClick={() => setSelectedChat(chatName)}
              >
                <strong>{chatName}</strong>
                <p className="text-xs text-gray-600">
                  You: {chatData[chatName][0]}
                </p>
              </div>
            ))}
          </div>
          <div className="w-px bg-black" />

          <div className="w-3/3 flex flex-col justify-between p-4">

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{selectedChat}</h3>
              <div className="flex space-x-3">
                <img
                  src={videocall}
                  alt="Video Call"
                  className="w- h-6 cursor-pointer hover:opacity-75"
                />
                <img
                  src={voicecall}
                  alt="Voice Call"
                  className="w- h-6 cursor-pointer hover:opacity-75"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              {chatData[selectedChat].map((message, index) => (
                <div key={index} className="flex justify-end">
                  <div className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm">
                    {message}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 p-2 border rounded-lg text-sm"
              />
              <img
                src={uploadfile}
                alt="Upload File"
                className="w-6 h-6 cursor-pointer hover:opacity-75"
              />
              <img
                src={uploadpicture}
                alt="Upload Picture"
                className="w-6 h-6 cursor-pointer hover:opacity-75"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
