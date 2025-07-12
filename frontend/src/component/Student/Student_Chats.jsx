// Admin_Chats.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import uploadfile from "../../assets/uploadfile.png";
import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";
import defaultAvatar from "../../assets/profileicon (1).svg";
import { useNavigate } from "react-router-dom";

export default function Student_Chats() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [recentChats] = useState(() => {
    // Load from localStorage if available
    const stored = localStorage.getItem("recentChats_student");
    return stored ? JSON.parse(stored) : [];
  });
  const [lastMessage, setLastMessage] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

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

  // Add state for member search
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

  const storedUser = localStorage.getItem("user");
  const currentUserId = storedUser ? JSON.parse(storedUser)?._id : null;

  useEffect(() => {
    if (!currentUserId) {
      navigate("/", { replace: true });
    }
  }, [currentUserId, navigate]);

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

  // ================= SOCKET.IO SETUP =================
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
          const prefix = incomingMessage.senderId === currentUserId 
            ? "You: " 
            : `${chat.lastname}, ${chat.firstname}: `;
          const text = incomingMessage.message 
            ? incomingMessage.message 
            : (incomingMessage.fileUrl ? "File sent" : "");
          setLastMessages(prev => ({
            ...prev,
            [chat._id]: { prefix, text }
          }));
        }
        
        return newMessages;
      });
    });

    // Group chat socket events
    socket.current.on("groupMessage", (data) => {
      const incomingGroupMessage = {
        senderId: data.senderId,
        groupId: data.groupId,
        message: data.text,
        fileUrl: data.fileUrl || null,
        senderName: data.senderName,
        timestamp: new Date(),
      };

      setGroupMessages((prev) => ({
        ...prev,
        [data.groupId]: [...(prev[data.groupId] || []), incomingGroupMessage],
      }));
    });

    socket.current.on("groupCreated", (group) => {
      setGroups((prev) => [...prev, group]);
      setShowCreateGroupModal(false);
      setNewGroupName("");
      setSelectedGroupMembers([]);
    });

    socket.current.on("groupJoined", (group) => {
      setGroups((prev) => [...prev, group]);
      setShowJoinGroupModal(false);
      setJoinGroupCode("");
    });

    return () => {
      socket.current.disconnect();
    };
  }, [currentUserId, recentChats]);

  // ================= FETCH USERS =================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/users`);
        // Support both array and paginated object
        const userArray = Array.isArray(res.data) ? res.data : res.data.users || [];
        setUsers(userArray);
        setSelectedChat(null);
        localStorage.removeItem("selectedChatId_student");
      } catch (err) {
        if (err.response && err.response.status === 401) {
          window.location.href = '/';
        } else {
          console.error("Error fetching users:", err);
        }
      }
    };
    fetchUsers();
  }, [currentUserId]);

  // ================= FETCH GROUPS =================
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get(`${API_BASE}/group-chats/user/${currentUserId}`);
        setGroups(res.data);
      } catch (err) {
        console.error("Error fetching groups:", err);
      }
    };
    fetchGroups();
  }, [currentUserId]);

  // ================= FETCH MESSAGES =================
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat) return;
      try {
        const res = await axios.get(`${API_BASE}/messages/${currentUserId}/${selectedChat._id}`);
        setMessages((prev) => {
          const newMessages = { ...prev, [selectedChat._id]: res.data };
          
          // Compute last messages for all recent chats
          const newLastMessages = {};
          recentChats.forEach(chat => {
            const chatMessages = newMessages[chat._id] || [];
            const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
            if (lastMsg) {
              const prefix = lastMsg.senderId === currentUserId 
                ? "You: " 
                : `${chat.lastname}, ${chat.firstname}: `;
              const text = lastMsg.message 
                ? lastMsg.message 
                : (lastMsg.fileUrl ? "File sent" : "");
              newLastMessages[chat._id] = { prefix, text };
            }
          });
          setLastMessages(newLastMessages);
          
          return newMessages;
        });
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, [selectedChat, currentUserId, recentChats]);

  // ================= FETCH GROUP MESSAGES =================
  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (!selectedChat || !isGroupChat) return;
      try {
        const res = await axios.get(`${API_BASE}/group-chats/${selectedChat._id}/messages`);
        setGroupMessages((prev) => ({
          ...prev,
          [selectedChat._id]: res.data,
        }));
      } catch (err) {
        console.error("Error fetching group messages:", err);
      }
    };

    fetchGroupMessages();
  }, [selectedChat, isGroupChat]);

  // Auto-scroll
  const selectedChatMessages = isGroupChat 
    ? (groupMessages[selectedChat?._id] || [])
    : (messages[selectedChat?._id] || []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChatMessages]);

  // ================= HANDLERS =================

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedChat) return;

    if (isGroupChat) {
      // Send group message
      const formData = new FormData();
      formData.append("senderId", currentUserId);
      formData.append("groupId", selectedChat._id);
      formData.append("message", newMessage);
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      try {
        const res = await axios.post(`${API_BASE}/group-chats/messages`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const sentMessage = res.data;

        socket.current.emit("sendGroupMessage", {
          senderId: currentUserId,
          groupId: selectedChat._id,
          text: sentMessage.message,
          fileUrl: sentMessage.fileUrl || null,
          senderName: storedUser ? JSON.parse(storedUser).firstname + " " + JSON.parse(storedUser).lastname : "Unknown",
        });

        setGroupMessages((prev) => ({
          ...prev,
          [selectedChat._id]: [...(prev[selectedChat._id] || []), sentMessage],
        }));

        setNewMessage("");
        setSelectedFile(null);
      } catch (err) {
        console.error("Error sending group message:", err);
      }
    } else {
      // Send individual message
      const formData = new FormData();
      formData.append("senderId", currentUserId);
      formData.append("receiverId", selectedChat._id);
      formData.append("message", newMessage);
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      try {
        const res = await axios.post(`${API_BASE}/messages`, formData, {
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
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;

    try {
      const res = await axios.post(`${API_BASE}/group-chats`, {
        name: newGroupName,
        createdBy: currentUserId,
        participants: [...selectedGroupMembers, currentUserId],
      });

      socket.current.emit("createGroup", res.data);
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinGroupCode.trim()) return;

    try {
      const res = await axios.post(`${API_BASE}/group-chats/join`, {
        groupCode: joinGroupCode,
        userId: currentUserId,
      });

      socket.current.emit("joinGroup", res.data);
    } catch (err) {
      console.error("Error joining group:", err);
    }
  };

  // Keep recentChats in sync with localStorage
  useEffect(() => {
    localStorage.setItem("recentChats_student", JSON.stringify(recentChats));
  }, [recentChats]);



  // ================= RENDER =================
  useEffect(() => {
    if (selectedChat) {
      const chatMessages = isGroupChat 
        ? (groupMessages[selectedChat._id] || [])
        : (messages[selectedChat._id] || []);
      const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
      if (lastMsg) {
        let prefix = (lastMsg.senderId === currentUserId) ? "You: " : `${selectedChat.lastname}, ${selectedChat.firstname}: `;
        let text = (lastMsg.message) ? lastMsg.message : (lastMsg.fileUrl ? "File sent" : "");
        setLastMessage({ prefix, text });
      } else {
        setLastMessage(null);
      }
    } else {
      setLastMessage(null);
    }
  }, [selectedChat, messages, currentUserId, groupMessages, isGroupChat]);

  // Preload last messages for all users in recentChats
  useEffect(() => {
    if (!currentUserId || recentChats.length === 0) return;
    const fetchAllRecentMessages = async () => {
      const newMessages = { ...messages };
      const newLastMessages = { ...lastMessages };
      for (const chat of recentChats) {
        // Only fetch if not already loaded
        if (!newMessages[chat._id] || newMessages[chat._id].length === 0) {
          try {
            const res = await axios.get(`${API_BASE}/messages/${currentUserId}/${chat._id}`);
            newMessages[chat._id] = res.data;
          } catch (err) {
            newMessages[chat._id] = [];
          }
        }
        const chatMessages = newMessages[chat._id] || [];
        const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
        if (lastMsg) {
          const prefix = lastMsg.senderId === currentUserId 
            ? "You: " 
            : `${chat.lastname}, ${chat.firstname}: `;
          const text = lastMsg.message 
            ? lastMsg.message 
            : (lastMsg.fileUrl ? "File sent" : "");
          newLastMessages[chat._id] = { prefix, text };
        }
      }
      setMessages(newMessages);
      setLastMessages(newLastMessages);
    };
    fetchAllRecentMessages();
    // eslint-disable-next-line
  }, [recentChats, currentUserId]);

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
  // 4. Update search to filter both users and groups
  const filteredUnifiedChats = searchTerm.trim() === '' ? unifiedChats : unifiedChats.filter(chat => {
    if (chat.type === 'individual') {
      return (
        chat.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lastname?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return chat.name?.toLowerCase().includes(searchTerm.toLowerCase());
    }
  });

  return (
    <div className="flex min-h-screen h-screen max-h-screen">
      <Student_Navbar />
      <div className="flex-1 flex flex-col bg-gray-100 font-poppinsr overflow-hidden md:ml-64 h-full min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-center px-10 py-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Chats</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `AY: ${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              {currentTerm ? `Current Term: ${currentTerm.termName}` : "Loading..."} | 
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
              {filteredUnifiedChats.length > 0 ? (
                filteredUnifiedChats.map((chat) => (
                  <div
                    key={chat._id}
                    className={`group relative flex items-center p-3 rounded-lg cursor-pointer shadow-sm transition-all ${
                      selectedChat?._id === chat._id && ((isGroupChat && chat.type === 'group') || (!isGroupChat && chat.type === 'individual')) ? "bg-white" : "bg-gray-100 hover:bg-gray-300"
                    }`}
                    onClick={() => {
                      if (chat.type === 'group') {
                        setSelectedChat(chat);
                        setIsGroupChat(true);
                        localStorage.setItem("selectedChatId_student", chat._id);
                      } else {
                        setSelectedChat(chat);
                        setIsGroupChat(false);
                        localStorage.setItem("selectedChatId_student", chat._id);
                      }
                    }}
                  >
                    {chat.type === 'group' ? (
                      <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold">
                        <span className="material-icons">groups</span>
                      </div>
                    ) : (
                      <img
                        src={chat.profilePic ? `${API_BASE}/uploads/${chat.profilePic}` : defaultAvatar}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover border"
                        onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                      />
                    )}
                    <div className="flex flex-col min-w-0 ml-2">
                      <strong className="truncate text-sm">
                        {chat.type === 'group' ? chat.name : `${chat.lastname}, ${chat.firstname}`}
                      </strong>
                      {chat.type === 'group' ? (
                        <span className="text-xs text-gray-500">{chat.members?.length || 0} members</span>
                      ) : (
                        lastMessages[chat._id] && (
                          <span className="text-xs text-gray-500 truncate">
                            {lastMessages[chat._id].prefix}{lastMessages[chat._id].text}
                          </span>
                        )
                      )}
                    </div>
                    {chat.type === 'group' && (
                      <span className="ml-2 text-blue-900 text-xs font-bold">Group</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-center mt-10 select-none">
                  No chats found
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-black" />

          {/* RIGHT PANEL */}
          <div className="w-full md:w-2/3 flex flex-col p-4 overflow-hidden h-full">
            {selectedChat ? (
              <>
                <div className="flex justify-between items-center mb-4 border-b border-black pb-4">
                  <div className="flex items-center gap-3">
                    {isGroupChat ? (
                      <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center text-lg font-bold">
                        {selectedChat.name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <img
                        src={selectedChat.profilePic ? `${API_BASE}/uploads/${selectedChat.profilePic}` : defaultAvatar}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover border"
                        onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                      />
                    )}
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold">
                        {isGroupChat ? selectedChat.name : `${selectedChat.lastname}, ${selectedChat.firstname}`}
                      </h3>
                      {isGroupChat && (
                        <span className="text-xs text-gray-500">
                          {selectedChat.members?.length || 0} members
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
                  {selectedChatMessages.map((msg, index) => {
                    const isRecipient = msg.senderId !== currentUserId;
                    const sender = isRecipient ? users.find(u => u._id === msg.senderId) : null;
                    const prevMsg = selectedChatMessages[index - 1];
                    const showHeader =
                      index === 0 ||
                      msg.senderId !== prevMsg?.senderId ||
                      Math.abs(new Date(msg.createdAt || msg.updatedAt) - new Date(prevMsg?.createdAt || prevMsg?.updatedAt)) > 5 * 60 * 1000;

                    // Date separator logic
                    const msgDate = new Date(msg.createdAt || msg.updatedAt);
                    const now = new Date();
                    const isToday = msgDate.toDateString() === now.toDateString();
                    const isYesterday = (() => {
                      const yesterday = new Date();
                      yesterday.setDate(now.getDate() - 1);
                      return msgDate.toDateString() === yesterday.toDateString();
                    })();
                    let dateLabel;
                    if (isToday) dateLabel = "Today";
                    else if (isYesterday) dateLabel = "Yesterday";
                    else dateLabel = msgDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
                    const timeLabel = msgDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

                    const currentDate = msgDate.toDateString();
                    const prevDate = prevMsg ? new Date(prevMsg.createdAt || prevMsg.updatedAt).toDateString() : null;
                    const showDateSeparator = index === 0 || currentDate !== prevDate;

                    return (
                      <div key={index}>
                        {showDateSeparator && (
                          <div className="flex justify-center my-4">
                            <span className="bg-gray-200 text-gray-600 text-xs px-4 py-1 rounded-full shadow">
                              {dateLabel || msgDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                            </span>
                          </div>
                        )}
                        {msg.senderId === currentUserId ? (
                          // Current user's message (right aligned, time above message)
                          <div>
                            {showHeader && (msg.createdAt || msg.updatedAt) && (
                              <div className="flex justify-end mb-1">
                                <span className="text-xs text-gray-400">
                                  {dateLabel ? `${dateLabel}, ` : ""}{timeLabel}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-end">
                              <div className="px-4 py-2 rounded-lg text-sm max-w-xs bg-blue-900 text-white mt-0.5">
                                {msg.message && <p>{msg.message}</p>}
                                {msg.fileUrl && (
                                  <a
                                    href={`${API_BASE}/${msg.fileUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline text-xs block mt-1"
                                  >
                                    📎 {msg.fileUrl.split("-").slice(1).join("-")}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Recipient's message (left aligned, profile pic, name, timestamp)
                          <div className="flex items-end gap-2">
                            {showHeader ? (
                              <>
                                <img
                                  src={sender && sender.profilePic ? `${API_BASE}/uploads/${sender.profilePic}` : defaultAvatar}
                                  alt="Profile"
                                  className="w-10 h-10 rounded-full object-cover border"
                                  onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                                />
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">{sender ? `${sender.lastname}, ${sender.firstname}` : ""}</span>
                                    {(msg.createdAt || msg.updatedAt) && (
                                      <span className="text-xs text-gray-400 ml-2">
                                        {dateLabel ? `${dateLabel}, ` : ""}{timeLabel}
                                      </span>
                                    )}
                                  </div>
                                  <div className="px-4 py-2 rounded-lg text-sm max-w-xs bg-gray-300 text-black w-fit mt-0.5">
                                    {msg.message && <p>{msg.message}</p>}
                                    {msg.fileUrl && (
                                      <a
                                        href={`${API_BASE}/${msg.fileUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline text-xs block mt-1"
                                      >
                                        📎 {msg.fileUrl.split("-").slice(1).join("-")}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="ml-[52px]">
                                <div className="px-4 py-2 rounded-lg text-sm max-w-xs bg-gray-300 text-black w-fit mt-0.5">
                                  {msg.message && <p>{msg.message}</p>}
                                  {msg.fileUrl && (
                                    <a
                                      href={`${API_BASE}/${msg.fileUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline text-xs block mt-1"
                                    >
                                      📎 {msg.fileUrl.split("-").slice(1).join("-")}
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                        {user.lastname}, {user.firstname}
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
                      user.firstname?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                      user.lastname?.toLowerCase().includes(memberSearchTerm.toLowerCase())
                    )
                    .filter(user => !selectedGroupMembers.includes(user._id))
                    .length === 0 ? (
                    <div className="text-gray-400 text-center p-2 text-xs">No users found</div>
                  ) : (
                    users
                      .filter(user => user._id !== currentUserId)
                      .filter(user =>
                        user.firstname?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                        user.lastname?.toLowerCase().includes(memberSearchTerm.toLowerCase())
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
                          <span className="text-sm">{user.lastname}, {user.firstname}</span>
                        </div>
                      ))
                  )
                }
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
      </div>
    </div>
  );
}
