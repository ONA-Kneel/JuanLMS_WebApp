// Admin_Chats.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import uploadfile from "../../assets/uploadfile.png";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import defaultAvatar from "../../assets/profileicon (1).svg";
import { useNavigate } from "react-router-dom";
import ValidationModal from "../ValidationModal";
import ContactNicknameManager from "../ContactNicknameManager";
import GroupNicknameManager from "../GroupNicknameManager";
import { getUserDisplayName } from "../../utils/userDisplayUtils";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Admin_Chats() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
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
  const [contactNicknames, setContactNicknames] = useState({});
  
  // Group Chat States
  const [userGroups, setUserGroups] = useState([]);
  const [groupMessages, setGroupMessages] = useState({});
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [joinGroupId, setJoinGroupId] = useState("");
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  // Add state for member search
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [users, setUsers] = useState([]);

  // Add missing validationModal state
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: "",
    title: "",
    message: ""
  });

  // Add state for leave confirmation and group members dropdown
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
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
          const contactNickname = contactNicknames[incomingGroupMessage.senderId];
          const displayName = sender ? getUserDisplayName(sender, contactNickname) : 'Unknown User';
          const prefix = incomingGroupMessage.senderId === currentUserId 
            ? "You: " 
            : `${displayName}: `;
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
  }, [currentUserId, recentChats, userGroups, contactNicknames, users]);

  // ================= FETCH USERS =================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/users/with-nicknames`);
        // Support both array and paginated object
        const userArray = Array.isArray(res.data) ? res.data : res.data.users || [];
        setUsers(userArray);
        setSelectedChat(null);
        localStorage.removeItem("selectedChatId_admin");
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

        // Ensure all message senders are in the users array
        const messageSenders = new Set();
        res.data.forEach(msg => {
          if (msg.senderId && msg.senderId !== currentUserId) {
            messageSenders.add(msg.senderId);
          }
        });
        
        // Add missing senders to users array if they're not already there
        const missingSenders = Array.from(messageSenders).filter(senderId => 
          !users.some(user => user._id === senderId)
        );
        
        if (missingSenders.length > 0) {
          // Fetch missing users
          missingSenders.forEach(async (senderId) => {
            try {
              const userRes = await axios.get(`${API_BASE}/users/${senderId}`);
              if (userRes.data) {
                setUsers(prev => {
                  if (!prev.some(user => user._id === senderId)) {
                    return [...prev, userRes.data];
                  }
                  return prev;
                });
              }
            } catch (err) {
              console.error("Error fetching user:", senderId, err);
            }
          });
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, [selectedChat, currentUserId, recentChats, contactNicknames, users]);

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

  // Handle starting a new chat with a user
  const handleStartNewChat = (user) => {
    setSelectedChat(user);
    // Add to recentChats if not already present
    if (!recentChats.some(c => c._id === user._id)) {
      const updated = [user, ...recentChats];
      setRecentChats(updated);
      localStorage.setItem("recentChats_admin", JSON.stringify(updated));
    }
  };

  // Keep recentChats in sync with localStorage
  useEffect(() => {
    localStorage.setItem("recentChats_admin", JSON.stringify(recentChats));
  }, [recentChats]);

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

  // ================= GROUP CHAT EFFECTS =================
  
  // Fetch user groups
  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        const res = await axios.get(`${API_BASE}/group-chats/user/${currentUserId}`);
        // Validate and clean participants array for each group
        const validatedGroups = res.data.map(group => {
          if (group.participants && Array.isArray(group.participants)) {
            // Filter out invalid participant IDs and ensure uniqueness
            const validParticipants = [...new Set(group.participants.filter(id => id && typeof id === 'string'))];
            return { ...group, participants: validParticipants };
          }
          return group;
        });
        setUserGroups(validatedGroups);
        
        // Join all groups in socket
        validatedGroups.forEach(group => {
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
          
          // Ensure all group message senders are in the users array
          const messageSenders = new Set();
          res.data.forEach(msg => {
            if (msg.senderId && msg.senderId !== currentUserId) {
              messageSenders.add(msg.senderId);
            }
          });
          
          // Add missing senders to users array if they're not already there
          const missingSenders = Array.from(messageSenders).filter(senderId => 
            !users.some(user => user._id === senderId)
          );
          
          if (missingSenders.length > 0) {
            // Fetch missing users
            missingSenders.forEach(async (senderId) => {
              try {
                const userRes = await axios.get(`${API_BASE}/users/${senderId}`);
                if (userRes.data) {
                  setUsers(prev => {
                    if (!prev.some(user => user._id === senderId)) {
                      return [...prev, userRes.data];
                    }
                    return prev;
                  });
                }
              } catch (err) {
                console.error("Error fetching user:", senderId, err);
              }
            });
          }
          
          // Compute last messages for all groups
          const newLastMessages = {};
          userGroups.forEach(group => {
            const groupMessages = newMessages[group._id] || [];
            const lastMsg = groupMessages.length > 0 ? groupMessages[groupMessages.length - 1] : null;
            if (lastMsg) {
              const sender = users.find(u => u._id === lastMsg.senderId);
              const contactNickname = contactNicknames[lastMsg.senderId];
              const displayName = sender ? getUserDisplayName(sender, contactNickname) : 'Unknown User';
              const prefix = lastMsg.senderId === currentUserId 
                ? "You: " 
                : `${displayName}: `;
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
  }, [selectedChat, currentUserId, userGroups, contactNicknames, users]);

  // Fetch users for participant selection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/users/with-nicknames`);
        const userArray = Array.isArray(res.data) ? res.data : res.data.users || [];
        setUsers(userArray);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, [currentUserId]);

  // ================= GROUP CHAT HANDLERS =================

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: "Please provide a group name and select at least one participant"
      });
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
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Creation Failed',
        message: err.response?.data?.error || "Error creating group"
      });
    }
  };

  const handleJoinGroup = async () => {
    if (!joinGroupId.trim()) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Group Code',
        message: "Please enter a group ID"
      });
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
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Join Failed',
        message: err.response?.data?.error || "Error joining group"
      });
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
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Leave Failed',
        message: err.response?.data?.error || "Error leaving group"
      });
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

      socket.current.emit("sendGroupMessage", {
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
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Send Failed',
        message: err.response?.data?.error || "Error sending group message"
      });
    }
  };



  // Merge recentChats and userGroups into a single unified list
  const unifiedChats = [
    ...recentChats.map(chat => ({ ...chat, type: 'individual' })),
    ...userGroups.map(group => ({ ...group, type: 'group' }))
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
        const displayName = getUserDisplayName(chat, contactNicknames[chat._id]);
        return (
          chat.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          chat.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          displayName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else {
        return chat.name?.toLowerCase().includes(searchTerm.toLowerCase());
      }
    }),
    // Then show users not in recent chats that match
    ...users
      .filter(user => user._id !== currentUserId)
      .filter(user => !recentChats.some(chat => chat._id === user._id))
      .filter(user => {
        const displayName = getUserDisplayName(user, contactNicknames[user._id]);
        return (
          user.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          displayName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .map(user => ({ ...user, type: 'new_user', isNewUser: true }))
  ];

  // Unified chat interface with tabs, left/right panels, and modals
  return (
    <div className="flex min-h-screen h-screen max-h-screen">
      <Admin_Navbar />
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
          <div className="flex items-center gap-4">
            <ProfileMenu />
          </div>
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
                      onClick={() => { setShowCreateGroup(true); setShowGroupMenu(false); }}
                    >
                      Create Group
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      onClick={() => { setShowJoinGroup(true); setShowGroupMenu(false); }}
                    >
                      Join Group
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* New Chat Button */}
            {/* Removed the Start New Chat button as requested */}

            {/* Unified Chat List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {searchTerm.trim() === '' ? (
                // Show normal chat list when not searching
                unifiedChats.length > 0 ? (
                  unifiedChats.map((chat) => (
                    <div
                      key={chat._id}
                      className={`group relative flex items-center p-3 rounded-lg cursor-pointer shadow-sm transition-all ${
                        selectedChat?._id === chat._id && ((selectedChat.isGroup && chat.type === 'group') || (!selectedChat.isGroup && chat.type === 'individual')) ? "bg-white" : "bg-gray-100 hover:bg-gray-300"
                      }`}
                      onClick={() => {
                        if (chat.type === 'group') {
                          setSelectedChat({ ...chat, isGroup: true });
                          localStorage.setItem("selectedChatId_admin", chat._id);
                        } else {
                          setSelectedChat(chat);
                          localStorage.setItem("selectedChatId_admin", chat._id);
                        }
                      }}
                    >
                      {chat.type === 'group' ? (
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
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
                          <span className="text-xs text-gray-500">
                            {chat.participants ? 
                              chat.participants.filter(id => users.some(user => user._id === id)).length : 0
                            } participants
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
                          localStorage.setItem("selectedChatId_admin", item._id);
                          setSearchTerm(""); // Clear search after selecting
                        } else {
                          setSelectedChat(item);
                          localStorage.setItem("selectedChatId_admin", item._id);
                          setSearchTerm(""); // Clear search after selecting
                        }
                      }}
                    >
                      {item.type === 'group' ? (
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
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
                          <span className="text-xs text-gray-500">
                            {item.participants ? 
                              item.participants.filter(id => users.some(user => user._id === id)).length : 0
                            } participants
                          </span>
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
                    {selectedChat.isGroup ? (
                      <>
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {selectedChat.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{selectedChat.name}</h3>
                            <GroupNicknameManager
                              currentUserId={currentUserId}
                              groupName={selectedChat.name}
                              participants={selectedChat.participants}
                              users={users}
                              contactNicknames={contactNicknames}
                              onNicknameUpdate={(contactId, nickname) => {
                                setContactNicknames(prev => ({
                                  ...prev,
                                  [contactId]: nickname
                                }));
                              }}
                              className="relative z-10"
                            />
                          </div>
                          <p className="text-sm text-gray-600">
                            {selectedChat.participants ? 
                              selectedChat.participants.filter(id => users.some(user => user._id === id)).length : 0
                            } participants
                          </p>
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
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">
                              {getUserDisplayName(selectedChat, contactNicknames[selectedChat._id?.toString()])}
                            </h3>
                            {!selectedChat.isGroup && (
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
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedChat.isGroup && (
                      <>
                        <button
                          onClick={() => setShowMembersDropdown((prev) => !prev)}
                          className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors text-sm mr-2"
                        >
                          View Members
                        </button>
                        <button
                          onClick={() => setShowLeaveConfirm(true)}
                          className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                          Leave Group
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
                  {(selectedChat.isGroup ? groupMessages[selectedChat._id] || [] : messages[selectedChat._id] || []).map((msg, index, arr) => {
                    const isRecipient = msg.senderId !== currentUserId;
                    const sender = users.find(u => u._id === msg.senderId);
                    const prevMsg = arr[index - 1];
                    const showHeader =
                      index === 0 ||
                      msg.senderId !== prevMsg?.senderId ||
                      Math.abs(new Date(msg.createdAt || msg.updatedAt) - new Date(prevMsg?.createdAt || prevMsg?.updatedAt)) > 5 * 60 * 1000;
                    
                    // Get sender display name
                    let senderDisplayName = "Unknown User";
                    if (msg.senderId === currentUserId) {
                      senderDisplayName = "You";
                    } else if (sender) {
                      senderDisplayName = getUserDisplayName(sender, contactNicknames[sender._id?.toString()]);
                    } else if (selectedChat && selectedChat._id === msg.senderId) {
                      senderDisplayName = getUserDisplayName(selectedChat, contactNicknames[selectedChat._id?.toString()]);
                    }
                    
                    return (
                      <div key={msg._id} className={`flex ${isRecipient ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-xs lg:max-w-md ${isRecipient ? "order-1" : "order-2"}`}>
                          {showHeader && isRecipient && (
                            <div className="text-xs text-gray-500 mb-1">
                              {senderDisplayName}
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
                        <img src={uploadfile} alt="Remove" className="w-4 h-4" />
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

        {/* New Chat Modal */}
        {/* Removed the New Chat Modal related to showNewChatModal as requested */}

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
                {/* Member search box */}
                <input
                  type="text"
                  placeholder="Search users by name..."
                  className="w-full p-2 border rounded-lg mb-2"
                  value={memberSearchTerm}
                  onChange={e => setMemberSearchTerm(e.target.value)}
                />
                {/* Selected members chips/list */}
                {selectedParticipants.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedParticipants.map(userId => {
                      const user = users.find(u => u._id === userId);
                      if (!user) return null;
                      return (
                        <span key={userId} className="flex items-center bg-blue-100 text-blue-900 px-2 py-1 rounded-full text-xs">
                          {user.lastname}, {user.firstname}
                          <button
                            className="ml-1 text-red-500 hover:text-red-700"
                            onClick={() => setSelectedParticipants(prev => prev.filter(id => id !== userId))}
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
                      .filter(user => !selectedParticipants.includes(user._id))
                      .length === 0 ? (
                        <div className="text-gray-400 text-center p-2 text-xs">No users found</div>
                      ) : (
                        users
                          .filter(user => user._id !== currentUserId)
                          .filter(user =>
                            user.firstname?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                            user.lastname?.toLowerCase().includes(memberSearchTerm.toLowerCase())
                          )
                          .filter(user => !selectedParticipants.includes(user._id))
                          .map(user => (
                            <div
                              key={user._id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => {
                                setSelectedParticipants(prev => [...prev, user._id]);
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
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    disabled={!groupName.trim() || selectedParticipants.length === 0}
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

        {/* Replace the dropdown with a centered modal for group members */}
        {showMembersDropdown && selectedChat.isGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">Group Members</h3>
              <ul className="mb-4 divide-y divide-gray-200">
                {selectedChat.participants.map((userId) => {
                  const user = users.find((u) => u._id === userId);
                  if (!user) return null;
                  const displayName = getUserDisplayName(user, contactNicknames[userId]);
                  return (
                    <li key={userId} className="flex items-center gap-2 py-2">
                      <img src={user.profilePic ? `${API_BASE}/uploads/${user.profilePic}` : defaultAvatar} alt="Profile" className="w-8 h-8 rounded-full object-cover border" />
                      <div className="flex flex-col">
                        <span className="font-medium">{displayName}</span>
                        {contactNicknames[userId] && (
                          <span className="text-xs text-gray-500">Nickname: {contactNicknames[userId]}</span>
                        )}
                      </div>
                      {selectedChat.createdBy === user._id && (
                        <span className="text-xs text-blue-600 ml-2">(Creator)</span>
                      )}
                      <span className="text-xs text-gray-500 ml-2">{user.role}</span>
                    </li>
                  );
                })}
              </ul>
              <button onClick={() => setShowMembersDropdown(false)} className="w-full py-2 rounded bg-blue-900 text-white font-semibold">Close</button>
            </div>
          </div>
        )}

        {showLeaveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">Confirm Leave Group</h3>
              <p className="mb-4">Are you sure you want to leave the group "{selectedChat.name}"?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowLeaveConfirm(false);
                    handleLeaveGroup();
                  }}
                  className="flex-1 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600"
                >
                  Yes, Leave
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
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
