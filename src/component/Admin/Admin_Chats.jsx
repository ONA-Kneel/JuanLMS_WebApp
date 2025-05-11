import { useState, useEffect, useRef } from "react";
import axios from "axios";
import videocall from "../../../src/assets/videocall.png";
import voicecall from "../../../src/assets/voicecall.png";
import uploadfile from "../../../src/assets/uploadfile.png";
// import uploadpicture from "../../../src/assets/uploadpicture.png";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";

export default function Admin_Chats() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");

  //files
  const [selectedFile, setSelectedFile] = useState(null);

  const currentUserId = JSON.parse(localStorage.getItem("user"))?.id;

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await axios.get("http://localhost:5000/users");
      setUsers(res.data.filter(user => user._id !== currentUserId));
    };
    fetchUsers();
  }, [currentUserId]);

  const messagesEndRef = useRef(null);

  const selectedChatMessages = messages[selectedChat?._id];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChatMessages]);
  ; // scroll whenever messages change

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    const msgObj = {
      senderId: currentUserId,
      receiverId: selectedChat._id,
      message: newMessage,
    };

    await axios.post("http://localhost:5000/messages", msgObj);

    setMessages((prev) => ({
      ...prev,
      [selectedChat._id]: [...(prev[selectedChat._id] || []), msgObj],
    }));

    setNewMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {  // Prevents sending on Shift+Enter
      e.preventDefault();  // Prevent default "newline"
      handleSendMessage();
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat) return;
      const res = await axios.get(
        `http://localhost:5000/messages/${currentUserId}/${selectedChat._id}`
      );
      setMessages((prev) => ({ ...prev, [selectedChat._id]: res.data }));
    };
    fetchMessages();
  }, [selectedChat, currentUserId]);

  const filteredUsers = users.filter((u) =>
    `${u.firstname} ${u.lastname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fileInputRef = useRef(null);
  // 

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      alert(`Selected file: ${file.name}`); // You can remove alert and upload directly if you want!
    }
  };

  const openFilePicker = () => {
    fileInputRef.current.click();
  };



  return (
    <div className="flex max-h-screen">
      <Admin_Navbar />
      <div className="flex-1 flex flex-col bg-gray-100 font-poppinsr overflow-hidden md:ml-64">
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
          <ProfileMenu />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 p-4 overflow-y-auto">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full mb-4 p-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                className={`p-3 rounded-lg mb-3 cursor-pointer shadow-sm transition-all ${selectedChat?._id === user._id
                  ? "bg-white"
                  : "bg-gray-100 hover:bg-gray-300"
                  }`}
                onClick={() => setSelectedChat(user)}
              >
                <strong>{user.firstname} {user.lastname}</strong>
                <p className="text-xs text-gray-600">Click to view conversation</p>
              </div>
            ))}
          </div>

          <div className="w-px bg-black" />

          <div className="w-2/3 flex flex-col justify-between p-4">
            {selectedChat ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    {selectedChat.firstname} {selectedChat.lastname}
                  </h3>
                  <div className="flex space-x-3">
                    <img src={videocall} alt="Video Call" className="w-6 h-6 cursor-pointer hover:opacity-75" />
                    <img src={voicecall} alt="Voice Call" className="w-6 h-6 cursor-pointer hover:opacity-75" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  {(messages[selectedChat._id] || []).map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`px-4 py-2 rounded-lg text-sm max-w-xs ${msg.senderId === currentUserId
                          ? "bg-blue-900 text-white"
                          : "bg-gray-300 text-black"
                          }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 p-2 border rounded-lg text-sm"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <img
                    src={uploadfile}
                    alt="Upload File"
                    className="w-6 h-6 cursor-pointer hover:opacity-75"
                    onClick={openFilePicker}
                  />

                  {/* <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleImageSelect}
                  />
                  <img
                    src={uploadpicture}
                    alt="Upload Picture"
                    className="w-6 h-6 cursor-pointer hover:opacity-75"
                    onClick={openCamera}
                  /> */}

                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className={`px-4 py-2 rounded-lg text-sm ${newMessage.trim() ? 'bg-blue-900 text-white' : 'bg-gray-400 text-white cursor-not-allowed'
                      }`}
                  >
                    Send
                  </button>

                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}