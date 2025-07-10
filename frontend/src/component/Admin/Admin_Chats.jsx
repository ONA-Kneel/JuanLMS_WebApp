// Admin_Chats.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import videocall from "../../assets/videocall.png";
import voicecall from "../../assets/voicecall.png";
import uploadfile from "../../assets/uploadfile.png";
import closeIcon from "../../assets/close.png";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import defaultAvatar from "../../assets/profileicon (1).svg";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Admin_Chats() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [recentChats, setRecentChats] = useState(() => {
    // Load from localStorage if available
    const stored = localStorage.getItem("recentChats_admin");
    return stored ? JSON.parse(stored) : [];
  });
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  
  // Group Chat States
  const [activeTab, setActiveTab] = useState("individual"); // "individual" or "group"
  const [userGroups, setUserGroups] = useState([]);
  const [groupMessages, setGroupMessages] = useState({});
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [joinGroupId, setJoinGroupId] = useState("");

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

  const storedUser = localStorage.getItem("user");
  const currentUserId = storedUser ? JSON.parse(storedUser)?._id : null;

  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUserId) {
      navigate("/", { replace: true });
    }
  }, [currentUserId, navigate]);

  // ================= SOCKET.IO SETUP =================
  useEffect(() => {
    socket.current = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.current.emit("addUser", currentUserId);

    socket.current.on("getUsers", (users) => {
      // setOnlineUsers(users); // This line was removed as per the edit hint
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

    // Group chat message handling
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
        const group = userGroups.find(g => g._id === incomingGroupMessage.groupId);
        if (group) {
          const sender = users.find(u => u._id === incomingGroupMessage.senderId);
          const prefix = incomingGroupMessage.senderId === currentUserId 
            ? "You: " 
            : `${sender?.lastname || 'Unknown'}, ${sender?.firstname || 'User'}: `;
          const text = incomingGroupMessage.message 
            ? incomingGroupMessage.message 
            : (incomingGroupMessage.fileUrl ? "File sent" : "");
          setLastMessages(prev => ({
            ...prev,
            [group._id]: { prefix, text }
          }));
        }
        
        return newGroupMessages;
      });
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
        localStorage.removeItem("selectedChatId_admin");
      } catch (error) {
        if (error.response && error.response.status === 401) {
          window.location.href = '/';
        } else {
          console.error("Error fetching users:", error);
        }
      }
    };
    fetchUsers();
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

  // Auto-scroll
  const selectedChatMessages = messages[selectedChat?._id] || [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChatMessages]);

  // ================= HANDLERS =================

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
    localStorage.setItem("selectedChatId_admin", user._id);
    // Add to recent chats if not already present
    setRecentChats((prev) => {
      const exists = prev.find((u) => u._id === user._id);
      if (exists) return prev;
      const updated = [user, ...prev].slice(0, 10); // Keep max 10 recent
      localStorage.setItem("recentChats_admin", JSON.stringify(updated));
      return updated;
    });
  };

  // Keep recentChats in sync with localStorage
  useEffect(() => {
    localStorage.setItem("recentChats_admin", JSON.stringify(recentChats));
  }, [recentChats]);

  const filteredUsers = users.filter((u) =>
    `${u.firstname} ${u.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) && 
    u._id !== currentUserId
  );

  // ================= RENDER =================
  useEffect(() => {
    if (selectedChat) {
      const chatMessages = messages[selectedChat._id] || [];
      const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
      if (lastMsg) {
        let prefix = (lastMsg.senderId === currentUserId) ? "You: " : `${selectedChat.lastname}, ${selectedChat.firstname}: `;
        let text = (lastMsg.message) ? lastMsg.message : (lastMsg.fileUrl ? "File sent" : "");
        // setLastMessage({ prefix, text }); // This line was removed as per the edit hint
      } else {
        // setLastMessage(null); // This line was removed as per the edit hint
      }
    } else {
      // setLastMessage(null); // This line was removed as per the edit hint
    }
  }, [selectedChat, messages, currentUserId]);

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

  // ================= GROUP CHAT EFFECTS =================
  
  // Fetch user groups
  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        const res = await axios.get(`${API_BASE}/group-chats/user/${currentUserId}`);
        setUserGroups(res.data);
        
        // Join all groups in socket
        res.data.forEach(group => {
          socket.current?.emit("joinGroup", { userId: currentUserId, groupId: group._id });
        });
      } catch (err) {
        console.error("Error fetching user groups:", err);
      }
    };
    fetchUserGroups();
  }, [currentUserId]);

  // Fetch group messages when group is selected
  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (!selectedChat || !selectedChat.isGroup) return;
      try {
        const res = await axios.get(`${API_BASE}/group-messages/${selectedChat._id}?userId=${currentUserId}`);
        setGroupMessages((prev) => {
          const newMessages = { ...prev, [selectedChat._id]: res.data };
          
          // Compute last messages for all groups
          const newLastMessages = {};
          userGroups.forEach(group => {
            const groupMessages = newMessages[group._id] || [];
            const lastMsg = groupMessages.length > 0 ? groupMessages[groupMessages.length - 1] : null;
            if (lastMsg) {
              const sender = users.find(u => u._id === lastMsg.senderId);
              const prefix = lastMsg.senderId === currentUserId 
                ? "You: " 
                : `${sender?.lastname || 'Unknown'}, ${sender?.firstname || 'User'}: `;
              const text = lastMsg.message 
                ? lastMsg.message 
                : (lastMsg.fileUrl ? "File sent" : "");
              newLastMessages[group._id] = { prefix, text };
            }
          });
          setLastMessages(prev => ({ ...prev, ...newLastMessages }));
          
          return newMessages;
        });
      } catch (err) {
        console.error("Error fetching group messages:", err);
      }
    };

    fetchGroupMessages();
  }, [selectedChat, currentUserId, userGroups, users]);

  // ================= GROUP CHAT HANDLERS =================

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) {
      alert("Please provide a group name and select at least one participant");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/group-chats`, {
        name: groupName,
        description: groupDescription,
        createdBy: currentUserId,
        participants: selectedParticipants,
      });

      const newGroup = { ...res.data, isGroup: true };
      setUserGroups(prev => [newGroup, ...prev]);
      setSelectedChat(newGroup);
      setShowCreateGroup(false);
      setGroupName("");
      setGroupDescription("");
      setSelectedParticipants([]);

      // Join the group in socket
      socket.current?.emit("joinGroup", { userId: currentUserId, groupId: newGroup._id });
    } catch (err) {
      console.error("Error creating group:", err);
      alert(err.response?.data?.error || "Error creating group");
    }
  };

  const handleJoinGroup = async () => {
    if (!joinGroupId.trim()) {
      alert("Please enter a group ID");
      return;
    }

    try {
      await axios.post(`${API_BASE}/group-chats/${joinGroupId}/join`, {
        userId: currentUserId,
      });

      // Refresh user groups
      const res = await axios.get(`${API_BASE}/group-chats/user/${currentUserId}`);
      setUserGroups(res.data);
      setShowJoinGroup(false);
      setJoinGroupId("");
    } catch (err) {
      console.error("Error joining group:", err);
      alert(err.response?.data?.error || "Error joining group");
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedChat || !selectedChat.isGroup) return;

    try {
      await axios.post(`${API_BASE}/group-chats/${selectedChat._id}/leave`, {
        userId: currentUserId,
      });

      setUserGroups(prev => prev.filter(g => g._id !== selectedChat._id));
      setSelectedChat(null);
      setGroupMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[selectedChat._id];
        return newMessages;
      });

      // Leave the group in socket
      socket.current?.emit("leaveGroup", { userId: currentUserId, groupId: selectedChat._id });
    } catch (err) {
      console.error("Error leaving group:", err);
      alert(err.response?.data?.error || "Error leaving group");
    }
  };

  const handleSendGroupMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedChat || !selectedChat.isGroup) return;

    const formData = new FormData();
    formData.append("groupId", selectedChat._id);
    formData.append("senderId", currentUserId);
    formData.append("message", newMessage);
    if (selectedFile) {
      formData.append("file", selectedFile);
    }

    try {
      const res = await axios.post(`${API_BASE}/group-messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const sentMessage = res.data;

      socket.current?.emit("sendGroupMessage", {
        senderId: currentUserId,
        groupId: selectedChat._id,
        text: sentMessage.message,
        fileUrl: sentMessage.fileUrl || null,
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
  };

  const toggleParticipant = (userId) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectGroup = (group) => {
    setSelectedChat({ ...group, isGroup: true });
  };

  const filteredGroups = userGroups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Unified chat interface with tabs, left/right panels, and modals
  return (
    <div className="flex min-h-screen h-screen max-h-screen">
      <Admin_Navbar />
      <div className="flex-1 flex flex-col bg-gray-100 font-poppinsr overflow-hidden md:ml-64 h-full min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-center px-10 py-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Chats</h2>
            <p className="text-base md:text-lg">
              {academicYear ? `AY: ${academicYear.schoolYearStart}-${academicYear.schoolYearEnd}` : "Loading..."} | 
              {currentTerm ? `${currentTerm.termName}` : "Loading..."} | 
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("individual")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === "individual" ? "bg-white shadow-sm" : "text-gray-600"
                }`}
              >
                Individual Chats
              </button>
              <button
                onClick={() => setActiveTab("group")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === "group" ? "bg-white shadow-sm" : "text-gray-600"
                }`}
              >
                Group Chats
              </button>
            </div>
            {activeTab === "group" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  Create Group
                </button>
                <button
                  onClick={() => setShowJoinGroup(true)}
                  className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  Join Group
                </button>
              </div>
            )}
            <ProfileMenu />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden h-full">
          {/* LEFT PANEL */}
          <div className="w-full md:w-1/3 p-4 overflow-hidden flex flex-col h-full">
            <input
              type="text"
              placeholder={activeTab === "individual" ? "Search users..." : "Search groups..."}
              className="w-full mb-4 p-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {activeTab === "individual" ? (
              <>
                {/* Search Results */}
                {searchTerm.trim() !== "" && (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <div
                          key={user._id}
                          className={`p-3 rounded-lg cursor-pointer shadow-sm transition-all bg-gray-100 hover:bg-gray-300 flex items-center gap-2`}
                          onClick={() => handleSelectChat(user)}
                        >
                          <img
                            src={user.profilePic ? `${API_BASE}/uploads/${user.profilePic}` : defaultAvatar}
                            alt="Profile"
                            className="w-8 h-8 rounded-full object-cover border"
                            onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                          />
                          <strong>{user.lastname}, {user.firstname}</strong>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400 text-center mt-10 select-none">
                        No users found
                      </div>
                    )}
                  </div>
                )}
                {/* Recent Individual Chats */}
                {searchTerm.trim() === "" && recentChats.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-2 pl-1">Recent Chats</div>
                    <div className="space-y-2">
                      {recentChats.map((user) => (
                        <div
                          key={user._id}
                          className={`group relative flex items-center p-3 rounded-lg cursor-pointer shadow-sm transition-all ${
                            selectedChat?._id === user._id ? "bg-white" : "bg-gray-100 hover:bg-gray-300"
                          }`}
                          onClick={() => handleSelectChat(user)}
                        >
                          <span className="pr-10 min-w-0 truncate flex items-center gap-2">
                            <img
                              src={user.profilePic ? `${API_BASE}/uploads/${user.profilePic}` : defaultAvatar}
                              alt="Profile"
                              className="w-8 h-8 rounded-full object-cover border"
                              onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                            />
                            <div className="flex flex-col min-w-0">
                              <strong className="truncate">{user.lastname}, {user.firstname}</strong>
                              {lastMessages[user._id] && (
                                <span className="text-xs text-gray-500 truncate">
                                  {lastMessages[user._id].prefix}{lastMessages[user._id].text}
                                </span>
                              )}
                            </div>
                          </span>
                          <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
                            title="Remove from recent chats"
                            onClick={e => {
                              e.stopPropagation();
                              setRecentChats(prev => {
                                const updated = prev.filter(u => u._id !== user._id);
                                localStorage.setItem('recentChats_admin', JSON.stringify(updated));
                                return updated;
                              });
                            }}
                            style={{ padding: 0, border: 'none', background: 'none', lineHeight: 0 }}
                            tabIndex={-1}
                            aria-label="Remove from recent chats"
                          >
                            <img src={closeIcon} alt="Remove" className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* If no search and no recent chats, show message */}
                {searchTerm.trim() === "" && recentChats.length === 0 && (
                  <div className="p-3 rounded-lg bg-gray-100">
                    <p className="text-gray-600 text-center">No users available</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Group Chats */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => (
                      <div
                        key={group._id}
                        className={`group relative flex items-center p-3 rounded-lg cursor-pointer shadow-sm transition-all ${
                          selectedChat?._id === group._id ? "bg-white" : "bg-gray-100 hover:bg-gray-300"
                        }`}
                        onClick={() => handleSelectGroup(group)}
                      >
                        <span className="pr-10 min-w-0 truncate flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <strong className="truncate">{group.name}</strong>
                            <span className="text-xs text-gray-500">
                              {group.participants.length} participants
                            </span>
                            {lastMessages[group._id] && (
                              <span className="text-xs text-gray-500 truncate">
                                {lastMessages[group._id].prefix}{lastMessages[group._id].text}
                              </span>
                            )}
                          </div>
                        </span>
                        {group.admins.includes(currentUserId) && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-center mt-10 select-none">
                      {searchTerm.trim() !== "" ? "No groups found" : "No groups available"}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="w-px bg-black" />

          {/* RIGHT PANEL */}
          <div className="w-full md:w-2/3 flex flex-col p-4 overflow-hidden h-full">
            {selectedChat ? (
              <>
                <div className="flex justify-between items-center mb-4 border-b border-black pb-4">
                  <div className="flex items-center gap-3">
                    {selectedChat.isGroup ? (
                      <>
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {selectedChat.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-lg font-semibold">{selectedChat.name}</h3>
                          <p className="text-sm text-gray-600">{selectedChat.participants.length} participants</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <img
                          src={selectedChat.profilePic ? `${API_BASE}/uploads/${selectedChat.profilePic}` : defaultAvatar}
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover border"
                          onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                        />
                        <div className="flex flex-col">
                          <h3 className="text-lg font-semibold">
                            {selectedChat.lastname}, {selectedChat.firstname}
                          </h3>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedChat.isGroup ? (
                      <button
                        onClick={handleLeaveGroup}
                        className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        Leave Group
                      </button>
                    ) : (
                      <div className="flex space-x-3">
                        <img src={videocall} alt="Video Call" className="w-6 h-6 cursor-pointer hover:opacity-75" />
                        <img src={voicecall} alt="Voice Call" className="w-6 h-6 cursor-pointer hover:opacity-75" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
                  {(selectedChat.isGroup ? groupMessages[selectedChat._id] || [] : messages[selectedChat._id] || []).map((msg, index, arr) => {
                    const isRecipient = msg.senderId !== currentUserId;
                    const sender = isRecipient ? users.find(u => u._id === msg.senderId) : null;
                    const prevMsg = arr[index - 1];
                    const showHeader =
                      index === 0 ||
                      msg.senderId !== prevMsg?.senderId ||
                      Math.abs(new Date(msg.createdAt || msg.updatedAt) - new Date(prevMsg?.createdAt || prevMsg?.updatedAt)) > 5 * 60 * 1000;
                    return (
                      <div key={msg._id} className={`flex ${isRecipient ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-xs lg:max-w-md ${isRecipient ? "order-1" : "order-2"}`}>
                          {showHeader && isRecipient && (
                            <div className="text-xs text-gray-500 mb-1">
                              {sender ? `${sender.lastname}, ${sender.firstname}` : "Unknown User"}
                            </div>
                          )}
                          <div className={`rounded-lg px-4 py-2 ${isRecipient ? "bg-gray-200 text-gray-800" : "bg-blue-500 text-white"}`}>
                            {msg.message && <p className="break-words">{msg.message}</p>}
                            {msg.fileUrl && (
                              <div className="mt-2">
                                <a
                                  href={`${API_BASE}/${msg.fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline"
                                >
                                  📎 Attachment
                                </a>
                              </div>
                            )}
                            <div className={`text-xs mt-1 ${isRecipient ? "text-gray-500" : "text-blue-100"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="bg-white border-t p-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openFilePicker}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      <img src={uploadfile} alt="Upload" className="w-5 h-5" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={selectedChat.isGroup ? handleSendGroupMessage : handleSendMessage}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                  {selectedFile && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-gray-600">Selected: {selectedFile.name}</span>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <img src={closeIcon} alt="Remove" className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a Chat</h3>
                  <p className="text-gray-500">Choose a chat or group from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Create New Group</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Group Name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Group Description (optional)"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
                <div>
                  <h3 className="font-semibold mb-2">Select Participants (max 50)</h3>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {users.filter(u => u._id !== currentUserId).map((user) => (
                      <label key={user._id} className="flex items-center gap-2 p-2 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(user._id)}
                          onChange={() => toggleParticipant(user._id)}
                          className="rounded"
                        />
                        <span>{user.lastname}, {user.firstname}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateGroup}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Create Group
                  </button>
                  <button
                    onClick={() => setShowCreateGroup(false)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Join Group Modal */}
        {showJoinGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Join Group</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter Group ID"
                  value={joinGroupId}
                  onChange={(e) => setJoinGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleJoinGroup}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Join Group
                  </button>
                  <button
                    onClick={() => setShowJoinGroup(false)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
