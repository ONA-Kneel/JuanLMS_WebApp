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
import { getProfileImageUrl } from "../../utils/imageUtils";

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
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter out any corrupted entries with undefined names
        const filtered = parsed.filter(chat => 
          chat && chat._id && chat.firstname && chat.lastname && 
          chat.firstname !== 'undefined' && chat.lastname !== 'undefined' &&
          chat.firstname !== undefined && chat.lastname !== undefined
        );
        // Update localStorage with cleaned data
        if (filtered.length !== parsed.length) {
          localStorage.setItem("recentChats_admin", JSON.stringify(filtered));
        }
        return filtered;
      } catch (e) {
        console.error("Error parsing recentChats from localStorage:", e);
        localStorage.removeItem("recentChats_admin");
        return [];
      }
    }
    return [];
  });
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  
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
  
  // Add missing state variables for new chat functionality
  const [_showNewChatModal, setShowNewChatModal] = useState(false);
  const [_userSearchTerm, setUserSearchTerm] = useState("");

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

  // Add loading state for chat list
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);

  const API_URL = (import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com").replace(/\/$/, "");
  const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_URL).replace(/\/$/, "");

  const storedUser = localStorage.getItem("user");
  const currentUserId = storedUser ? JSON.parse(storedUser)?._id : null;

  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUserId) {
      navigate("/", { replace: true });
    }
  }, [currentUserId, navigate]);

  // Move or insert a chat to the top of recent list and persist
  const bumpChatToTop = (chatUser) => {
    if (!chatUser || !chatUser._id) return;
    setRecentChats((prev) => {
      const filtered = prev.filter((c) => c._id !== chatUser._id);
      const updated = [chatUser, ...filtered];
      localStorage.setItem("recentChats_admin", JSON.stringify(updated));
      return updated;
    });
  };

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
        createdAt: new Date().toISOString(),
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
        let chat = recentChats.find(c => c._id === incomingMessage.senderId);
        
        // If chat not found in recentChats, find the user and add them
        if (!chat) {
          const sender = users.find(u => u._id === incomingMessage.senderId);
          if (sender && sender.firstname && sender.lastname) {
            chat = {
              _id: sender._id,
              firstname: sender.firstname,
              lastname: sender.lastname,
              profilePic: sender.profilePic
            };
            // Add to recentChats
            setRecentChats(prev => {
              const updated = [chat, ...prev];
              localStorage.setItem("recentChats_admin", JSON.stringify(updated));
              return updated;
            });
          }
        }
        
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
          
          // Bump chat to top
          bumpChatToTop(chat);
          
                  // Refresh recent conversations to update sidebar
        setTimeout(() => {
          fetchRecentConversations();
        }, 100);
        }
        
        return newMessages;
      });
      
      // Also update the messages state immediately for real-time display
      setMessages(prev => ({
        ...prev,
        [incomingMessage.senderId]: [
          ...(prev[incomingMessage.senderId] || []),
          incomingMessage,
        ],
      }));
      
      // Force a re-render by updating the messages state
      setTimeout(() => {
        setMessages(prev => ({ ...prev }));
      }, 50);
    });

    // Group chat message handling
    socket.current.on("getGroupMessage", (data) => {
      const incomingGroupMessage = {
        senderId: data.senderId,
        groupId: data.groupId,
        message: data.text,
        fileUrl: data.fileUrl || null,
        senderName: data.senderName || "Unknown",
        senderFirstname: data.senderFirstname || "Unknown",
        senderLastname: data.senderLastname || "User",
        senderProfilePic: data.senderProfilePic || null,
        createdAt: new Date().toISOString(),
      };

      setGroupMessages((prev) => {
        const newGroupMessages = {
          ...prev,
          [incomingGroupMessage.groupId]: [
            ...(prev[incomingGroupMessage.groupId] || []),
            incomingGroupMessage,
          ],
        };
        
        // If this group is currently selected, force an immediate UI update
        if (selectedChat && selectedChat._id === incomingGroupMessage.groupId && selectedChat.isGroup) {
          // Force a re-render by updating the selected chat messages
          setTimeout(() => {
            setGroupMessages(current => ({ ...current }));
          }, 10);
        }
        
        // Update last message for this group
        const group = userGroups.find(g => g._id === incomingGroupMessage.groupId);
        if (group) {
          const prefix = incomingGroupMessage.senderId === currentUserId 
            ? "You: " 
            : `${incomingGroupMessage.senderName || 'Unknown'}: `;
          const text = incomingGroupMessage.message 
            ? incomingGroupMessage.message 
            : (incomingGroupMessage.fileUrl ? "File sent" : "");
          setLastMessages(prev => ({
            ...prev,
            [group._id]: { prefix, text }
          }));

          // Bump group chat to top and refresh sidebar
          bumpChatToTop(group);
          
          // Force a re-render by updating the group messages state
          setTimeout(() => {
            setGroupMessages(prev => ({ ...prev }));
          }, 50);
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
        setIsLoadingChats(true);
        const res = await axios.get(`${API_BASE}/users`);
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
      } finally {
        setIsLoadingChats(false);
      }
    };
    fetchUsers();
  }, [currentUserId]);

  // ================= FETCH RECENT CONVERSATIONS =================
  const fetchRecentConversations = async () => {
    if (!currentUserId) return;
    
    try {
      const token = localStorage.getItem("token");
      let allMessages = [];
      
      // First try to get all messages for the current user
      try {
        const res = await axios.get(`${API_BASE}/messages/user/${currentUserId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        allMessages = res.data || [];
      } catch {
        // Fallback: fetch messages for each user individually
        console.log("API endpoint not available, using fallback method");
        for (const user of users) {
          if (user._id !== currentUserId) {
            try {
              const userRes = await axios.get(`${API_BASE}/messages/${currentUserId}/${user._id}`, {
                headers: { "Authorization": `Bearer ${token}` }
              });
              if (userRes.data && userRes.data.length > 0) {
                allMessages.push(...userRes.data);
              }
            } catch {
              // Skip this user if there's an error
              continue;
            }
          }
        }
      }
      
      if (allMessages.length > 0) {
        // Group messages by conversation
        const conversationMap = new Map();
        allMessages.forEach(message => {
          const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
          if (!conversationMap.has(otherUserId)) {
            conversationMap.set(otherUserId, []);
          }
          conversationMap.get(otherUserId).push(message);
        });
        
        // Create recent chats list from actual conversations
        const newRecentChats = [];
        for (const [otherUserId, messages] of conversationMap) {
          if (messages.length > 0) {
            // Find the user object
            const otherUser = users.find(u => u._id === otherUserId);
            if (otherUser && otherUser.firstname && otherUser.lastname && 
                otherUser.firstname !== 'undefined' && otherUser.lastname !== 'undefined') {
              // Sort messages by date and get the latest
              const sortedMessages = messages.sort((a, b) => new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt));
              const lastMessage = sortedMessages[sortedMessages.length - 1];
              
              newRecentChats.push({
                _id: otherUserId,
                firstname: otherUser.firstname,
                lastname: otherUser.lastname,
                profilePic: otherUser.profilePic,
                lastMessageTime: lastMessage.createdAt || lastMessage.updatedAt
              });
            }
          }
        }
        
        // Sort by most recent message
        newRecentChats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
        
        // Update recentChats with actual conversations
        if (newRecentChats.length > 0) {
          setRecentChats(newRecentChats);
          localStorage.setItem("recentChats_admin", JSON.stringify(newRecentChats));
        }
      }
    } catch (error) {
      console.error("Error fetching recent conversations:", error);
    }
  };

  useEffect(() => {
    // Run immediately if we have the required data
    if (currentUserId && users.length > 0) {
      fetchRecentConversations();
    }
  }, [currentUserId, users]); // Dependencies ensure it runs when data is available

  // Clean up any corrupted data in recentChats
  useEffect(() => {
    if (recentChats.length > 0) {
      const cleanedChats = recentChats.filter(chat => 
        chat && chat._id && chat.firstname && chat.lastname && 
        chat.firstname !== 'undefined' && chat.lastname !== 'undefined' &&
        chat.firstname !== undefined && chat.lastname !== undefined
      );
      
      if (cleanedChats.length !== recentChats.length) {
        setRecentChats(cleanedChats);
        localStorage.setItem("recentChats_admin", JSON.stringify(cleanedChats));
      }
    }
  }, [recentChats]);

  // Force cleanup of corrupted data on component mount
  useEffect(() => {
    const cleanupCorruptedData = () => {
      const stored = localStorage.getItem("recentChats_admin");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const cleaned = parsed.filter(chat => 
            chat && chat._id && chat.firstname && chat.lastname && 
            chat.firstname !== 'undefined' && chat.lastname !== 'undefined' &&
            chat.firstname !== undefined && chat.lastname !== undefined
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem("recentChats_admin", JSON.stringify(cleaned));
            setRecentChats(cleaned);
          }
        } catch {
          localStorage.removeItem("recentChats_admin");
          setRecentChats([]);
        }
      }
    };
    
    cleanupCorruptedData();
  }, []);

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
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/messages`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
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

      // Ensure selected chat is at the top of recent chats
      bumpChatToTop(selectedChat);

      // Refresh recent conversations to update sidebar
      setTimeout(() => {
        fetchRecentConversations();
      }, 100);

      setNewMessage("");
      setSelectedFile(null);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedChat && selectedChat.isGroup) {
        handleSendGroupMessage();
      } else {
        handleSendMessage();
      }
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
    
    // Don't add to recent chats until they actually send a message
    // This ensures only users with actual conversations appear in sidebar
    
    setShowNewChatModal(false);
    setUserSearchTerm("");
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
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API_BASE}/messages/${currentUserId}/${chat._id}`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            newMessages[chat._id] = res.data;
          } catch {
            newMessages[chat._id] = [];
          }
        }
        const chatMessages = newMessages[chat._id] || [];
        const lastMsg = chatMessages.length > 0 ? chatMessages[chat._id]?.slice(-1)[0] : null;
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
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/group-chats/user/${currentUserId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        setUserGroups(res.data);
        
        // Fetch messages for all groups to determine which ones should appear in sidebar
        if (res.data && res.data.length > 0) {
          const allGroupMessages = {};
          for (const group of res.data) {
            try {
              const groupRes = await axios.get(`${API_BASE}/group-messages/${group._id}?userId=${currentUserId}`, {
                headers: { "Authorization": `Bearer ${token}` }
              });
              if (groupRes.data && groupRes.data.length > 0) {
                allGroupMessages[group._id] = groupRes.data;
              }
            } catch {
              // Group might not have messages yet, continue
              continue;
            }
          }
          setGroupMessages(allGroupMessages);
          
          // Join all groups in Socket.IO for real-time updates
          res.data.forEach(group => {
            socket.current?.emit("joinGroup", { userId: currentUserId, groupId: group._id });
          });
        }
        
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
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/group-messages/${selectedChat._id}?userId=${currentUserId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        setGroupMessages((prev) => {
          const newMessages = { ...prev, [selectedChat._id]: res.data };
          
          // Compute last messages for all groups
          const newLastMessages = {};
          userGroups.forEach(group => {
            const groupMessages = newMessages[group._id] || [];
            const lastMsg = groupMessages.length > 0 ? groupMessages[group._id]?.slice(-1)[0] : null;
            if (lastMsg) {
              const sender = userGroups.find(u => u._id === lastMsg.senderId);
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
  }, [selectedChat, currentUserId, userGroups]);

  // Fetch users for participant selection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/users`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const userArray = Array.isArray(res.data) ? res.data : res.data.users || [];
        setUsers(userArray);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);

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
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/group-chats`, {
        name: groupName,
        description: groupDescription,
        createdBy: currentUserId,
        participants: selectedParticipants,
      }, {
        headers: { "Authorization": `Bearer ${token}` }
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
    if (userGroups.some(g => g._id === joinGroupId.trim())) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Already in Group',
        message: 'You are already in this group!'
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/group-chats/${joinGroupId}/join`, {
        userId: currentUserId,
      }, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      // Fetch joined group and merge for instant visibility
      const groupRes = await axios.get(`${API_BASE}/group-chats/${joinGroupId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const joinedGroup = groupRes.data;
      setUserGroups(prev => prev.some(g => g._id === joinedGroup._id) ? prev : [joinedGroup, ...prev]);
      axios.get(`${API_BASE}/group-chats/user/${currentUserId}`, { headers: { "Authorization": `Bearer ${token}` } })
        .then(res => setUserGroups(res.data)).catch(() => {});
      setShowJoinGroup(false);
      setJoinGroupId("");
      setValidationModal({
        isOpen: true,
        type: 'success',
        title: 'Joined Group',
        message: `You have joined "${joinedGroup.name}"`
      });
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
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/group-chats/${selectedChat._id}/leave`, {
        userId: currentUserId,
      }, {
        headers: { "Authorization": `Bearer ${token}` }
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
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/group-messages`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
      });

      const sentMessage = res.data;

              socket.current.emit("sendGroupMessage", {
          senderId: currentUserId,
          groupId: selectedChat._id,
          text: sentMessage.message,
          fileUrl: sentMessage.fileUrl || null,
          senderName: storedUser ? JSON.parse(storedUser).firstname + " " + JSON.parse(storedUser).lastname : "Unknown",
          senderFirstname: storedUser ? JSON.parse(storedUser).firstname : "Unknown",
          senderLastname: storedUser ? JSON.parse(storedUser).lastname : "User",
          senderProfilePic: storedUser ? JSON.parse(storedUser).profilePic : null,
        });

      setGroupMessages((prev) => ({
        ...prev,
        [selectedChat._id]: [...(prev[selectedChat._id] || []), sentMessage],
      }));

              // Refresh recent conversations to update sidebar
        setTimeout(() => {
          fetchRecentConversations();
        }, 100);

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



  // Merge recentChats and groups with messages (actual conversations)
  const groupsWithMessages = userGroups.filter(group => {
    const groupMsgs = groupMessages[group._id] || [];
    return groupMsgs.length > 0;
  });
  
  const unifiedChats = [
    ...recentChats.map(chat => ({ ...chat, type: 'individual' })),
    ...groupsWithMessages.map(group => ({ ...group, type: 'group' }))
  ];
  // Sort by last message time (if available)
  unifiedChats.sort((a, b) => {
    let aTime = 0;
    let bTime = 0;
    
    if (a.type === 'group') {
      const aGroupMessages = groupMessages[a._id] || [];
      aTime = aGroupMessages.length > 0 ? new Date(aGroupMessages[aGroupMessages.length - 1]?.createdAt || 0).getTime() : 0;
    } else {
      const chatMessages = messages[a._id] || [];
      aTime = chatMessages.length > 0 ? new Date(chatMessages[chatMessages.length - 1]?.createdAt || 0).getTime() : 0;
    }
    
    if (b.type === 'group') {
      const bGroupMessages = groupMessages[b._id] || [];
      bTime = bGroupMessages.length > 0 ? new Date(bGroupMessages[bGroupMessages.length - 1]?.createdAt || 0).getTime() : 0;
    } else {
      const chatMessages = messages[b._id] || [];
      bTime = chatMessages.length > 0 ? new Date(chatMessages[chatMessages.length - 1]?.createdAt || 0).getTime() : 0;
    }
    
    return bTime - aTime;
  });

  const searchResults = searchTerm.trim() === '' ? [] : [
    // First show existing chats/groups that match (active conversations)
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
              {isLoadingChats ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading chats...</p>
                </div>
              ) : searchTerm.trim() === '' ? (
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
                          src={getProfileImageUrl(chat.profilePic, API_BASE, defaultAvatar)}
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
                          <span className="text-xs text-gray-500">{chat.participants?.length || 0} participants</span>
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
                          src={getProfileImageUrl(item.profilePic, API_BASE, defaultAvatar)}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover border"
                          onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                        />
                      )}
                      <div className="flex flex-col min-w-0 ml-2">
                        <strong className="truncate text-sm">
                          {item.type === 'group' ? item.name : `${item.lastname}, ${item.firstname}`}
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
                    {selectedChat.isGroup ? (
                      <>
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {selectedChat.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-lg font-semibold">{selectedChat.name}</h3>
                          <p className="text-sm text-gray-600">{selectedChat.participants.length} participants</p>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Group ID: <span className="font-mono">{selectedChat._id}</span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <img
                          src={getProfileImageUrl(selectedChat.profilePic, API_BASE, defaultAvatar)}
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
                    {selectedChat.isGroup && (
                      <>
                        <button
                          onClick={() => setShowMembersDropdown((prev) => !prev)}
                          className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors text-sm mr-2"
                        >
                          View Members
                        </button>
                        <button
                          onClick={() => navigator.clipboard?.writeText(selectedChat._id)}
                          title="Copy Group ID"
                          className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors text-sm mr-2"
                        >
                          Copy ID
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
                    const sender = users.find(u => u._id === msg.senderId);
                    const prevMsg = arr[index - 1];
                    const showHeader =
                      index === 0 ||
                      msg.senderId !== prevMsg?.senderId ||
                      Math.abs(new Date(msg.createdAt || msg.updatedAt) - new Date(prevMsg?.createdAt || prevMsg?.updatedAt)) > 5 * 60 * 1000;
                    return (
                      <div key={msg._id} className={`flex ${msg.senderId !== currentUserId ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-xs lg:max-w-md ${msg.senderId !== currentUserId ? "order-1" : "order-2"}`}>
                          {showHeader && msg.senderId !== currentUserId && (
                            <div className="text-xs text-gray-500 mb-1">
                              {selectedChat.isGroup ? (msg.senderName || "Unknown User") : (sender ? `${sender.lastname}, ${sender.firstname}` : "Unknown User")}
                            </div>
                          )}
                          <div className={`rounded-lg px-4 py-2 ${msg.senderId !== currentUserId ? "bg-gray-200 text-gray-800" : "bg-blue-500 text-white"}`}>
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
                            <div className={`text-xs mt-1 ${msg.senderId !== currentUserId ? "text-gray-500" : "text-blue-100"}`}>
                              {(() => {
                                const ts = msg.createdAt || msg.updatedAt;
                                const d = ts ? new Date(ts) : null;
                                return d && !isNaN(d.getTime()) ? d.toLocaleTimeString() : '';
                              })()}
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
                  return (
                    <li key={userId} className="flex items-center gap-2 py-2">
                      <img src={getProfileImageUrl(user.profilePic, API_BASE, defaultAvatar)} alt="Profile" className="w-8 h-8 rounded-full object-cover border" />
                      <span>{user.lastname}, {user.firstname}</span>
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
