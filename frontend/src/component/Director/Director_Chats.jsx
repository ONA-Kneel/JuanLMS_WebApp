// Director_Chats.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import videocall from "../../assets/videocall.png";
import voicecall from "../../assets/voicecall.png";
import uploadfile from "../../assets/uploadfile.png";
import Director_Navbar from "./Director_Navbar";
import ProfileMenu from "../ProfileMenu";

export default function Director_Chats() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

  const storedUser = localStorage.getItem("user");
  const currentUserId = storedUser ? JSON.parse(storedUser)?._id : null;

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-screen text-xl text-red-600 font-semibold">
        Please login first to access chats.
      </div>
    );
  }

  // ===================== SOCKET.IO SETUP =====================
  useEffect(() => {
    socket.current = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.current.emit("addUser", currentUserId);

    socket.current.on("getUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.current.on("getMessage", (data) => {
      const incomingMessage = {
        senderId: data.senderId,
        receiverId: currentUserId,
        message: data.text,
        fileUrl: data.fileUrl || null,
      };

      setMessages((prev) => ({
        ...prev,
        [incomingMessage.senderId]: [
          ...(prev[incomingMessage.senderId] || []),
          incomingMessage,
        ],
      }));
    });

    return () => {
      socket.current.disconnect();
    };
  }, [currentUserId]);

  // ===================== FETCH USERS =====================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_URL}/users`);
        const otherUsers = res.data.filter((user) => user._id !== currentUserId);
        setUsers(otherUsers);

        const savedChatId = localStorage.getItem("selectedChatId_director");
        if (savedChatId) {
          const chatUser = otherUsers.find((u) => u._id === savedChatId);
          if (chatUser) setSelectedChat(chatUser);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, [currentUserId]);

  // ===================== FETCH MESSAGES =====================
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat) return;
      try {
        const res = await axios.get(`${API_URL}/messages/${currentUserId}/${selectedChat._id}`);
        setMessages((prev) => ({ ...prev, [selectedChat._id]: res.data }));
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, [selectedChat, currentUserId]);

  // Auto-scroll to bottom
  const selectedChatMessages = messages[selectedChat?._id] || [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChatMessages]);

  // ===================== HANDLER FUNCTIONS =====================

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedChat) return;

    const formData = new FormData();
    formData.append("senderId", currentUserId);
    formData.append("receiverId", selectedChat._id);
    formData.append("message", newMessage);
    if (selectedFile) {
      formData.append("file", selectedFile);
    }

    try {
      const res = await axios.post(`${API_URL}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const sentMessage = res.data;

      socket.current.emit("sendMessage", {
        senderId: currentUserId,
        receiverId: selectedChat._id,
        text: sentMessage.message,
        fileUrl: sentMessage.fileUrl || null,
      });

      setMessages((prev) => ({
        ...prev,
        [selectedChat._id]: [...(prev[selectedChat._id] || []), sentMessage],
      }));

      setNewMessage("");
      setSelectedFile(null);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      e.target.value = null;
    }
  };

  const openFilePicker = () => {
    fileInputRef.current.click();
  };

  const handleSelectChat = (user) => {
    setSelectedChat(user);
    localStorage.setItem("selectedChatId_director", user._id);
  };

  const filteredUsers = users.filter((u) =>
    `${u.firstname} ${u.lastname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ===================== RENDER =====================
  return (
    <div className="flex max-h-screen">
      <Director_Navbar />
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
          {/* LEFT PANEL - User List */}
          <div className="w-full md:w-1/3 p-4 overflow-hidden flex flex-col">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full mb-4 p-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className={`p-3 rounded-lg cursor-pointer shadow-sm transition-all ${
                    selectedChat?._id === user._id ? "bg-white" : "bg-gray-100 hover:bg-gray-300"
                  }`}
                  onClick={() => handleSelectChat(user)}
                >
                  <strong>{user.firstname} {user.lastname}</strong>
                  <p className="text-xs text-gray-600">Click to view conversation</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-px bg-black" />

          {/* RIGHT PANEL - Chat Messages */}
          <div className="w-full md:w-2/3 flex flex-col p-4 overflow-hidden">
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

                <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
                  {selectedChatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`px-4 py-2 rounded-lg text-sm max-w-xs ${
                          msg.senderId === currentUserId ? "bg-blue-900 text-white" : "bg-gray-300 text-black"
                        }`}
                      >
                        {msg.message && <p>{msg.message}</p>}
                        {msg.fileUrl && (
                          <a
                            href={`${API_URL}/${msg.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-xs block mt-1"
                          >
                            📎 {msg.fileUrl.split("-").slice(1).join("-")}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Area */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 p-2 border rounded-lg text-sm"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />

                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />

                  <img
                    src={uploadfile}
                    alt="Upload File"
                    className="w-6 h-6 cursor-pointer hover:opacity-75"
                    onClick={openFilePicker}
                  />

                  {selectedFile && (
                    <span className="text-xs text-gray-600 truncate max-w-[100px] flex items-center gap-1">
                      📎 {selectedFile.name}
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="ml-1 text-red-500 hover:text-red-700 text-xs"
                        title="Remove file"
                      >
                        ❌
                      </button>
                    </span>
                  )}

                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && !selectedFile}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      newMessage.trim() || selectedFile ? "bg-blue-900 text-white" : "bg-gray-400 text-white cursor-not-allowed"
                    }`}
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center flex-1 text-gray-500">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
