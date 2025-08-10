//VPE_Chats.jsx

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

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

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
              ? "📎 File" 
              : "Message";
          const lastMessage = prefix + text;
          
          setLastMessages(prev => ({
            ...prev,
            [incomingMessage.senderId]: lastMessage
          }));
        }
        
        return newMessages;
      });
    });

    socket.current.on("getGroupMessage", (data) => {
      const incomingGroupMessage = {
        senderId: data.senderId,
        groupId: data.groupId,
        message: data.text,
        fileUrl: data.fileUrl || null,
      };
      
      setGroupMessages((prev) => {
        const newGroupMessages = {
          ...prev,
          [incomingGroupMessage.groupId]: [
            ...(prev[incomingGroupMessage.groupId] || []),
            incomingGroupMessage,
          ],
        };
        
        // Update last message for this group
        const group = groups.find(g => g._id === incomingGroupMessage.groupId);
        if (group) {
          const sender = users.find(u => u._id === incomingGroupMessage.senderId);
          const prefix = incomingGroupMessage.senderId === currentUserId 
            ? "You: " 
            : sender 
              ? `${getUserDisplayName(sender, contactNicknames[sender._id] || null)}: ` 
              : "Unknown: ";
          const text = incomingGroupMessage.message 
            ? incomingGroupMessage.message 
            : incomingGroupMessage.fileUrl 
              ? "📎 File" 
              : "Message";
          const lastMessage = prefix + text;
          
          setLastMessages(prev => ({
            ...prev,
            [incomingGroupMessage.groupId]: lastMessage
          }));
        }
        
        return newGroupMessages;
      });
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [currentUserId, recentChats, groups, users, contactNicknames]);

  // ================= FETCH DATA =================
  useEffect(() => {
    if (!currentUserId) return;

    const fetchData = async () => {
      try {
        await Promise.all([
          fetchUsers(),
          fetchContactNicknames(),
          fetchGroups(),
          fetchMessages(),
          fetchGroupMessages(),
          fetchAllRecentMessages(),
          fetchAcademicYear(),
          fetchActiveTermForYear()
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [currentUserId]);

  // ================= FETCH USERS =================
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users/with-nicknames`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      // Support both array and paginated object
      const userArray = Array.isArray(res.data) ? res.data : res.data.users || [];
      setUsers(userArray.filter(user => user._id !== currentUserId));
    } catch (err) {
      if (err.response && err.response.status === 401) {
        window.location.href = '/';
      } else {
        console.error("Error fetching users:", err);
      }
    }
  };

  // ================= FETCH CONTACT NICKNAMES =================
  const fetchContactNicknames = async () => {
    if (!currentUserId) return;
    
    try {
      const response = await axios.get(`${API_BASE}/users/${currentUserId}/contacts/nicknames`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const nicknamesMap = {};
      response.data.forEach(item => {
        nicknamesMap[item.contactId] = item.nickname;
      });
      
      setContactNicknames(nicknamesMap);
    } catch (err) {
      console.error("Error fetching contact nicknames:", err);
    }
  };

  // ================= FETCH GROUPS =================
  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${API_BASE}/group-chats/user/${currentUserId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setGroups(res.data);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  // ================= FETCH MESSAGES =================
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_BASE}/messages/${currentUserId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const messagesMap = {};
      res.data.forEach(msg => {
        const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
        if (!messagesMap[otherUserId]) {
          messagesMap[otherUserId] = [];
        }
        messagesMap[otherUserId].push(msg);
      });
      
      setMessages(messagesMap);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  // ================= FETCH GROUP MESSAGES =================
  const fetchGroupMessages = async () => {
    try {
      const res = await axios.get(`${API_BASE}/group-chats/messages/${currentUserId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const groupMessagesMap = {};
      res.data.forEach(msg => {
        if (!groupMessagesMap[msg.groupId]) {
          groupMessagesMap[msg.groupId] = [];
        }
        groupMessagesMap[msg.groupId].push(msg);
      });
      
      setGroupMessages(groupMessagesMap);
    } catch (err) {
      console.error("Error fetching group messages:", err);
    }
  };

  // ================= SEND MESSAGE =================
  const handleSendMessage = async () => {
    if (!selectedChat || (!newMessage.trim() && !selectedFile)) return;

    try {
      let messageData = {
        senderId: currentUserId,
        receiverId: selectedChat._id,
        message: newMessage.trim(),
      };

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('senderId', currentUserId);
        formData.append('receiverId', selectedChat._id);

        const uploadRes = await axios.post(`${API_BASE}/messages/upload`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        messageData.fileUrl = uploadRes.data.fileUrl;
        messageData.message = newMessage.trim() || "📎 File";
      }

      const res = await axios.post(`${API_BASE}/messages`, messageData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      // Update local messages
      setMessages((prev) => ({
        ...prev,
        [selectedChat._id]: [
          ...(prev[selectedChat._id] || []),
          res.data,
        ],
      }));

      // Update last message
      const contactNickname = contactNicknames[selectedChat._id] || null;
      const prefix = "You: ";
      const text = messageData.message || "📎 File";
      const lastMessage = prefix + text;
      
      setLastMessages(prev => ({
        ...prev,
        [selectedChat._id]: lastMessage
      }));

      // Emit socket event
      socket.current.emit("sendMessage", {
        senderId: currentUserId,
        receiverId: selectedChat._id,
        text: messageData.message || "📎 File",
        fileUrl: messageData.fileUrl || null,
      });

      setNewMessage("");
      setSelectedFile(null);
    } catch (err) {
      console.error("Error sending message:", err);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Send Failed',
        message: err.response?.data?.error || 'Error sending message'
      });
    }
  };

  // ================= KEY DOWN HANDLER =================
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ================= FILE SELECTION =================
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current.click();
  };

  // ================= START NEW CHAT =================
  const handleStartNewChat = (user) => {
    setSelectedChat(user);
    setIsGroupChat(false);
    setSearchTerm("");
  };

  // ================= CREATE GROUP =================
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;

    try {
      const res = await axios.post(`${API_BASE}/group-chats`, {
        name: newGroupName,
        participants: [...selectedGroupMembers, currentUserId],
        createdBy: currentUserId,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setGroups((prev) => [...prev, res.data]);
      setShowCreateGroupModal(false);
      setNewGroupName("");
      setSelectedGroupMembers([]);
      setMemberSearchTerm("");
    } catch (err) {
      console.error("Error creating group:", err);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Create Failed',
        message: err.response?.data?.error || 'Error creating group'
      });
    }
  };

  // ================= JOIN GROUP =================
  const handleJoinGroup = async () => {
    if (!joinGroupCode.trim()) return;

    try {
      const res = await axios.post(`${API_BASE}/group-chats/join`, {
        groupCode: joinGroupCode,
        userId: currentUserId,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setGroups((prev) => [...prev, res.data]);
      setShowJoinGroupModal(false);
      setJoinGroupCode("");
    } catch (err) {
      console.error("Error joining group:", err);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Join Failed',
        message: err.response?.data?.error || 'Error joining group'
      });
    }
  };

  // ================= LEAVE GROUP =================
  const handleLeaveGroup = async () => {
    if (!groupToLeave) return;

    try {
      await axios.post(`${API_BASE}/group-chats/${groupToLeave._id}/leave`, {
        userId: currentUserId,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setGroups((prev) => prev.filter(g => g._id !== groupToLeave._id));
      setShowLeaveGroupModal(false);
      setGroupToLeave(null);

      if (selectedChat && selectedChat._id === groupToLeave._id) {
        setSelectedChat(null);
        setIsGroupChat(false);
      }
    } catch (err) {
      if (err.response?.data?.error === "Creator cannot leave the group") {
        setShowCreatorLeaveError(true);
      } else {
        console.error("Error leaving group:", err);
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Leave Failed',
          message: err.response?.data?.error || 'Error leaving group'
        });
      }
    }
  };

  const confirmLeaveGroup = (group) => {
    if (group.createdBy === currentUserId) {
      setShowCreatorLeaveError(true);
      return;
    }
    setGroupToLeave(group);
    setShowLeaveGroupModal(true);
  };

  // ================= FETCH RECENT MESSAGES =================
  const fetchAllRecentMessages = async () => {
    try {
      // Fetch recent messages for individual chats
      const individualRes = await axios.get(`${API_BASE}/messages/recent/${currentUserId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      // Fetch recent messages for group chats
      const groupRes = await axios.get(`${API_BASE}/group-chats/recent/${currentUserId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      // Combine and sort by timestamp
      const allChats = [
        ...individualRes.data.map(chat => ({ ...chat, isGroup: false })),
        ...groupRes.data.map(chat => ({ ...chat, isGroup: true }))
      ].sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));

      setRecentChats(allChats);
      
      // Save to localStorage
      localStorage.setItem("recentChats_vpe", JSON.stringify(allChats));

      // Update last messages
      const lastMessagesMap = {};
      allChats.forEach(chat => {
        if (chat.lastMessage) {
          const contactNickname = contactNicknames[chat._id] || null;
          const prefix = chat.lastMessage.senderId === currentUserId 
            ? "You: " 
            : chat.isGroup 
              ? `${getUserDisplayName(chat.lastMessage.sender, contactNickname)}: ` 
              : `${getUserDisplayName(chat, contactNickname)}: `;
          const text = chat.lastMessage.message || "📎 File";
          lastMessagesMap[chat._id] = prefix + text;
        }
      });
      setLastMessages(lastMessagesMap);
    } catch (err) {
      console.error("Error fetching recent messages:", err);
    }
  };

  // ================= FETCH ACADEMIC YEAR =================
  async function fetchAcademicYear() {
    try {
      const response = await axios.get(`${API_BASE}/academic-years/active`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setAcademicYear(response.data);
    } catch (error) {
      console.error("Error fetching academic year:", error);
    }
  }

  // ================= FETCH ACTIVE TERM =================
  async function fetchActiveTermForYear() {
    if (!academicYear) return;
    
    try {
      const response = await axios.get(`${API_BASE}/terms/active/${academicYear._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setCurrentTerm(response.data);
    } catch (error) {
      console.error("Error fetching active term:", error);
    }
  }

  // ================= RENDER MESSAGE =================
  const renderMessage = (message, isOwn) => (
    <div
      key={message._id}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
          isOwn
            ? "bg-blue-900 text-white"
            : "bg-gray-200 text-gray-800"
        }`}
      >
        {message.fileUrl ? (
          <div>
            <p className="text-sm mb-2">{message.message || "📎 File"}</p>
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-100 underline"
            >
              📎 View File
            </a>
          </div>
        ) : (
          <p className="text-sm">{message.message}</p>
        )}
        <p className="text-xs opacity-75 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );

  // ================= RENDER GROUP MESSAGE =================
  const renderGroupMessage = (message) => {
    const isOwn = message.senderId === currentUserId;
    const sender = users.find(u => u._id === message.senderId);
    
    return (
      <div
        key={message._id}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}
      >
        <div className={`max-w-xs lg:max-w-md ${!isOwn ? "flex items-end gap-2" : ""}`}>
          {!isOwn && (
            <div className="text-xs text-gray-600 mb-1">
              {sender ? getUserDisplayName(sender, contactNicknames[sender._id] || null) : "Unknown"}
            </div>
          )}
          <div
            className={`px-3 py-2 rounded-lg ${
              isOwn
                ? "bg-blue-900 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            {message.fileUrl ? (
              <div>
                <p className="text-sm mb-2">{message.message || "📎 File"}</p>
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-100 underline"
                >
                  📎 View File
                </a>
              </div>
            ) : (
              <p className="text-sm">{message.message}</p>
            )}
            <p className="text-xs opacity-75 mt-1">
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 1. Remove activeTab and all tab logic
  // 2. Add state for dropdown menu (showGroupMenu)
  // 3. Merge recentChats and groups into a single unified list
  const unifiedChats = [
    ...recentChats.map(chat => ({ ...chat, type: 'individual' })),
    ...groups.map(group => ({ ...group, type: 'group' }))
  ];
  // Sort by last message time (if available)
  unifiedChats.sort((a, b) => {
    const aTime = a.type === 'group' ? (groupMessages[a._id]?.slice(-1)[0]?.createdAt || 0) : (messages[a._id]?.slice(-1)[0]?.createdAt || 0);
    const bTime = b.type === 'group' ? (groupMessages[b._id]?.slice(-1)[0]?.createdAt || 0) : (messages[b._id]?.slice(-1)[0]?.createdAt || 0);
    return new Date(bTime) - new Date(aTime);
  });
  // Enhanced search that includes all users and existing chats
  const searchResults = searchTerm.trim() === '' ? [] : [
    // First show existing chats/groups that match
    ...unifiedChats.filter(chat => {
      if (chat.type === 'individual') {
        const contactNickname = contactNicknames[chat._id] || null;
        return (
          getUserDisplayName(chat, contactNickname)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (chat.nickname && chat.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      } else {
        return chat.name?.toLowerCase().includes(searchTerm.toLowerCase());
      }
    }),
    // Then show users not in recent chats that match
    ...users
      .filter(user => user._id !== currentUserId)
      .filter(user => !recentChats.some(chat => chat._id === user._id))
      .filter(user =>
        getUserDisplayName(user, contactNicknames[user._id] || null)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.nickname && user.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .map(user => ({ ...user, type: 'new_user', isNewUser: true }))
  ];



  // ================= RENDER CHAT AREA =================
  const renderChatArea = () => (
    <div className="flex-1 flex flex-col bg-gray-50">
      {selectedChat ? (
        <>
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                  {isGroupChat ? "👥" : "👤"}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {isGroupChat ? selectedChat.name : getUserDisplayName(selectedChat, contactNicknames[selectedChat._id] || null)}
                  </h3>
                  {isGroupChat && (
                    <p className="text-sm text-gray-500">
                      {selectedChat.participants?.length || 0} members
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isGroupChat && (
                  <button
                    onClick={() => setShowMembersModal(true)}
                    className="text-gray-400 hover:text-gray-600"
                    title="View Members"
                  >
                    👥
                  </button>
                )}
                <ContactNicknameManager
                  contactId={selectedChat._id}
                  currentNickname={contactNicknames[selectedChat._id] || ""}
                  onNicknameChange={(newNickname) => {
                    setContactNicknames(prev => ({
                      ...prev,
                      [selectedChat._id]: newNickname
                    }));
                  }}
                />
                <ProfileMenu />
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isGroupChat ? (
              // Group messages
              (groupMessages[selectedChat._id] || []).map((message) =>
                renderGroupMessage(message)
              )
            ) : (
              // Individual messages
              (messages[selectedChat._id] || []).map((message) =>
                renderMessage(message, message.senderId === currentUserId)
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <h3 className="text-xl font-semibold mb-2">Select a chat to start!</h3>
            <p className="text-sm">Choose a conversation from the left panel to begin messaging.</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen h-screen max-h-screen">
      <VPE_Navbar />
      <div className="flex-1 flex flex-col bg-gray-100 font-poppinsr overflow-hidden md:ml-64 h-full min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-center px-10 py-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Chats</h2>
            <p className="text-base md:text-lg">
              <span> </span>{academicYear ? `${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              <span> </span>{currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
              <span> </span>{new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <ProfileMenu />
        </div>

        <div className="flex flex-1 overflow-hidden h-full">
          {/* LEFT PANEL */}
          <div className="w-full md:w-1/3 p-4 overflow-hidden flex flex-col h-full">
            {/* Header and Plus Icon */}
            <div className="flex items-center justify-between mb-4">
              <input
                type="text"
                placeholder="Search users or groups..."
                className="flex-1 p-2 border rounded-lg text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="relative ml-2">
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-900 text-white hover:bg-blue-800 focus:outline-none"
                  onClick={() => setShowGroupMenu((prev) => !prev)}
                  title="Group Actions"
                >
                  <span className="text-2xl leading-none">+</span>
                </button>
                {showGroupMenu && (
                  <div className="absolute right-0 mt-2 w-36 bg-white border rounded-lg shadow-lg z-10">
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      onClick={() => { setShowCreateGroupModal(true); setShowGroupMenu(false); }}
                    >
                      Create Group
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      onClick={() => { setShowJoinGroupModal(true); setShowGroupMenu(false); }}
                    >
                      Join Group
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Unified Chat List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {searchTerm.trim() === '' ? (
                // Show normal chat list when not searching
                unifiedChats.length > 0 ? (
                  unifiedChats.map((chat) => (
                    <div
                      key={chat._id}
                      className={`group relative flex items-center p-3 rounded-lg cursor-pointer shadow-sm transition-all ${
                        selectedChat?._id === chat._id && ((isGroupChat && chat.type === 'group') || (!isGroupChat && chat.type === 'individual')) ? "bg-white" : "bg-gray-100 hover:bg-gray-300"
                      }`}
                      onClick={() => {
                        if (chat.type === 'group') {
                          setSelectedChat(chat);
                          setIsGroupChat(true);
                          localStorage.setItem("selectedChatId_vpe", chat._id);
                        } else {
                          setSelectedChat(chat);
                          setIsGroupChat(false);
                          localStorage.setItem("selectedChatId_vpe", chat._id);
                        }
                      }}
                    >
                      {chat.type === 'group' ? (
                        <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold">
                          👥
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-bold">
                          👤
                        </div>
                      )}
                      <div className="flex-1 ml-3 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {chat.type === 'group' ? chat.name : getUserDisplayName(chat, contactNicknames[chat._id] || null)}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {lastMessages[chat._id] || "No messages yet"}
                        </p>
                      </div>
                      {chat.type === 'group' && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowGroupMenu(prev => prev === chat._id ? null : chat._id);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            ⋮
                          </button>
                          {showGroupMenu === chat._id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMembersModal(true);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                View Members
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmLeaveGroup(chat);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                              >
                                Leave Group
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No chats yet</p>
                    <p className="text-sm">Start a conversation!</p>
                  </div>
                )
              ) : (
                // Show search results
                searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <div
                      key={result._id}
                      className="group relative flex items-center p-3 rounded-lg cursor-pointer shadow-sm transition-all bg-gray-100 hover:bg-gray-300"
                      onClick={() => {
                        if (result.type === 'new_user') {
                          handleStartNewChat(result);
                        } else if (result.type === 'group') {
                          setSelectedChat(result);
                          setIsGroupChat(true);
                          localStorage.setItem("selectedChatId_vpe", result._id);
                        } else {
                          setSelectedChat(result);
                          setIsGroupChat(false);
                          localStorage.setItem("selectedChatId_vpe", result._id);
                        }
                      }}
                    >
                      {result.type === 'group' ? (
                        <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold">
                          👥
                        </div>
                      ) : result.type === 'new_user' ? (
                        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                          ➕
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-bold">
                          👤
                        </div>
                      )}
                      <div className="flex-1 ml-3 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {result.type === 'group' ? result.name : getUserDisplayName(result, contactNicknames[result._id] || null)}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {result.type === 'new_user' ? 'Click to start chat' : (lastMessages[result._id] || "No messages yet")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No results found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 flex flex-col">
            {renderChatArea()}
          </div>
        </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Group</h3>
            <input
              type="text"
              placeholder="Group name"
              className="w-full p-2 border rounded-lg mb-4"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            {/* Member search box */}
            <input
              type="text"
              placeholder="Search users by name..."
              className="w-full p-2 border rounded-lg mb-2"
              value={memberSearchTerm}
              onChange={e => setMemberSearchTerm(e.target.value)}
            />
            {/* Selected members chips/list */}
            {selectedGroupMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedGroupMembers.map(userId => {
                  const user = users.find(u => u._id === userId);
                  if (!user) return null;
                  return (
                    <span key={userId} className="flex items-center bg-blue-100 text-blue-900 px-2 py-1 rounded-full text-xs">
                      {getUserDisplayName(user, contactNicknames[user._id] || null)}
                      <button
                        className="ml-1 text-red-500 hover:text-red-700"
                        onClick={() => setSelectedGroupMembers(prev => prev.filter(id => id !== userId))}
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {/* Filtered user list: only show if search term is entered */}
            {memberSearchTerm.trim() !== "" && (
              <div className="max-h-40 overflow-y-auto mb-4 border border-gray-200 rounded-lg">
                {users
                  .filter(user => user._id !== currentUserId)
                  .filter(user =>
                    getUserDisplayName(user, contactNicknames[user._id] || null)?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                    (user.nickname && user.nickname.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                  )
                  .filter(user => !selectedGroupMembers.includes(user._id))
                  .length === 0 ? (
                  <div className="text-gray-400 text-center p-2 text-xs">No users found</div>
                ) : (
                  users
                    .filter(user => user._id !== currentUserId)
                    .filter(user =>
                      getUserDisplayName(user, contactNicknames[user._id] || null)?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                      (user.nickname && user.nickname.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                    )
                    .filter(user => !selectedGroupMembers.includes(user._id))
                    .map(user => (
                      <div
                        key={user._id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => {
                          setSelectedGroupMembers(prev => [...prev, user._id]);
                          setMemberSearchTerm("");
                        }}
                      >
                        <span className="text-sm">{getUserDisplayName(user, contactNicknames[user._id] || null)}</span>
                      </div>
                    ))
                )
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  newGroupName.trim() && selectedGroupMembers.length > 0
                    ? "bg-blue-900 text-white"
                    : "bg-gray-400 text-white cursor-not-allowed"
                }`}
              >
                Create Group
              </button>
              <button
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupName("");
                  setSelectedGroupMembers([]);
                  setMemberSearchTerm("");
                }}
                className="flex-1 py-2 rounded-lg text-sm bg-gray-300 text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Join Group</h3>
            <input
              type="text"
              placeholder="Enter group code"
              className="w-full p-2 border rounded-lg mb-4"
              value={joinGroupCode}
              onChange={(e) => setJoinGroupCode(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleJoinGroup}
                disabled={!joinGroupCode.trim()}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  joinGroupCode.trim()
                    ? "bg-green-600 text-white"
                    : "bg-gray-400 text-white cursor-not-allowed"
                }`}
              >
                Join Group
              </button>
              <button
                onClick={() => {
                  setShowJoinGroupModal(false);
                  setJoinGroupCode("");
                }}
                className="flex-1 py-2 rounded-lg text-sm bg-gray-300 text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Confirmation Modal */}
      {showLeaveGroupModal && groupToLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Leave Group</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to leave <strong>"{groupToLeave.name}"</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You will no longer be able to send or receive messages in this group.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleLeaveGroup}
                className="flex-1 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600"
              >
                Leave Group
              </button>
              <button
                onClick={() => {
                  setShowLeaveGroupModal(false);
                  setGroupToLeave(null);
                }}
                className="flex-1 py-2 rounded-lg text-sm bg-gray-300 text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creator Leave Error Modal */}
      {showCreatorLeaveError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Action Not Allowed</h3>
            <p className="text-gray-600 mb-6">
              The creator of the group cannot leave the group chat.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreatorLeaveError(false)}
                className="flex-1 py-2 rounded-lg text-sm bg-blue-900 text-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Group Members</h3>
            <ul className="mb-4 max-h-60 overflow-y-auto divide-y">
              {(selectedChat?.participants || []).map(userId => {
                const user = users.find(u => u._id === userId);
                if (!user) return null;
                const isCreator = selectedChat?.createdBy === userId;
                return (
                  <li key={userId} className="flex items-center justify-between py-2">
                    <span>{getUserDisplayName(user, contactNicknames[user._id] || null)} {isCreator && <span className="text-xs text-blue-700">(Creator)</span>}</span>
                    {selectedChat?.createdBy === currentUserId && !isCreator && (
                      <button
                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-300 rounded"
                        onClick={() => { setMemberToRemove(user); setShowRemoveConfirm(true); }}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMembersModal(false)}
                className="flex-1 py-2 rounded-lg text-sm bg-blue-900 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveConfirm && memberToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Remove Member</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{memberToRemove.lastname}, {memberToRemove.firstname}</strong> from the group?
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await axios.post(`${API_BASE}/group-chats/${selectedChat._id}/remove-member`, {
                      userId: currentUserId,
                      memberId: memberToRemove._id,
                    });
                    // Remove from UI
                    setGroups(prev => prev.map(g => g._id === selectedChat._id ? { ...g, participants: g.participants.filter(id => id !== memberToRemove._id) } : g));
                    setShowRemoveConfirm(false);
                    setMemberToRemove(null);
                  } catch (err) {
                    setValidationModal({
                      isOpen: true,
                      type: 'error',
                      title: 'Remove Failed',
                      message: err.response?.data?.error || 'Error removing member'
                    });
                  }
                }}
                className="flex-1 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600"
              >
                Remove
              </button>
              <button
                onClick={() => { setShowRemoveConfirm(false); setMemberToRemove(null); }}
                className="flex-1 py-2 rounded-lg text-sm bg-gray-300 text-gray-700"
              >
                Cancel
              </button>
            </div>
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
