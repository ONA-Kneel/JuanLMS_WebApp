//Faculty_Chats.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import uploadfile from "../../assets/uploadfile.png";
import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";
import defaultAvatar from "../../assets/profileicon (1).svg";
import ValidationModal from "../ValidationModal";
import ContactNicknameManager from "../ContactNicknameManager";
import GroupNicknameManager from "../GroupNicknameManager";
import { getUserDisplayName } from "../../utils/userDisplayUtils";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Faculty_Chats() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [recentChats, setRecentChats] = useState(() => {
    // Load from localStorage if available
    const stored = localStorage.getItem("recentChats_faculty");
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

  // Add state for member search
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  
  // Add state for leave group confirmation
  const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);
  const [groupToLeave, setGroupToLeave] = useState(null);

  // Add state for creator leave error
  const [showCreatorLeaveError, setShowCreatorLeaveError] = useState(false);

  // Add state for members modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

  const storedUser = localStorage.getItem("user");
  const currentUserId = storedUser ? JSON.parse(storedUser)?._id : null;

  useEffect(() => {
    if (!currentUserId) {
      window.location.href = '/';
    }
  }, [currentUserId]);

  // ================= SOCKET.IO SETUP =================
  useEffect(() => {
    socket.current = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.current.emit("addUser", currentUserId);

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
        
        // Check if this is a new chat and add to recentChats if needed
        const existingChat = recentChats.find(c => c._id === incomingMessage.senderId);
        if (!existingChat) {
          // Find the sender user from the users list
          const senderUser = users.find(u => u._id === incomingMessage.senderId);
          if (senderUser) {
            // Add the new chat to recentChats
            setRecentChats(prev => [senderUser, ...prev]);
          }
        }
        
        // Update last message for this chat
        const chat = existingChat || users.find(u => u._id === incomingMessage.senderId);
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
    socket.current.on("getGroupMessage", (data) => {
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
  }, [currentUserId, recentChats, users]);

  // ================= FETCH USERS =================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/users/with-nicknames`);
        // Support both array and paginated object
        const userArray = Array.isArray(res.data) ? res.data : res.data.users || [];
        setUsers(userArray);
        setSelectedChat(null);
        localStorage.removeItem("selectedChatId_faculty");
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

  // ================= FETCH EXISTING CONVERSATIONS =================
  useEffect(() => {
    const fetchExistingConversations = async () => {
      if (!currentUserId || users.length === 0) return;
      
      try {
        // Get all users except current user
        const otherUsers = users.filter(user => user._id !== currentUserId);
        
        // Check which users have conversations with current user
        const conversations = [];
        for (const user of otherUsers) {
          try {
            const res = await axios.get(`${API_BASE}/messages/${currentUserId}/${user._id}`);
            if (res.data && res.data.length > 0) {
              // This user has a conversation, add to recentChats if not already there
              if (!recentChats.some(chat => chat._id === user._id)) {
                conversations.push(user);
              }
            }
          } catch {
            // No conversation with this user, continue
          }
        }
        
        // Add new conversations to recentChats
        if (conversations.length > 0) {
          setRecentChats(prev => {
            const existingIds = prev.map(chat => chat._id);
            const newChats = conversations.filter(user => !existingIds.includes(user._id));
            return [...newChats, ...prev];
          });
        }
      } catch (err) {
        console.error("Error fetching existing conversations:", err);
      }
    };
    
    fetchExistingConversations();
  }, [currentUserId, users, recentChats]);

  // ================= FETCH CONTACT NICKNAMES =================
  useEffect(() => {
    const fetchContactNicknames = async () => {
      if (!currentUserId) return;
      try {
        const res = await axios.get(`${API_BASE}/users/${currentUserId}/contacts/nicknames`);
        const nicknamesMap = {};
        res.data.forEach(item => {
          // Ensure contactId is properly handled as a string
          const contactId = item.contactId?.toString() || item.contactId;
          if (contactId && item.nickname) {
            nicknamesMap[contactId] = item.nickname;
          }
        });
        setContactNicknames(nicknamesMap);
      } catch (err) {
        console.error("Error fetching contact nicknames:", err);
      }
    };
    fetchContactNicknames();
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
        const res = await axios.get(`${API_BASE}/group-messages/${selectedChat._id}?userId=${currentUserId}`);
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
        const res = await axios.post(`${API_BASE}/group-messages`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const sentMessage = res.data;

        socket.current.emit("sendGroupMessage", {
          senderId: currentUserId,
          groupId: selectedChat._id,
          text: sentMessage.message,
          fileUrl: sentMessage.fileUrl || null,
          senderName: storedUser ? getUserDisplayName(JSON.parse(storedUser)) : "Unknown",
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

  // Handle starting a new chat with a user
  const handleStartNewChat = (user) => {
    setSelectedChat(user);
    setIsGroupChat(false);
    // Add to recentChats if not already present
    if (!recentChats.some(c => c._id === user._id)) {
      const updated = [user, ...recentChats];
      setRecentChats(updated);
      localStorage.setItem("recentChats_faculty", JSON.stringify(updated));
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;

    try {
      const res = await axios.post(`${API_BASE}/group-chats`, {
        name: newGroupName,
        createdBy: currentUserId,
        participants: [...selectedGroupMembers, currentUserId],
      });

      const newGroup = { ...res.data, type: 'group' };
      setGroups(prev => [newGroup, ...prev]);
      setSelectedChat(newGroup);
      setIsGroupChat(true);
      setShowCreateGroupModal(false);
      setNewGroupName("");
      setSelectedGroupMembers([]);

      // Join the group in socket
      socket.current?.emit("joinGroup", { userId: currentUserId, groupId: newGroup._id });
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinGroupCode.trim()) return;

    try {
      await axios.post(`${API_BASE}/group-chats/${joinGroupCode}/join`, {
        userId: currentUserId,
      });

      // Refresh user groups
      const res = await axios.get(`${API_BASE}/group-chats/user/${currentUserId}`);
      setGroups(res.data);
      setShowJoinGroupModal(false);
      setJoinGroupCode("");
    } catch (err) {
      console.error("Error joining group:", err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupToLeave) return;

    try {
      await axios.post(`${API_BASE}/group-chats/${groupToLeave._id}/leave`, {
        userId: currentUserId,
      });

      // Remove group from state
      setGroups(prev => prev.filter(g => g._id !== groupToLeave._id));
      
      // If this was the selected chat, clear it
      if (selectedChat && selectedChat._id === groupToLeave._id) {
        setSelectedChat(null);
        setIsGroupChat(false);
        localStorage.removeItem("selectedChatId_faculty");
      }
      
      // Remove group messages
      setGroupMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[groupToLeave._id];
        return newMessages;
      });

      // Leave the group in socket
      socket.current?.emit("leaveGroup", { userId: currentUserId, groupId: groupToLeave._id });
      
      // Close modal and reset
      setShowLeaveGroupModal(false);
      setGroupToLeave(null);
    } catch (err) {
      console.error("Error leaving group:", err);
    }
  };

  // Update confirmLeaveGroup to check if user is creator
  const confirmLeaveGroup = (group) => {
    if (group.createdBy === currentUserId) {
      setShowCreatorLeaveError(true);
      return;
    }
    setGroupToLeave(group);
    setShowLeaveGroupModal(true);
  };

  // Keep recentChats in sync with localStorage
  useEffect(() => {
    localStorage.setItem("recentChats_faculty", JSON.stringify(recentChats));
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
        setLastMessages(prev => ({
          ...prev,
          [selectedChat._id]: { prefix, text }
        }));
      } else {
        setLastMessages(prev => ({
          ...prev,
          [selectedChat._id]: null
        }));
      }
    } else {
      setLastMessages(prev => ({
        ...prev,
        [selectedChat?._id]: null
      }));
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
          } catch {
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
  }, [recentChats, currentUserId, contactNicknames]);

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
        return (
          chat.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          chat.lastname?.toLowerCase().includes(searchTerm.toLowerCase())
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
        user.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastname?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(user => ({ ...user, type: 'new_user', isNewUser: true }))
  ];

  return (
    <div className="flex min-h-screen h-screen max-h-screen">
      <Faculty_Navbar />
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
                          localStorage.setItem("selectedChatId_faculty", chat._id);
                        } else {
                          setSelectedChat(chat);
                          setIsGroupChat(false);
                          localStorage.setItem("selectedChatId_faculty", chat._id);
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
                          {chat.type === 'group' ? chat.name : getUserDisplayName(chat, contactNicknames[chat._id])}
                        </strong>
                        {chat.type === 'group' ? (
                          <span className="text-xs text-gray-500 truncate">
                            {lastMessages[chat._id] && (
                              <span className="text-xs text-gray-500 truncate">
                                {lastMessages[chat._id].prefix}{lastMessages[chat._id].text}
                              </span>
                            )}
                          </span>
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
                )
              ) : (
                // Show search results when searching
                searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <div
                      key={item._id}
                      className={`group relative flex items-center p-3 rounded-lg cursor-pointer shadow-sm transition-all ${
                        selectedChat?._id === item._id ? "bg-white" : "bg-gray-100 hover:bg-gray-300"
                      }`}
                      onClick={() => {
                        if (item.isNewUser) {
                          // Start new chat with this user
                          handleStartNewChat(item);
                          setSearchTerm(""); // Clear search after selecting
                        } else if (item.type === 'group') {
                          setSelectedChat({ ...item, isGroup: true });
                          localStorage.setItem("selectedChatId_faculty", item._id);
                          setSearchTerm(""); // Clear search after selecting
                        } else {
                          setSelectedChat(item);
                          localStorage.setItem("selectedChatId_faculty", item._id);
                          setSearchTerm(""); // Clear search after selecting
                        }
                      }}
                    >
                      {item.type === 'group' ? (
                        <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold">
                          <span className="material-icons">groups</span>
                        </div>
                      ) : (
                        <img
                          src={item.profilePic ? `${API_BASE}/uploads/${item.profilePic}` : defaultAvatar}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover border"
                          onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                        />
                      )}
                      <div className="flex flex-col min-w-0 ml-2">
                        <strong className="truncate text-sm">
                          {item.type === 'group' ? item.name : getUserDisplayName(item, contactNicknames[item._id])}
                        </strong>
                        {item.isNewUser ? (
                          <span className="text-xs text-blue-600">Click to start new chat</span>
                        ) : item.type === 'group' ? (
                          <span className="text-xs text-gray-500">{item.participants?.length || 0} participants</span>
                        ) : (
                          lastMessages[item._id] && (
                            <span className="text-xs text-gray-500 truncate">
                              {lastMessages[item._id].prefix}{lastMessages[item._id].text}
                            </span>
                          )
                        )}
                      </div>
                      {item.type === 'group' && (
                        <span className="ml-2 text-blue-900 text-xs font-bold">Group</span>
                      )}
                      {item.isNewUser && (
                        <span className="ml-2 text-green-600 text-xs font-bold">New</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-center mt-10 select-none">
                    No users or groups found
                  </div>
                )
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
                    {/* In chat header, below the group name/title, show member count and dropdown for group chats only: */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {isGroupChat ? selectedChat.name : getUserDisplayName(selectedChat, contactNicknames[selectedChat._id?.toString()])}
                        </h3>
                        {!isGroupChat && (
                          <ContactNicknameManager
                            currentUserId={currentUserId}
                            contactId={selectedChat._id}
                            contactName={getUserDisplayName(selectedChat, contactNicknames[selectedChat._id?.toString()])}
                            originalName={`${selectedChat.firstname || ''} ${selectedChat.lastname || ''}`.trim()}
                            onNicknameUpdate={(contactId, nickname) => {
                              setContactNicknames(prev => ({
                                ...prev,
                                [contactId?.toString() || contactId]: nickname
                              }));
                            }}
                            className="relative z-10"
                          />
                        )}
                        {isGroupChat && (
                          <GroupNicknameManager
                            currentUserId={currentUserId}
                            groupName={selectedChat.name}
                            participants={selectedChat.participants}
                            users={users}
                            contactNicknames={contactNicknames}
                            onNicknameUpdate={(contactId, nickname) => {
                              setContactNicknames(prev => ({
                                ...prev,
                                [contactId?.toString() || contactId]: nickname
                              }));
                            }}
                            className="relative z-10"
                          />
                        )}
                      </div>
                      {isGroupChat && (
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          {(selectedChat?.participants?.length || 0)} members
                          <button
                            className="ml-1 text-gray-700 hover:text-blue-900 focus:outline-none"
                            onClick={() => setShowMembersModal(true)}
                            title="Show members"
                          >
                            <span style={{fontSize: '1.1em'}}>&#9660;</span>
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                  {isGroupChat && (
                    <button
                      onClick={() => confirmLeaveGroup(selectedChat)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Leave Group
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
                  {selectedChatMessages.map((msg, index) => {
                    const isRecipient = msg.senderId !== currentUserId;
                    const sender = users.find(u => u._id === msg.senderId);
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
                          // Current user's message
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
                          // Recipient's message
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
                                    <span className="font-semibold text-sm">
                                      {sender ? getUserDisplayName(sender, contactNicknames[sender._id?.toString()]) : (msg.senderId === currentUserId ? "You" : "Unknown User")}
                                    </span>
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
                        {getUserDisplayName(user, contactNicknames[user._id])}
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
                          <span className="text-sm">{getUserDisplayName(user, contactNicknames[user._id])}</span>
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
                      <span>{getUserDisplayName(user, contactNicknames[user._id])} {isCreator && <span className="text-xs text-blue-700">(Creator)</span>}</span>
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
                Are you sure you want to remove <strong>{getUserDisplayName(memberToRemove, contactNicknames[memberToRemove._id])}</strong> from the group?
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
      </div>
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
