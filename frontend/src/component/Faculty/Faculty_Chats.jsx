//Faculty_Chats.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import uploadfile from "../../assets/uploadfile.png";
import Faculty_Navbar from "./Faculty_Navbar";
import ProfileMenu from "../ProfileMenu";
import defaultAvatar from "../../assets/profileicon (1).svg";
import { useNavigate } from "react-router-dom";
import ValidationModal from "../ValidationModal";

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
          localStorage.setItem("recentChats_faculty", JSON.stringify(filtered));
        }
        return filtered;
      } catch (e) {
        console.error("Error parsing recentChats from localStorage:", e);
        localStorage.removeItem("recentChats_faculty");
        return [];
      }
    }
    return [];
  });
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

  // Member search state is not used in this view
  
  // Add state for leave group confirmation
  const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);
  const [groupToLeave, setGroupToLeave] = useState(null);

  // Add state for creator leave error
  const [showCreatorLeaveError, setShowCreatorLeaveError] = useState(false);

  // Add state for members modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Add loading state for chat list
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

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

  // Helper function to bump chat to top of recent chats
  const bumpChatToTop = (chatUser) => {
    if (!chatUser || !chatUser._id) return;
    
    setRecentChats(prev => {
      const existingIndex = prev.findIndex(chat => chat._id === chatUser._id);
      if (existingIndex === -1) {
        // Add new chat to the top
        const updated = [chatUser, ...prev];
        localStorage.setItem("recentChats_faculty", JSON.stringify(updated));
        return updated;
      } else if (existingIndex > 0) {
        // Move existing chat to the top
        const updated = [
          prev[existingIndex],
          ...prev.slice(0, existingIndex),
          ...prev.slice(existingIndex + 1)
        ];
        localStorage.setItem("recentChats_faculty", JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
    
    // Also trigger an immediate UI refresh
    setTimeout(() => {
      fetchRecentConversations();
    }, 50);
  };

  // ================= SOCKET.IO SETUP =================
  useEffect(() => {
    socket.current = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.current.emit("addUser", currentUserId);
    
    // When socket connects, join all groups
    socket.current.on("connect", () => {
      console.log("[FRONTEND] Socket connected, joining groups...");
      if (groups.length > 0) {
        groups.forEach(group => {
          console.log("[FRONTEND] Joining group on connect:", group._id);
          socket.current.emit("joinGroup", { userId: currentUserId, groupId: group._id });
        });
      }
    });

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
              localStorage.setItem("recentChats_faculty", JSON.stringify(updated));
              return updated;
            });
          }
        }
        
        if (chat) {
          let prefix;
          const text = incomingMessage.message 
            ? incomingMessage.message 
            : (incomingMessage.fileUrl ? "File sent" : "");
          
          if (incomingMessage.senderId === currentUserId) {
            prefix = "You: ";
          } else {
            prefix = `${chat.lastname || "Unknown"}, ${chat.firstname || "User"}: `;
          }
          
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

    // Group chat socket events
    socket.current.on("getGroupMessage", (data) => {
      console.log("[FRONTEND] Received group message:", data);
      console.log("[FRONTEND] Current selectedChat:", selectedChat);
      console.log("[FRONTEND] Current isGroupChat:", isGroupChat);
      
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

      // Update group messages immediately for real-time display
      setGroupMessages((prev) => {
        const updated = {
          ...prev,
          [data.groupId]: [...(prev[data.groupId] || []), incomingGroupMessage],
        };
        
        // If this group is currently selected, force an immediate UI update
        if (selectedChat && selectedChat._id === data.groupId && isGroupChat) {
          // Force a re-render by updating the selected chat messages
          setTimeout(() => {
            setGroupMessages(current => ({ ...current }));
          }, 10);
        }
        
        return updated;
      });

      // Update last message for this group chat
      const group = groups.find(g => g._id === data.groupId);
      if (group) {
        let prefix;
        const text = incomingGroupMessage.message 
          ? incomingGroupMessage.message 
          : (incomingGroupMessage.fileUrl ? "File sent" : "");
        
        if (incomingGroupMessage.senderId === currentUserId) {
          prefix = "You: ";
        } else {
          // Use the sender info from the message data
          prefix = `${incomingGroupMessage.senderFirstname || "Unknown"} ${incomingGroupMessage.senderLastname || "User"}: `;
        }
        
        setLastMessages(prev => ({
          ...prev,
          [data.groupId]: { prefix, text }
        }));

        // Bump group chat to top and refresh sidebar
        bumpChatToTop(group);
        
        // Force a re-render by updating the group messages state
        setTimeout(() => {
          setGroupMessages(prev => ({ ...prev }));
        }, 50);
      }
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
        setIsLoadingChats(true);
        const res = await axios.get(`${API_BASE}/users`);
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
      } finally {
        setIsLoadingChats(false);
      }
    };
    fetchUsers();
  }, [currentUserId]);

  // ================= FETCH RECENT CONVERSATIONS =================
  const fetchRecentConversations = async () => {
    if (!currentUserId || users.length === 0) return;
    
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
        
        // Fetch messages for each user
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
              continue;
            }
          }
        }
      }
      
      if (allMessages.length > 0) {
        // Group messages by conversation partner
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
                otherUser.firstname !== 'undefined' && otherUser.lastname !== 'undefined' &&
                otherUser.firstname !== undefined && otherUser.lastname !== undefined) {
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
        
        // Update recentChats state
        setRecentChats(newRecentChats);
        localStorage.setItem("recentChats_faculty", JSON.stringify(newRecentChats));
        
        // Preload messages for all conversations
        const newMessages = {};
        for (const [otherUserId, messages] of conversationMap) {
          newMessages[otherUserId] = messages;
        }
        setMessages(newMessages);
      }
    } catch (err) {
      console.error("Error fetching recent conversations:", err);
    }
  };

  useEffect(() => {
    fetchRecentConversations();
  }, [currentUserId, users]); // Wait for users to be loaded

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
        localStorage.setItem("recentChats_faculty", JSON.stringify(cleanedChats));
      }
    }
  }, [recentChats]);

  // Force cleanup of corrupted data on component mount
  useEffect(() => {
    const cleanupCorruptedData = () => {
      const stored = localStorage.getItem("recentChats_faculty");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const cleaned = parsed.filter(chat => 
            chat && chat._id && chat.firstname && chat.lastname && 
            chat.firstname !== 'undefined' && chat.lastname !== 'undefined' &&
            chat.firstname !== undefined && chat.lastname !== undefined
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem("recentChats_faculty", JSON.stringify(cleaned));
            setRecentChats(cleaned);
          }
        } catch {
          localStorage.removeItem("recentChats_faculty");
          setRecentChats([]);
        }
      }
    };
    
    cleanupCorruptedData();
  }, []);

  // ================= FETCH GROUPS =================
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/group-chats/user/${currentUserId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        setGroups(res.data);
        
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
          if (socket.current?.connected) {
            res.data.forEach(group => {
              console.log("[FRONTEND] Joining group:", group._id);
              socket.current.emit("joinGroup", { userId: currentUserId, groupId: group._id });
            });
          } else {
            console.log("[FRONTEND] Socket not connected yet, will join groups when connected");
            // Store groups to join when socket connects
            setGroups(res.data);
            return; // Exit early, groups will be joined when socket connects
          }
          
          // Debug: Check if socket is connected
          console.log("[FRONTEND] Socket connected:", socket.current?.connected);
          console.log("[FRONTEND] Socket ID:", socket.current?.id);
          
          // Also set groups state for the connect event handler
          setGroups(res.data);
        }
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
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/group-messages/${selectedChat._id}?userId=${currentUserId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        setGroupMessages((prev) => ({
          ...prev,
          [selectedChat._id]: res.data,
        }));

        // Update last message for this group chat
        if (res.data && res.data.length > 0) {
          const lastMsg = res.data[res.data.length - 1];
          let prefix;
          const text = lastMsg.message 
            ? lastMsg.message 
            : (lastMsg.fileUrl ? "File sent" : "");
          
          if (lastMsg.senderId === currentUserId) {
            prefix = "You: ";
          } else {
            // Try to find sender info from users
            const sender = users.find(u => u._id === lastMsg.senderId);
            if (sender) {
              prefix = `${sender.firstname || "Unknown"} ${sender.lastname || "User"}: `;
            } else {
              prefix = "Unknown User: ";
            }
          }
          
          setLastMessages(prev => ({
            ...prev,
            [selectedChat._id]: { prefix, text }
          }));
        }
      } catch (err) {
        console.error("Error fetching group messages:", err);
      }
    };

    fetchGroupMessages();
  }, [selectedChat, isGroupChat, currentUserId, users]);

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

        // Update last message for this group chat
        const text = sentMessage.message 
          ? sentMessage.message 
          : (sentMessage.fileUrl ? "File sent" : "");
        setLastMessages(prev => ({
          ...prev,
          [selectedChat._id]: { prefix: "You: ", text }
        }));

        // Bump group chat to top of recent
        bumpChatToTop(selectedChat);

        // Refresh recent conversations to update sidebar
        setTimeout(() => {
          fetchRecentConversations();
        }, 100);

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

        // Add to recent chats if not already there, or move to top if exists
        setRecentChats((prev) => {
          const exists = prev.some((c) => c._id === selectedChat._id);
          if (!exists) {
            // Add new chat to recent chats
            const updated = [selectedChat, ...prev];
            localStorage.setItem("recentChats_faculty", JSON.stringify(updated));
            return updated;
          } else {
            // Move existing chat to top
            const filtered = prev.filter((c) => c._id !== selectedChat._id);
            const updated = [selectedChat, ...filtered];
            localStorage.setItem("recentChats_faculty", JSON.stringify(updated));
            return updated;
          }
        });



        // Update last message for this individual chat
        const text = sentMessage.message 
          ? sentMessage.message 
          : (sentMessage.fileUrl ? "File sent" : "");
        setLastMessages(prev => ({
          ...prev,
          [selectedChat._id]: { prefix: "You: ", text }
        }));

        // Refresh recent conversations to update sidebar
        setTimeout(() => {
          fetchRecentConversations();
        }, 100);

        setNewMessage("");
        setSelectedFile(null);
      } catch (err) {
        console.error("Error sending message:", err);
      }
    }
  };

  // Remove a member from the current group (creator-only)
  const handleRemoveFromGroup = async (memberId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/group-chats/${selectedChat._id}/remove-member`, {
        userId: currentUserId,
        memberId,
      }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      // Update UI state
      setGroups(prev => prev.map(g => g._id === selectedChat._id ? {
        ...g,
        participants: (g.participants || []).filter(id => id !== memberId)
      } : g));
    } catch (err) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Remove Failed',
        message: err?.response?.data?.error || 'Error removing member'
      });
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
    
    // Don't add to recent chats until they actually send a message
    // This ensures only users with actual conversations appear in sidebar
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/group-chats`, {
        name: newGroupName,
        createdBy: currentUserId,
        participants: [...selectedGroupMembers, currentUserId],
      }, {
        headers: { "Authorization": `Bearer ${token}` }
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
      // Prevent joining if already a member
      if (groups.some(g => g._id === joinGroupCode.trim())) {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Already in Group',
          message: 'You are already in this group!'
        });
        return;
      }
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/group-chats/${joinGroupCode}/join`, {
        userId: currentUserId,
      }, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      // Fetch joined group and merge
      const groupRes = await axios.get(`${API_BASE}/group-chats/${joinGroupCode}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const joinedGroup = groupRes.data;
      setGroups(prev => prev.some(g => g._id === joinedGroup._id) ? prev : [joinedGroup, ...prev]);
      axios.get(`${API_BASE}/group-chats/user/${currentUserId}`, { headers: { "Authorization": `Bearer ${token}` } })
        .then(res => setGroups(res.data)).catch(() => {});

      socket.current?.emit("joinGroup", { userId: currentUserId, groupId: joinedGroup._id });
      setSelectedChat(joinedGroup);
      setIsGroupChat(true);
      setShowJoinGroupModal(false);
      setJoinGroupCode("");
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
        message: err?.response?.data?.error || 'Error joining group'
      });
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupToLeave) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/group-chats/${groupToLeave._id}/leave`, {
        userId: currentUserId,
      }, {
        headers: { "Authorization": `Bearer ${token}` }
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
        let prefix;
        let text = (lastMsg.message) ? lastMsg.message : (lastMsg.fileUrl ? "File sent" : "");
        
        if (lastMsg.senderId === currentUserId) {
          prefix = "You: ";
        } else if (isGroupChat) {
          // For group chats, try to get sender info from the message or users
          const sender = users.find(u => u._id === lastMsg.senderId);
          if (sender) {
            prefix = `${sender.firstname || "Unknown"} ${sender.lastname || "User"}: `;
          } else {
            prefix = "Unknown User: ";
          }
        } else {
          // For individual chats
          prefix = `${selectedChat.lastname || "Unknown"}, ${selectedChat.firstname || "User"}: `;
        }
        
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
  }, [selectedChat, messages, currentUserId, groupMessages, isGroupChat, users]);

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
        const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
        if (lastMsg) {
          const prefix = lastMsg.senderId === currentUserId 
            ? "You: " 
            : `${chat.lastname || "Unknown"}, ${chat.firstname || "User"}: `;
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

  // 1. Remove activeTab and all tab logic
  // 2. Add state for dropdown menu (showGroupMenu)
  // 3. Merge recentChats and groups into a single unified list
  // Include groups that have messages OR are newly created/joined
  const groupsWithMessages = groups.filter(group => {
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
  // Enhanced search: include all groups you belong to (even with no messages)
  const additionalGroupSearchResults = groups
    .filter(g => !unifiedChats.some(uc => uc._id === g._id)) // Filter out already included groups
    .filter(g => g.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .map(g => ({ ...g, type: 'group' }));

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
    // Then show other groups you're in without messages yet
    ...additionalGroupSearchResults,
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
              <div className="flex items-center gap-2 ml-2">

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
                          {chat.type === 'group' ? chat.name : `${chat.lastname}, ${chat.firstname}`}
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
                      <h3 className="text-lg font-semibold">
                        {isGroupChat ? selectedChat.name : `${selectedChat.lastname}, ${selectedChat.firstname}`}
                      </h3>
                      {isGroupChat && (
                        <>
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
                          <span className="text-[11px] text-gray-500 mt-1">
                            Group ID: <span className="font-mono">{selectedChat?._id}</span>
                            <button
                              className="ml-2 px-2 py-0.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                              onClick={() => {
                                if (selectedChat?._id) {
                                  navigator.clipboard?.writeText(selectedChat._id);
                                  setValidationModal({
                                    isOpen: true,
                                    type: 'success',
                                    title: 'Copied',
                                    message: 'Group ID copied to clipboard'
                                  });
                                }
                              }}
                            >
                              Copy
                            </button>
                          </span>
                        </>
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
                    const sender = users.find(u => u._id === msg.senderId);
                    const prevMsg = selectedChatMessages[index - 1];
                    const showHeader =
                      index === 0 ||
                      msg.senderId !== prevMsg?.senderId ||
                      Math.abs(new Date(msg.createdAt || msg.updatedAt) - new Date(prevMsg?.createdAt || prevMsg?.updatedAt)) > 5 * 60 * 1000;

                    // Date separator logic
                    const msgDateSrc = msg.createdAt || msg.updatedAt;
                    const msgDate = msgDateSrc ? new Date(msgDateSrc) : new Date();
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
                    const prevDate = prevMsg ? new Date(prevMsg.createdAt || prevMsg.updatedAt || '').toDateString() : null;
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
                              <div className="max-w-xs lg:max-w-md bg-blue-900 text-white p-3 rounded-lg shadow">
                                <div className="text-sm">{msg.message}</div>
                                {msg.fileUrl && (
                                  <div className="mt-2">
                                    <a
                                      href={`${API_BASE}/uploads/${msg.fileUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-200 hover:text-blue-100 underline"
                                    >
                                      📎 File attached
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Other user's message
                          <div>
                            {showHeader && (msg.createdAt || msg.updatedAt) && (
                              <div className="flex items-center gap-2 mb-1">
                                <img
                                  src={sender?.profilePic ? `${API_BASE}/uploads/${sender.profilePic}` : defaultAvatar}
                                  alt="Profile"
                                  className="w-6 h-6 rounded-full object-cover border"
                                  onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                                />
                                <span className="text-xs text-gray-400">
                                  {isGroupChat ? `${sender?.firstname || "Unknown"} ${sender?.lastname || "User"}` : ""} • {dateLabel ? `${dateLabel}, ` : ""}{timeLabel}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-start">
                              <div className="max-w-xs lg:max-w-md bg-white border p-3 rounded-lg shadow">
                                <div className="text-sm">{msg.message}</div>
                                {msg.fileUrl && (
                                  <div className="mt-2">
                                    <a
                                      href={`${API_BASE}/uploads/${msg.fileUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                      📎 File attached
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-300 pt-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="1"
                        style={{ minHeight: "44px", maxHeight: "120px" }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openFilePicker}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Attach file"
                      >
                        <img src={uploadfile} alt="Attach" className="w-6 h-6" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        style={{ display: "none" }}
                        accept="image/*,.pdf,.doc,.docx,.txt"
                      />
                      {selectedFile && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="truncate max-w-20">{selectedFile.name}</span>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() && !selectedFile}
                        className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold mb-2">No chat selected</h3>
                  <p>Choose a chat from the left panel to start messaging</p>
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
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Members
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {users
                      .filter((user) => user._id !== currentUserId)
                      .map((user) => (
                        <label
                          key={user._id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedGroupMembers.some((m) => m._id === user._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGroupMembers([...selectedGroupMembers, user]);
                              } else {
                                setSelectedGroupMembers(
                                  selectedGroupMembers.filter((m) => m._id !== user._id)
                                );
                              }
                            }}
                          />
                          <img
                            src={user.profilePic ? `${API_BASE}/uploads/${user.profilePic}` : defaultAvatar}
                            alt="Profile"
                            className="w-6 h-6 rounded-full object-cover border"
                            onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                          />
                          <span className="text-sm">
                            {user.lastname}, {user.firstname}
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowCreateGroupModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Join Group Modal */}
        {showJoinGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Join Group</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group ID
                  </label>
                  <input
                    type="text"
                    value={joinGroupCode}
                    onChange={(e) => setJoinGroupCode(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Group ID"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowJoinGroupModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinGroup}
                    disabled={!joinGroupCode.trim()}
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Join Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leave Group Confirmation Modal */}
        {showLeaveGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Leave Group</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to leave "{groupToLeave?.name}"? You won't be able to see messages from this group anymore.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowLeaveGroupModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveGroup}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Leave Group
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Creator Leave Error Modal */}
        {showCreatorLeaveError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Cannot Leave Group</h3>
              <p className="text-gray-600 mb-4">
                You cannot leave this group because you are the creator. You must either delete the group or transfer ownership to another member.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreatorLeaveError(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Members Modal */}
        {showMembersModal && selectedChat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-2">Group Members</h3>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 truncate">
                  Group ID: <span className="font-mono">{selectedChat?._id}</span>
                </span>
                <button
                  className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    if (selectedChat?._id) {
                      navigator.clipboard?.writeText(selectedChat._id);
                      setValidationModal({
                        isOpen: true,
                        type: 'success',
                        title: 'Copied',
                        message: 'Group ID copied to clipboard'
                      });
                    }
                  }}
                >
                  Copy ID
                </button>
              </div>

              <ul className="mb-4 max-h-60 overflow-y-auto divide-y">
                {(selectedChat?.participants || []).map((p) => {
                  const userId = typeof p === 'string' ? p : (p?._id || p);
                  const user = users.find(u => u._id === userId) || (typeof p === 'object' ? p : null);
                  const isCreator = selectedChat?.createdBy === userId;
                  return (
                    <li key={userId} className="flex items-center justify-between py-2">
                      <span>{user?.lastname || ''}{user ? ', ' : ''}{user?.firstname || ''} {isCreator && <span className="text-xs text-blue-700">(Creator)</span>}</span>
                      {selectedChat?.createdBy === currentUserId && !isCreator && (
                        <button
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-300 rounded"
                          onClick={() => { setMemberToRemove(user || { _id: userId, firstname: '', lastname: '' }); setShowRemoveConfirm(true); }}
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
              <h3 className="text-lg font-semibold mb-4">Remove Member</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to remove {memberToRemove.firstname} {memberToRemove.lastname} from the group?
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleRemoveFromGroup(memberToRemove._id);
                    setShowRemoveConfirm(false);
                    setMemberToRemove(null);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Validation Modal */}
        <ValidationModal
          isOpen={validationModal.isOpen}
          type={validationModal.type}
          title={validationModal.title}
          message={validationModal.message}
          onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
        />
      </div>
    </div>
  );
}