// Admin_Chats.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useSocket } from "../../contexts/SocketContext.jsx";
import uploadfile from "../../assets/uploadfile.png";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import defaultAvatar from "../../assets/profileicon (1).svg";
import { useNavigate } from "react-router-dom";
import ValidationModal from "../ValidationModal";
import { getProfileImageUrl } from "../../utils/imageUtils";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function Admin_Chats() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
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
  const [users, setUsers] = useState(() => {
    try {
      const cached = localStorage.getItem('users_all_admin');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  // Backend search results from users collection
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [hiddenGroupIds, setHiddenGroupIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hiddenGroups_admin') || '[]'); } catch { return []; }
  });
  
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
  const [isSending, setIsSending] = useState(false);
  // Highlight chats with new/unread messages
  const [highlightedChats, setHighlightedChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('highlightedChats_admin') || '{}'); } catch { return {}; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const addHighlight = (chatId) => {
    if (!chatId) return;
    setHighlightedChats(prev => {
      const next = { ...prev, [chatId]: Date.now() };
      try { localStorage.setItem('highlightedChats_admin', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const clearHighlight = (chatId) => {
    if (!chatId) return;
    setHighlightedChats(prev => {
      if (!prev[chatId]) return prev;
      const { [chatId]: _omit, ...rest } = prev;
      try { localStorage.setItem('highlightedChats_admin', JSON.stringify(rest)); } catch {}
      return rest;
    });
  };

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { socket: ctxSocket, isConnected } = useSocket();
  const chatListRef = useRef(null);
  const fetchedGroupPreviewIds = useRef(new Set());
  // Live refs to avoid stale closures in socket handlers
  const recentChatsRef = useRef([]);
  const selectedChatRef = useRef(null);
  const isGroupChatRef = useRef(false);
  const usersRef = useRef([]);
  const lastSendRef = useRef(0);

  const API_URL = (import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com").replace(/\/$/, "");
  const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_URL).replace(/\/$/, "");

  const storedUser = localStorage.getItem("user");
  const currentUserId = storedUser ? JSON.parse(storedUser)?._id : null;

  const navigate = useNavigate();
  // Sync refs with latest state
  useEffect(() => { recentChatsRef.current = recentChats; }, [recentChats]);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { usersRef.current = users; }, [users]);

  // Fetch a single user by id and merge to cache/state
  const fetchUserIfMissing = async (userId) => {
    if (!userId) return null;
    const existing = users.find(u => u._id === userId);
    if (existing) return existing;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/users/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.data && res.data._id) {
        const fetched = res.data;
        setUsers(prev => {
          const next = [...prev.filter(u => u._id !== fetched._id), fetched];
          try { localStorage.setItem('users_all_admin', JSON.stringify(next)); } catch {}
          return next;
        });
        return fetched;
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  // Compute last message preview for a chat (individual or group)
  const getLastPreview = (chat) => {
    if (!chat) return null;
    // Prefer stored previews
    if (lastMessages[chat._id]) return lastMessages[chat._id];
    // Derive from cached messages
    if (chat.type === 'group') {
      const list = (groupMessages[chat._id] || []);
      if (list.length === 0) return null;
      const last = list[list.length - 1];
      const prefix = last.senderId === currentUserId ? 'You: ' : `${last.senderName || 'Unknown'}: `;
      const text = last.message ? last.message : (last.fileUrl ? 'File sent' : '');
      return { prefix, text };
    } else {
      const list = (messages[chat._id] || []);
      if (list.length === 0) return null;
      const last = list[list.length - 1];
      const prefix = last.senderId === currentUserId ? 'You: ' : `${chat.lastname}, ${chat.firstname}: `;
      const text = last.message ? last.message : (last.fileUrl ? 'File sent' : '');
      return { prefix, text };
    }
  };

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

  // Remove a chat from recent list and persist
  const removeFromRecent = (chatId) => {
    if (!chatId) return;
    setRecentChats((prev) => {
      const updated = prev.filter((c) => c._id !== chatId);
      localStorage.setItem("recentChats_admin", JSON.stringify(updated));
      return updated;
    });
    setMessages((prev) => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    setLastMessages((prev) => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    if (selectedChat && selectedChat._id === chatId && !selectedChat.isGroup) {
      setSelectedChat(null);
      localStorage.removeItem("selectedChatId_admin");
    }
  };

  // ================= SOCKET.IO SETUP =================
  useEffect(() => {
    if (!ctxSocket || !isConnected || !currentUserId) return;
    ctxSocket.emit("addUser", currentUserId);

    const handleIncomingDirect = (data) => {
      const incomingMessage = {
        senderId: data.senderId,
        receiverId: currentUserId,
        message: data.text || data.message,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
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
        let chat = (recentChatsRef.current || []).find(c => c._id === incomingMessage.senderId);
        
        // If chat not in recentChats, fetch or find the user and add them
        if (!chat) {
          const ensureSender = async () => {
            const sender = (usersRef.current || []).find(u => u._id === incomingMessage.senderId) || await fetchUserIfMissing(incomingMessage.senderId);
            if (sender && sender.firstname && sender.lastname) {
              const newChat = {
                _id: sender._id,
                firstname: sender.firstname,
                lastname: sender.lastname,
                profilePic: sender.profilePic
              };
              setRecentChats(prev => {
                const updated = [newChat, ...prev.filter(c => c._id !== newChat._id)];
                localStorage.setItem("recentChats_admin", JSON.stringify(updated));
                return updated;
              });
              const previewText = incomingMessage.message ? incomingMessage.message : (incomingMessage.fileUrl ? 'File sent' : '');
              setLastMessages(prev => ({
                ...prev,
                [newChat._id]: { prefix: `${newChat.lastname || 'Unknown'}, ${newChat.firstname || 'User'}: `, text: previewText }
              }));
              if (!(selectedChatRef.current && selectedChatRef.current._id === newChat._id)) {
                addHighlight(newChat._id);
              }
            }
          };
          // fire and forget
          ensureSender();
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

          // Highlight if not the currently open chat
          if (!(selectedChatRef.current && selectedChatRef.current._id === chat._id)) {
            addHighlight(chat._id);
          }
          
                  // Refresh recent conversations to update sidebar
        setTimeout(() => {
          fetchRecentConversations();
        }, 100);
        }
        
        return newMessages;
      });
      
      // If current open chat is the sender, force a light refresh and scroll
      if (selectedChat && !selectedChat.isGroup && selectedChat._id === incomingMessage.senderId) {
        setTimeout(() => {
          setMessages(prev => ({ ...prev }));
          try { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); } catch {}
        }, 25);
      }
    };
    ctxSocket.on("getMessage", handleIncomingDirect);
    ctxSocket.on("receiveMessage", handleIncomingDirect);

    // Group chat message handling
    const handleIncomingGroup = (data) => {
      const incomingGroupMessage = {
        senderId: data.senderId,
        groupId: data.groupId,
        message: data.text,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
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
        if (selectedChatRef.current && selectedChatRef.current._id === incomingGroupMessage.groupId && selectedChatRef.current.isGroup) {
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

          // Bump group chat to top; avoid extra forced re-render
          bumpChatToTop(group);
          if (!(selectedChatRef.current && selectedChatRef.current._id === group._id && selectedChatRef.current.isGroup)) {
            addHighlight(group._id);
          }
        }
        
        return newGroupMessages;
      });
    };
    ctxSocket.on("getGroupMessage", handleIncomingGroup);

    return () => {
      ctxSocket.off("getMessage", handleIncomingDirect);
      ctxSocket.off("receiveMessage", handleIncomingDirect);
      ctxSocket.off("getGroupMessage", handleIncomingGroup);
    };
  }, [ctxSocket, isConnected, currentUserId, selectedChat, recentChats, users, userGroups]);

  // Consolidated data fetching function
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const [usersRes, yearRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/users/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/schoolyears/active`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);

      // Process users
      if (usersRes.status === 'fulfilled') {
        const userArray = Array.isArray(usersRes.value.data) ? usersRes.value.data : [];
        setUsers(userArray);
        try { localStorage.setItem('users_all_admin', JSON.stringify(userArray)); } catch {}
      } else {
        console.error("Error fetching users:", usersRes.reason);
        if (usersRes.reason?.response?.status === 401) {
          window.location.href = '/';
        }
      }

      // Process academic year
      if (yearRes.status === 'fulfilled' && yearRes.value.ok) {
        const year = await yearRes.value.json();
        setAcademicYear(year);
      } else {
        console.error("Failed to fetch academic year", yearRes.reason);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setIsLoadingChats(false);
      setIsLoading(false);
    }
  };

  // ================= FETCH USERS =================
  useEffect(() => {
    if (currentUserId) {
      fetchInitialData();
    }
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
        // Disable slow per-user fallback; rely on cached recent chats and real-time updates
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
            let otherUser = users.find(u => u._id === otherUserId);
            if (!otherUser) {
              // fetch minimal user profile if missing to avoid "Unknown User"
              // eslint-disable-next-line no-await-in-loop
              otherUser = await fetchUserIfMissing(otherUserId);
            }
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

  // Lightweight polling fallback for production where sockets may be blocked or cross-instance
  useEffect(() => {
    if (!currentUserId) return;
    const id = setInterval(() => {
      try { fetchRecentConversations(); } catch {}
    }, 4000);
    return () => clearInterval(id);
  }, [currentUserId]);

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
  const handleSyncGroupMembers = async () => {
    if (!selectedChat || !selectedChat.isGroup) return;
    try {
      const token = localStorage.getItem("token");
      
      // For SJDEF Forum, fetch all users and add them as participants
      if (selectedChat.name && selectedChat.name.toLowerCase() === "sjdef forum") {
        // Get all user IDs except current user
        const allUserIds = users
          .filter(user => user._id !== currentUserId)
          .map(user => user._id);
        
        // Update the group with all users
        await axios.put(`${API_BASE}/group-chats/${selectedChat._id}`, {
          participants: allUserIds
        }, {
          headers: { "Authorization": `Bearer ${token}` }
        });
      } else {
        // For other groups, use the existing sync method
        await axios.post(`${API_BASE}/group-chats/${selectedChat._id}/sync-members`, {}, {
          headers: { "Authorization": `Bearer ${token}` }
        });
      }
      
      // Refetch the group to update participants locally
      const res = await axios.get(`${API_BASE}/group-chats/${selectedChat._id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const updated = res.data;
      setUserGroups(prev => prev.map(g => g._id === updated._id ? { ...g, ...updated, isGroup: true } : g));
      if (selectedChat && selectedChat._id === updated._id) {
        setSelectedChat(prev => ({ ...(prev || {}), ...updated, isGroup: true }));
      }
      setValidationModal({ 
        isOpen: true, 
        type: 'success', 
        title: 'Refresh Complete', 
        message: selectedChat.name && selectedChat.name.toLowerCase() === "sjdef forum" 
          ? 'All active users added to SJDEF Forum.' 
          : 'Forum members synced with all active users.' 
      });
    } catch (err) {
      setValidationModal({ 
        isOpen: true, 
        type: 'error', 
        title: 'Refresh Failed', 
        message: err.response?.data?.error || 'Could not refresh forum members.' 
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && (!selectedFiles || selectedFiles.length === 0)) return;
    if (!selectedChat) return;
    if (isSending) return;

    setIsSending(true);
    try {
      const token = localStorage.getItem("token");

      // 1) Send text message first if present (no file)
      if (newMessage.trim()) {
        const textForm = new FormData();
        textForm.append("senderId", currentUserId);
        textForm.append("receiverId", selectedChat._id);
        textForm.append("message", newMessage.trim());

        const textRes = await axios.post(`${API_BASE}/messages`, textForm, {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          },
        });

        const textMessage = textRes.data;
          ctxSocket?.emit("sendMessage", {
            senderId: currentUserId,
            receiverId: selectedChat._id,
            text: textMessage.message,
            fileUrl: textMessage.fileUrl || null,
            fileName: textMessage.fileName || null,
          });

        setMessages((prev) => ({
          ...prev,
          [selectedChat._id]: [...(prev[selectedChat._id] || []), textMessage],
        }));
        setLastMessages(prev => ({
          ...prev,
          [selectedChat._id]: { prefix: 'You: ', text: textMessage.message }
        }));
        bumpChatToTop(selectedChat);
      }

      // 2) Send each selected file as its own message with empty text
      for (const file of (selectedFiles || [])) {
        console.log('Sending file:', file.name, 'Type:', file.type, 'Size:', file.size);
        const fileForm = new FormData();
        fileForm.append("senderId", currentUserId);
        fileForm.append("receiverId", selectedChat._id);
        fileForm.append("message", "");
        fileForm.append("file", file);

        try {
          const fileRes = await axios.post(`${API_BASE}/messages`, fileForm, {
            headers: {
              "Content-Type": "multipart/form-data",
              "Authorization": `Bearer ${token}`
            },
          });

          const fileMessage = fileRes.data;
          console.log('File sent successfully:', fileMessage);
          console.log('File message details:', {
            hasFileUrl: !!fileMessage.fileUrl,
            hasFileName: !!fileMessage.fileName,
            fileUrl: fileMessage.fileUrl,
            fileName: fileMessage.fileName,
            messageId: fileMessage._id
          });
          
          ctxSocket?.emit("sendMessage", {
            senderId: currentUserId,
            receiverId: selectedChat._id,
            text: fileMessage.message,
            fileUrl: fileMessage.fileUrl || null,
            fileName: fileMessage.fileName || null,
          });

          setMessages((prev) => {
            const updated = {
              ...prev,
              [selectedChat._id]: [...(prev[selectedChat._id] || []), fileMessage],
            };
            console.log('Updated messages state for chat:', selectedChat._id, 'Total messages:', updated[selectedChat._id]?.length);
            return updated;
          });
          setLastMessages(prev => ({
            ...prev,
            [selectedChat._id]: { prefix: 'You: ', text: fileMessage.fileUrl ? 'File sent' : '' }
          }));
          bumpChatToTop(selectedChat);
        } catch (fileError) {
          console.error('Error sending file:', fileError);
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'File Send Failed',
            message: `Failed to send file "${file.name}". ${fileError.response?.data?.error || fileError.message}`
          });
        }
      }

      setNewMessage("");
      setSelectedFiles([]);
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isSending) return;
      const now = Date.now();
      if (now - (lastSendRef.current || 0) < 400) return;
      lastSendRef.current = now;
      if (selectedChat && selectedChat.isGroup) {
        handleSendGroupMessage();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => {
        const existingNames = new Set(prev.map(f => `${f.name}|${f.size}|${f.lastModified}`));
        const additions = files.filter(f => !existingNames.has(`${f.name}|${f.size}|${f.lastModified}`));
        return [...prev, ...additions];
      });
      e.target.value = null;
    }
  };

  const openFilePicker = () => {
    fileInputRef.current.click();
  };

  const hideGroup = (groupId) => {
    if (!groupId) return;
    setHiddenGroupIds(prev => {
      const next = Array.from(new Set([...(prev||[]), groupId]));
      localStorage.setItem('hiddenGroups_admin', JSON.stringify(next));
      return next;
    });
    // If currently selected, clear selection
    if (selectedChat && selectedChat.isGroup && selectedChat._id === groupId) {
      setSelectedChat(null);
    }
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

  // Debounced backend search against users collection
  useEffect(() => {
    const term = (searchTerm || '').trim();
    if (term === '') { setSearchedUsers([]); return; }
    setIsSearching(true);
    const handle = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/users/search`, {
          params: { q: term },
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const arr = Array.isArray(res.data) ? res.data : [];
        setSearchedUsers(arr);
      } catch (e) {
        setSearchedUsers([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);



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
        
        // Join all groups in socket for real-time updates (avoid heavy prefetch of group messages)
        res.data.forEach(group => {
          ctxSocket?.emit("joinGroup", { userId: currentUserId, groupId: group._id });
        });

        // Lazily hydrate only visible group previews first for speed
        const hydrateRange = async (startIndex, endIndex) => {
          const slice = res.data.slice(startIndex, endIndex).filter(g => !fetchedGroupPreviewIds.current.has(g._id));
          if (slice.length === 0) return;
          slice.forEach(g => fetchedGroupPreviewIds.current.add(g._id));
          try {
            const batch = await Promise.all(
              slice.map(group =>
                axios
                  .get(`${API_BASE}/group-messages/${group._id}?userId=${currentUserId}&limit=1&sort=desc`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  .then(r => ({ groupId: group._id, list: Array.isArray(r.data) ? r.data : [] }))
                  .catch(() => ({ groupId: group._id, list: [] }))
              )
            );
            const previews = {};
            batch.forEach(({ groupId, list }) => {
              const last = list.length > 0 ? list[list.length - 1] : null;
              if (last) {
                const prefix = last.senderId === currentUserId ? 'You: ' : `${last.senderName || 'Unknown'}: `;
                const text = last.message ? last.message : (last.fileUrl ? 'File sent' : '');
                previews[groupId] = { prefix, text };
              }
            });
            if (Object.keys(previews).length > 0) {
              setLastMessages(prev => ({ ...prev, ...previews }));
            }
          } catch {
            // ignore batch failures
          }
        };

        // Initial hydrate for first items
        hydrateRange(0, 15);

        // Attach scroll listener to hydrate more as user scrolls
        const el = chatListRef.current;
        if (el) {
          let t = null;
          const onScroll = () => {
            if (t) cancelAnimationFrame(t);
            t = requestAnimationFrame(() => {
              const itemApproxHeight = 64; // px estimate
              const start = Math.max(0, Math.floor(el.scrollTop / itemApproxHeight) - 5);
              const end = start + 25;
              hydrateRange(start, end);
            });
          };
          el.addEventListener('scroll', onScroll);
          // cleanup
          return () => {
            el.removeEventListener('scroll', onScroll);
          };
        }
      } catch (err) {
        console.error("Error fetching user groups:", err);
      }
    };
    const cleanup = fetchUserGroups();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
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
    // For SJDEF Forum, we allow empty participants as we'll add all users
    const isSJDEFForum = groupName.toLowerCase() === "sjdef forum";
  
    if (!isSJDEFForum && (!groupName.trim() || selectedParticipants.length === 0)) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: "Please provide a group name and select at least one participant, or create an 'SJDEF Forum' to include all users"
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      // For SJDEF Forum, include all users
      let participants = selectedParticipants;
      if (isSJDEFForum) {
        // Get all user IDs except current user
        participants = users
          .filter(user => user._id !== currentUserId)
          .map(user => user._id);
      
        // If no users found, show a warning
        if (participants.length === 0) {
          setValidationModal({
            isOpen: true,
            type: 'warning',
            title: 'No Users Found',
            message: "No other users found to add to the forum"
          });
          return;
        }
      }
      
      const res = await axios.post(`${API_BASE}/group-chats`, {
        name: groupName,
        description: groupDescription,
        createdBy: currentUserId,
        participants: participants,
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
      ctxSocket?.emit("joinGroup", { userId: currentUserId, groupId: newGroup._id });
    } catch (err) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Creation Failed',
        message: err.response?.data?.error || "Error creating group. Please try again."
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
      ctxSocket?.emit("leaveGroup", { userId: currentUserId, groupId: selectedChat._id });
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
    if (!newMessage.trim() && (!selectedFiles || selectedFiles.length === 0)) return;
    if (!selectedChat || !selectedChat.isGroup) return;
    if (isSending) return;

    setIsSending(true);
    try {
      const token = localStorage.getItem("token");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;

      // 1) Send text message first if present
      if (newMessage.trim()) {
        const textForm = new FormData();
        textForm.append("groupId", selectedChat._id);
        textForm.append("senderId", currentUserId);
        textForm.append("message", newMessage.trim());

        const textRes = await axios.post(`${API_BASE}/group-messages`, textForm, {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          },
        });
        const textMessage = textRes.data;
        ctxSocket?.emit("sendGroupMessage", {
          senderId: currentUserId,
          groupId: selectedChat._id,
          text: textMessage.message,
          fileUrl: textMessage.fileUrl || null,
          fileName: textMessage.fileName || null,
          senderName: parsedUser ? `${parsedUser.firstname} ${parsedUser.lastname}` : "Unknown",
          senderFirstname: parsedUser ? parsedUser.firstname : "Unknown",
          senderLastname: parsedUser ? parsedUser.lastname : "User",
          senderProfilePic: parsedUser ? parsedUser.profilePic : null,
        });
        setGroupMessages((prev) => ({
          ...prev,
          [selectedChat._id]: [...(prev[selectedChat._id] || []), textMessage],
        }));
        setLastMessages(prev => ({
          ...prev,
          [selectedChat._id]: { prefix: 'You: ', text: textMessage.message }
        }));
      }

      // 2) Send each selected file as its own message with empty text
      for (const file of (selectedFiles || [])) {
        console.log('Sending group file:', file.name, 'Type:', file.type, 'Size:', file.size);
        const fileForm = new FormData();
        fileForm.append("groupId", selectedChat._id);
        fileForm.append("senderId", currentUserId);
        fileForm.append("message", "");
        fileForm.append("file", file);

        try {
          const fileRes = await axios.post(`${API_BASE}/group-messages`, fileForm, {
            headers: {
              "Content-Type": "multipart/form-data",
              "Authorization": `Bearer ${token}`
            },
          });
          const fileMessage = fileRes.data;
          console.log('Group file sent successfully:', fileMessage);
          
          ctxSocket?.emit("sendGroupMessage", {
            senderId: currentUserId,
            groupId: selectedChat._id,
            text: fileMessage.message,
            fileUrl: fileMessage.fileUrl || null,
            fileName: fileMessage.fileName || null,
            senderName: parsedUser ? `${parsedUser.firstname} ${parsedUser.lastname}` : "Unknown",
            senderFirstname: parsedUser ? parsedUser.firstname : "Unknown",
            senderLastname: parsedUser ? parsedUser.lastname : "User",
            senderProfilePic: parsedUser ? parsedUser.profilePic : null,
          });
          setGroupMessages((prev) => ({
            ...prev,
            [selectedChat._id]: [...(prev[selectedChat._id] || []), fileMessage],
          }));
          setLastMessages(prev => ({
            ...prev,
            [selectedChat._id]: { prefix: 'You: ', text: fileMessage.fileUrl ? 'File sent' : '' }
          }));
        } catch (fileError) {
          console.error('Error sending group file:', fileError);
          setValidationModal({
            isOpen: true,
            type: 'error',
            title: 'File Send Failed',
            message: `Failed to send file "${file.name}" to group. ${fileError.response?.data?.error || fileError.message}`
          });
        }
      }

      setNewMessage("");
      setSelectedFiles([]);
    } catch (err) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Send Failed',
        message: err.response?.data?.error || "Error sending group message"
      });
    } finally {
      setIsSending(false);
    }
  };



  // Merge recentChats and groups with messages (actual conversations)
  // Show all groups (except hidden) immediately for faster perceived load
  const groupsWithMessages = userGroups.filter(group => !hiddenGroupIds.includes(group._id));
  
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
          (chat.firstname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (chat.lastname || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else {
        return (chat.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      }
    }),
    // Then show backend user results not already in recent chats
    ...searchedUsers
      .filter(user => user._id !== currentUserId)
      .filter(user => !recentChats.some(chat => chat._id === user._id))
      .map(user => ({ ...user, type: 'new_user', isNewUser: true }))
  ];

  // Loading screen
  if (isLoading) {
    return (
      <div className="flex min-h-screen h-screen max-h-screen">
        <Admin_Navbar />
        <div className="flex-1 flex flex-col bg-gray-100 font-poppinsr overflow-hidden md:ml-64 h-full min-h-screen">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading chats...</p>
            <p className="text-gray-500 text-sm mt-2">Fetching users, conversations, and academic year information</p>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center justify-between mb-4 relative">
              <input
                type="text"
                placeholder="Search users or groups..."
                className="flex-1 p-2 border rounded-lg text-sm"
                value={searchTerm}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => { setSearchTerm(e.target.value); setShowSearchDropdown(true); }}
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
                      onClick={() => {
                        // Quick create SJDEF Forum
                        setGroupName("SJDEF Forum");
                        setShowCreateGroup(true);
                        setShowGroupMenu(false);
                      }}
                    >
                      Create SJDEF Forum
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
              {showSearchDropdown && searchTerm.trim() !== '' && (
                <div className="absolute left-0 top-10 w-[calc(100%-56px)] bg-white border rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
                  {isSearching && (
                    <div className="p-3 text-sm text-gray-500">Searching...</div>
                  )}
                  {!isSearching && (
                    <>
                      {/* Users results */}
                      {searchedUsers.filter(u => u._id !== currentUserId).length > 0 ? (
                        searchedUsers.filter(u => u._id !== currentUserId).map(user => (
                          <div
                            key={user._id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => { bumpChatToTop(user); setSelectedChat(user); setSearchTerm(''); setShowSearchDropdown(false); }}
                          >
                            <img src={getProfileImageUrl(user.profilePic, API_BASE, defaultAvatar)} alt="Profile" className="w-6 h-6 rounded-full object-cover border" onError={e => { e.target.onerror=null; e.target.src = defaultAvatar; }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate">{user.lastname}, {user.firstname}</div>
                              <div className="text-[11px] text-gray-500 truncate">Click to start new chat</div>
                            </div>
                            {/* Removed "New" badge for cleaner dropdown */}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
                      )}
                      <div className="h-px bg-gray-200 my-1" />
                      {/* Group matches by name */}
                      {userGroups.filter(g => (g.name || '').toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                        userGroups
                          .filter(g => (g.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
                          .map(g => (
                            <div key={g._id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => { setSelectedChat({ ...g, isGroup: true }); setSearchTerm(''); setShowSearchDropdown(false); }}>
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">G</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm truncate">{g.name}</div>
                                <div className="text-[11px] text-gray-500">{g.participants?.length || 0} participants</div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">No groups found</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* New Chat Button */}
            {/* Removed the Start New Chat button as requested */}

            {/* Unified Chat List */}
            <div ref={chatListRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoadingChats ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading chats...</p>
                </div>
              ) : (
                unifiedChats.length > 0 ? (
                  unifiedChats.map((chat) => (
                    <div
                      key={chat._id}
                      className={`group relative flex items-center p-3 rounded-lg cursor-pointer shadow-sm transition-all ${
                        (selectedChat?._id === chat._id && ((selectedChat.isGroup && chat.type === 'group') || (!selectedChat.isGroup && chat.type === 'individual')))
                          ? "bg-white"
                          : (highlightedChats[chat._id] ? "bg-yellow-50 ring-2 ring-yellow-400" : "bg-gray-100 hover:bg-gray-300")
                      }`}
                      onClick={() => {
                        if (chat.type === 'group') {
                          setSelectedChat({ ...chat, isGroup: true });
                          localStorage.setItem("selectedChatId_admin", chat._id);
                          clearHighlight(chat._id);
                        } else {
                          setSelectedChat(chat);
                          localStorage.setItem("selectedChatId_admin", chat._id);
                          clearHighlight(chat._id);
                        }
                      }}
                    >
                      {/* Remove (X) button for individual chats */}
                      {chat.type === 'individual' && (
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                          title="Remove from list"
                          onClick={(e) => { e.stopPropagation(); removeFromRecent(chat._id); }}
                        >
                          &times;
                        </button>
                      )}
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
                        {(() => {
                          const preview = getLastPreview(chat);
                          return preview ? (
                            <span className="text-xs text-gray-500 truncate">
                              {preview.prefix}{preview.text}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      {chat.type === 'group' && (
                        <>
                          <span className="ml-2 text-blue-900 text-xs font-bold">Group</span>
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                            title="Hide group"
                            onClick={(e) => { e.stopPropagation(); hideGroup(chat._id); }}
                          >
                            &times;
                          </button>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-center mt-10 select-none">
                    No chats found
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
                        {selectedChat.name && selectedChat.name.toLowerCase() === "sjdef forum" && (
                          <button
                            onClick={handleSyncGroupMembers}
                            title="Refresh members from Users"
                            className="bg-blue-200 text-blue-900 px-3 py-1 rounded-lg hover:bg-blue-300 transition-colors text-sm mr-2"
                          >
                            Refresh Members
                          </button>
                        )}
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
                  {(() => {
                    const chatMessages = selectedChat.isGroup ? groupMessages[selectedChat._id] || [] : messages[selectedChat._id] || [];
                    console.log('Rendering messages for chat:', selectedChat._id, 'Message count:', chatMessages.length);
                    chatMessages.forEach((msg, idx) => {
                      if (msg.fileUrl) {
                        console.log(`Message ${idx} has file:`, { fileUrl: msg.fileUrl, fileName: msg.fileName, _id: msg._id });
                      }
                    });
                    return chatMessages;
                  })().map((msg, index, arr) => {
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
                            {(() => {
                              // Debug: Log file info
                              if (msg.fileUrl) {
                                console.log('Rendering file for message:', {
                                  messageId: msg._id,
                                  fileUrl: msg.fileUrl,
                                  fileName: msg.fileName,
                                  hasFileUrl: !!msg.fileUrl,
                                  hasFileName: !!msg.fileName
                                });
                              }
                              return null;
                            })()}
                            {msg.fileUrl && (
                              <div className="mt-2">
                                {(() => {
                                  // Check if fileUrl is already a full URL (Cloudinary) or relative path
                                  const isFullUrl = msg.fileUrl.startsWith('http://') || msg.fileUrl.startsWith('https://');
                                  const fileUrl = isFullUrl ? msg.fileUrl : `${API_BASE}/${msg.fileUrl}`;
                                  
                                  // Use stored fileName if available, otherwise try to extract from URL
                                  let fileName = msg.fileName;
                                  if (!fileName) {
                                    // Try to extract filename from URL
                                    const urlParts = msg.fileUrl.split('/');
                                    const lastPart = urlParts[urlParts.length - 1].split('?')[0];
                                    
                                    // For Cloudinary raw files, we might need to guess the extension
                                    // Check if it's a raw file (no extension in URL)
                                    if (msg.fileUrl.includes('/raw/upload/')) {
                                      // For raw files without extension, use a generic name
                                      fileName = `attachment_${lastPart}`;
                                    } else {
                                      // Try to get extension from URL or use last part
                                      fileName = lastPart;
                                    }
                                  }
                                  const fileExtension = fileName.split('.').pop().toLowerCase();
                                  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);
                                  const isExcel = /\.(xlsx|xls)$/i.test(fileName);
                                  const isPDF = /\.(pdf)$/i.test(fileName);
                                  const isWord = /\.(doc|docx)$/i.test(fileName);
                                  const isPowerPoint = /\.(ppt|pptx)$/i.test(fileName);
                                  
                                  // Handle file download with proper filename
                                  const handleFileDownload = async (e) => {
                                    e.preventDefault();
                                    try {
                                      console.log('Downloading file:', { fileUrl, fileName });
                                      
                                      // For Cloudinary raw files, we need to fetch as arrayBuffer to preserve binary data
                                      const isCloudinaryRaw = fileUrl.includes('res.cloudinary.com') && fileUrl.includes('/raw/upload/');
                                      
                                      let downloadUrl = fileUrl;
                                      if (fileUrl.includes('res.cloudinary.com')) {
                                        // Check if URL already has query parameters
                                        const separator = fileUrl.includes('?') ? '&' : '?';
                                        // Add fl_attachment with filename to force proper download
                                        downloadUrl = `${fileUrl}${separator}fl_attachment:${encodeURIComponent(fileName)}`;
                                      }
                                      
                                      // Fetch the file
                                      const response = await fetch(downloadUrl, {
                                        method: 'GET',
                                        mode: 'cors',
                                      });
                                      
                                      if (!response.ok) {
                                        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
                                      }
                                      
                                      let blob;
                                      if (isCloudinaryRaw) {
                                        // For raw files, fetch as arrayBuffer to preserve binary integrity
                                        const arrayBuffer = await response.arrayBuffer();
                                        // Determine MIME type from file extension or response header
                                        let mimeType = response.headers.get('content-type') || 'application/octet-stream';
                                        
                                        // Override with more specific MIME type if we have file extension
                                        if (fileName.endsWith('.xlsx')) {
                                          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                                        } else if (fileName.endsWith('.xls')) {
                                          mimeType = 'application/vnd.ms-excel';
                                        } else if (fileName.endsWith('.pdf')) {
                                          mimeType = 'application/pdf';
                                        } else if (fileName.endsWith('.docx')) {
                                          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                                        } else if (fileName.endsWith('.doc')) {
                                          mimeType = 'application/msword';
                                        }
                                        
                                        blob = new Blob([arrayBuffer], { type: mimeType });
                                        console.log('Raw file blob created:', { size: blob.size, type: blob.type, originalType: response.headers.get('content-type'), fileName });
                                      } else {
                                        blob = await response.blob();
                                        console.log('File blob created:', { size: blob.size, type: blob.type });
                                      }
                                      
                                      // Create download link with proper filename
                                      const blobUrl = window.URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = blobUrl;
                                      link.download = fileName;
                                      link.style.display = 'none';
                                      document.body.appendChild(link);
                                      link.click();
                                      setTimeout(() => {
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(blobUrl);
                                      }, 100);
                                    } catch (error) {
                                      console.error('Error downloading file:', error);
                                      // Fallback: try direct download with Cloudinary attachment parameter
                                      if (fileUrl.includes('res.cloudinary.com')) {
                                        const separator = fileUrl.includes('?') ? '&' : '?';
                                        const downloadUrl = `${fileUrl}${separator}fl_attachment:${encodeURIComponent(fileName)}`;
                                        window.open(downloadUrl, '_blank');
                                      } else {
                                        window.open(fileUrl, '_blank');
                                      }
                                    }
                                  };
                                  
                                  return isImage ? (
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" onClick={handleFileDownload}>
                                      <img
                                        src={fileUrl}
                                        alt="Attachment preview"
                                        className="rounded-md max-h-56 max-w-full object-contain border border-white/30"
                                        loading="lazy"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={fileUrl}
                                      onClick={handleFileDownload}
                                      className={`${msg.senderId !== currentUserId ? "text-blue-700" : "text-blue-100"} underline decoration-current/40 hover:decoration-current flex items-center gap-2 cursor-pointer`}
                                    >
                                      {isExcel && "📊"}
                                      {isPDF && "📄"}
                                      {isWord && "📝"}
                                      {isPowerPoint && "📊"}
                                      {!isExcel && !isPDF && !isWord && !isPowerPoint && "📎"}
                                      <span>
                                        {isExcel ? "Excel File" : 
                                         isPDF ? "PDF Document" :
                                         isWord ? "Word Document" :
                                         isPowerPoint ? "PowerPoint" :
                                         "Attachment"}
                                      </span>
                                      <span className="text-xs opacity-75">
                                        ({msg.fileName ? fileName : (fileName.startsWith('attachment_') ? 'File' : fileName)})
                                      </span>
                                    </a>
                                  );
                                })()
                                }
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
                      title="Attach file"
                    >
                      <img src={uploadfile} alt="Upload" className="w-5 h-5" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.ppt,.pptx"
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
                      disabled={isSending || (!newMessage.trim() && (!selectedFiles || selectedFiles.length === 0))}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                  {selectedFiles && selectedFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {selectedFiles.map((file, idx) => (
                        <div key={`${file.name}-${file.size}-${file.lastModified}-${idx}`} className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
                          <span className="text-sm text-gray-700 truncate max-w-[160px]" title={file.name}>{file.name}</span>
                          <button
                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={openFilePicker}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add more
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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Create New Group</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Group Name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Special button for SJDEF Forum */}
                {groupName.toLowerCase() === "sjdef forum" && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>SJDEF Forum detected:</strong> This will create a forum with all users in the system.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        // Select all users when creating SJDEF Forum
                        const allUserIds = users
                          .filter(user => user._id !== currentUserId)
                          .map(user => user._id);
                        setSelectedParticipants(allUserIds);
                      }}
                      className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      Select All Users ({users.filter(user => user._id !== currentUserId).length})
                    </button>
                  </div>
                )}
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
                  <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto">
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
                    disabled={!groupName.trim() || (groupName.toLowerCase() !== "sjdef forum" && selectedParticipants.length === 0)}
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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
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
