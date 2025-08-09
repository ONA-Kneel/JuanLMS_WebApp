import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import uploadfile from "../../assets/uploadfile.png";
import VPE_Navbar from "./VPE_Navbar";
import ProfileMenu from "../ProfileMenu";
import defaultAvatar from "../../assets/profileicon (1).svg";
import ValidationModal from "../ValidationModal";
import ContactNicknameManager from "../ContactNicknameManager";
import GroupNicknameManager from "../GroupNicknameManager";
import { getUserDisplayName } from "../../utils/userDisplayUtils";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function VPE_Chats() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [recentChats, setRecentChats] = useState(() => {
    // Load from localStorage if available
    const stored = localStorage.getItem("recentChats_vpe");
    return stored ? JSON.parse(stored) : [];
  });
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [contactNicknames, setContactNicknames] = useState({});

  // Group chat states
  const [groups, setGroups] = useState([]);
  const [groupMessages, setGroupMessages] = useState({});
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [joinGroupCode, setJoinGroupCode] = useState("");
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);
  const [groupToLeave, setGroupToLeave] = useState(null);
  const [showCreatorLeaveError, setShowCreatorLeaveError] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: "",
    title: "",
    message: "",
  });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socket = useRef();

  const currentUserId = JSON.parse(localStorage.getItem("user"))?._id;

  // ================= SOCKET CONNECTION =================
  useEffect(() => {
    if (!currentUserId) return;

    socket.current = io(API_BASE);
    socket.current.emit("addUser", currentUserId);

    socket.current.on("getUsers", () => {
      // Users are handled separately
    });

    socket.current.on("getMessage", (data) => {
      const incomingMessage = {
        senderId: data.senderId,
        receiverId: currentUserId,
        message: data.text,
        fileUrl: data.fileUrl || null,
      };
      setMessages((prev) => {
        const newMessages = {
          ...prev,
          [incomingMessage.senderId]: [
            ...(prev[incomingMessage.senderId] || []),
            incomingMessage,
          ],
        };
        
        // Update last message for this chat
        const chat = recentChats.find(c => c._id === incomingMessage.senderId);
        if (chat) {
          const contactNickname = contactNicknames[chat._id] || null;
          const prefix = incomingMessage.senderId === currentUserId 
            ? "You: " 
            : `${getUserDisplayName(chat, contactNickname)}: `;
          const text = incomingMessage.message 
            ? incomingMessage.message 
            : incomingMessage.fileUrl 
            ? "Sent a file" 
            : "";
          const lastMessage = prefix + text;
          
          setLastMessages(prev => ({
            ...prev,
            [incomingMessage.senderId]: lastMessage
          }));
        }
        
        return newMessages;
      });
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [currentUserId, recentChats, contactNicknames]);

  // ================= FETCH DATA =================
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUserId) return;

      const fetchUsers = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(`${API_BASE}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUsers(response.data.filter(user => user._id !== currentUserId));
        } catch (error) {
          console.error("Failed to fetch users:", error);
        }
      };

      const fetchContactNicknames = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(`${API_BASE}/api/contact-nicknames`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const nicknames = {};
          response.data.forEach(nickname => {
            nicknames[nickname.contactId] = nickname.nickname;
          });
          setContactNicknames(nicknames);
        } catch (error) {
          console.error("Failed to fetch contact nicknames:", error);
        }
      };

      const fetchGroups = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(`${API_BASE}/api/groups/user/${currentUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setGroups(response.data);
        } catch (error) {
          console.error("Failed to fetch groups:", error);
        }
      };

      const fetchMessages = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(`${API_BASE}/api/messages/${currentUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const messagesByUser = {};
          response.data.forEach(message => {
            const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
            if (!messagesByUser[otherUserId]) {
              messagesByUser[otherUserId] = [];
            }
            messagesByUser[otherUserId].push(message);
          });
          setMessages(messagesByUser);
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      };

      const fetchGroupMessages = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(`${API_BASE}/api/group-messages/user/${currentUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const messagesByGroup = {};
          response.data.forEach(message => {
            if (!messagesByGroup[message.groupId]) {
              messagesByGroup[message.groupId] = [];
            }
            messagesByGroup[message.groupId].push(message);
          });
          setGroupMessages(messagesByGroup);
        } catch (error) {
          console.error("Failed to fetch group messages:", error);
        }
      };

      await Promise.all([
        fetchUsers(),
        fetchContactNicknames(),
        fetchGroups(),
        fetchMessages(),
        fetchGroupMessages()
      ]);
    };

    fetchData();
  }, [currentUserId]);

  // ================= ACADEMIC YEAR & TERM =================
  useEffect(() => {
    async function fetchAcademicYear() {
      try {
        const token = localStorage.getItem("token");
        const yearRes = await fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (yearRes.ok) {
          const year = await yearRes.json();
          setAcademicYear(year);
        }
      } catch (err) {
        console.error("Failed to fetch academic year", err);
      }
    }
    fetchAcademicYear();
  }, []);

  useEffect(() => {
    async function fetchActiveTermForYear() {
      if (!academicYear) return;
      try {
        const schoolYearName = `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}`;
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/terms/schoolyear/${schoolYearName}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const terms = await res.json();
          const active = terms.find(term => term.status === 'active');
          setCurrentTerm(active || null);
        } else {
          setCurrentTerm(null);
        }
      } catch {
        setCurrentTerm(null);
      }
    }
    fetchActiveTermForYear();
  }, [academicYear]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    try {
      const token = localStorage.getItem("token");
      let fileUrl = null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadResponse = await axios.post(`${API_BASE}/api/upload`, formData, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        fileUrl = uploadResponse.data.fileUrl;
      }

      const messageData = {
        senderId: currentUserId,
        receiverId: selectedChat._id,
        message: newMessage.trim(),
        fileUrl: fileUrl,
      };

      const response = await axios.post(`${API_BASE}/api/messages`, messageData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newMsg = response.data;
      setMessages(prev => ({
        ...prev,
        [selectedChat._id]: [...(prev[selectedChat._id] || []), newMsg]
      }));

      if (socket.current) {
        socket.current.emit("sendMessage", newMsg);
      }

      setNewMessage("");
      setSelectedFile(null);
      
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      <VPE_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">VPE Chats</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              {currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
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

        <div className="bg-white rounded-lg shadow-md h-[calc(100vh-200px)] flex">
          {/* Chat List */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {recentChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No recent chats
                </div>
              ) : (
                recentChats.map((chat) => (
                  <div
                    key={chat._id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedChat?._id === chat._id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={chat.profilePicture || defaultAvatar}
                        alt="Profile"
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {getUserDisplayName(chat, contactNicknames[chat._id])}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {lastMessages[chat._id] || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedChat.profilePicture || defaultAvatar}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {getUserDisplayName(selectedChat, contactNicknames[selectedChat._id])}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages[selectedChat._id]?.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.senderId === currentUserId ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === currentUserId
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-900"
                        }`}
                      >
                        {message.message && <p>{message.message}</p>}
                        {message.fileUrl && (
                          <a
                            href={message.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View File
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={openFilePicker}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      <img src={uploadfile} alt="Upload" className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Send
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile && (
                    <div className="mt-2 text-sm text-gray-600">
                      Selected file: {selectedFile.name}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
