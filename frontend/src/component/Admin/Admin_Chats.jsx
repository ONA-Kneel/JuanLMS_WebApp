// Admin_Chats.jsx

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { useSocket } from "../../contexts/SocketContext.jsx";
import uploadfile from "../../assets/uploadfile.png";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import ForumModal from "../common/ForumModal.jsx";
import defaultAvatar from "../../assets/profileicon (1).svg";
import { useNavigate } from "react-router-dom";
import ValidationModal from "../ValidationModal";
import { getProfileImageUrl } from "../../utils/imageUtils";

const API_BASE = import.meta.env.VITE_API_BASE || "https://juanlms-webapp-server.onrender.com";

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
  const [showForumModal, setShowForumModal] = useState(false);
  const [activeForumThreadId, setActiveForumThreadId] = useState(null);
  const [forumPostTitle, setForumPostTitle] = useState("");
  const [forumPostBody, setForumPostBody] = useState("");
  const [forumReplyBody, setForumReplyBody] = useState("");
  const [forumPostFiles, setForumPostFiles] = useState([]);
  const [forumReplyFiles, setForumReplyFiles] = useState([]);
  const [isPostingThread, setIsPostingThread] = useState(false);
  const [isPostingReply, setIsPostingReply] = useState(false);

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
  const userLookup = useMemo(() => {
    const map = new Map();
    (users || []).forEach(user => {
      if (user && user._id) {
        map.set(user._id, user);
      }
    });
    return map;
  }, [users]);
  // Backend search results from users collection
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [hiddenGroupIds, setHiddenGroupIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hiddenGroups_admin') || '[]'); } catch { return []; }
  });
  
  // Add missing state variables for new chat functionality
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
      try {
        localStorage.setItem('highlightedChats_admin', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to persist highlighted chats', err);
      }
      return next;
    });
  };
  const clearHighlight = (chatId) => {
    if (!chatId) return;
    setHighlightedChats(prev => {
      if (!prev[chatId]) return prev;
      const { [chatId]: _omit, ...rest } = prev;
      try {
        localStorage.setItem('highlightedChats_admin', JSON.stringify(rest));
      } catch (err) {
        console.error('Failed to update highlighted chats', err);
      }
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
  const usersRef = useRef([]);
  const lastSendRef = useRef(0);

  const API_URL = (import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com").replace(/\/$/, "");
  const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_URL).replace(/\/$/, "");
  const isForumChat = selectedChat?.isGroup && (selectedChat?.name || "").toLowerCase() === "sjdef forum";

  useEffect(() => {
    if (!isForumChat) {
      setShowForumModal(false);
    }
  }, [isForumChat]);

  const storedUser = localStorage.getItem("user");
  const parsedCurrentUser = useMemo(() => {
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }, [storedUser]);
  const currentUserId = parsedCurrentUser?._id || null;

  const navigate = useNavigate();
  // Sync refs with latest state
  useEffect(() => { recentChatsRef.current = recentChats; }, [recentChats]);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { usersRef.current = users; }, [users]);

  // Fetch a single user by id and merge to cache/state
  const fetchUserIfMissing = useCallback(async (userId) => {
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
          try {
            localStorage.setItem('users_all_admin', JSON.stringify(next));
          } catch (err) {
            console.error('Failed to cache users', err);
          }
          return next;
        });
        return fetched;
      }
    } catch (e) {
      if (e.response?.status === 404) {
        console.warn(`User ${userId} not found when fetching for chat list`);
      } else {
        console.error('Error fetching user profile', e);
      }
    }
    return null;
  }, [users]);

  // Fetch recent conversations (shared across effects & sockets)
  const fetchRecentConversations = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const token = localStorage.getItem("token");
      let allMessages = [];
      
      try {
        const res = await axios.get(`${API_BASE}/messages/user/${currentUserId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        allMessages = res.data || [];
      } catch {
        // rely on cached recent chats and socket updates if bulk fetch fails
      }
      
      if (allMessages.length > 0) {
        const conversationMap = new Map();
        allMessages.forEach(message => {
          const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
          if (!conversationMap.has(otherUserId)) {
            conversationMap.set(otherUserId, []);
          }
          conversationMap.get(otherUserId).push(message);
        });
        
        const newRecentChats = [];
        for (const [otherUserId, convMessages] of conversationMap) {
          if (convMessages.length === 0) continue;
          let otherUser = users.find(u => u._id === otherUserId);
          if (!otherUser) {
            otherUser = await fetchUserIfMissing(otherUserId);
          }
          if (otherUser && otherUser.firstname && otherUser.lastname &&
              otherUser.firstname !== 'undefined' && otherUser.lastname !== 'undefined') {
            const sortedMessages = convMessages.sort((a, b) => new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt));
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
        
        newRecentChats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
        
        if (newRecentChats.length > 0) {
          setRecentChats(newRecentChats);
          localStorage.setItem("recentChats_admin", JSON.stringify(newRecentChats));
        }
      }
    } catch (error) {
      console.error("Error fetching recent conversations:", error);
    }
  }, [currentUserId, users, fetchUserIfMissing]);

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
          const endRef = messagesEndRef.current;
          if (endRef && typeof endRef.scrollIntoView === "function") {
            endRef.scrollIntoView({ behavior: "smooth" });
          }
        }, 25);
      }
    };
    ctxSocket.on("getMessage", handleIncomingDirect);
    ctxSocket.on("receiveMessage", handleIncomingDirect);

    // Group chat message handling
    const handleIncomingGroup = (data) => {
      // Normalize fields to ensure consistency
      const normalizedParentId = data.parentMessageId && String(data.parentMessageId).trim() ? String(data.parentMessageId) : null;
      const normalizedThreadId = data.threadId && String(data.threadId).trim() ? String(data.threadId) : (normalizedParentId ? null : (data._id ? String(data._id) : null));
      const normalizedTitle = data.title && String(data.title).trim() ? String(data.title).trim() : null;
      
      const incomingGroupMessage = {
        _id: data._id || null,
        senderId: data.senderId,
        groupId: data.groupId,
        message: data.text || data.message || null,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        parentMessageId: normalizedParentId,
        threadId: normalizedThreadId,
        title: normalizedTitle,
        senderName: data.senderName || "Unknown",
        senderFirstname: data.senderFirstname || "Unknown",
        senderLastname: data.senderLastname || "User",
        senderProfilePic: data.senderProfilePic || null,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || null,
      };

      setGroupMessages((prev) => {
        const existing = prev[incomingGroupMessage.groupId] || [];
        // Check for duplicates by _id
        if (incomingGroupMessage._id && existing.some(m => m._id === incomingGroupMessage._id)) {
          return prev;
        }
        const newGroupMessages = {
          ...prev,
          [incomingGroupMessage.groupId]: [
            ...existing,
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
    
    // Handle forum posts separately
    const handleIncomingForumPost = (data) => {
      // Normalize forum post data to match group message format
      const incomingPost = {
        _id: data._id || null,
        senderId: data.senderId,
        groupId: data.groupId,
        message: data.text || data.message || null,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        parentMessageId: data.parentPostId || data.parentMessageId || null,
        parentPostId: data.parentPostId || null,
        threadId: data.threadId || null,
        title: data.title || null,
        isRootPost: data.isRootPost !== undefined ? data.isRootPost : !data.parentPostId,
        senderName: data.senderName || "Unknown",
        senderFirstname: data.senderFirstname || "Unknown",
        senderLastname: data.senderLastname || "User",
        senderProfilePic: data.senderProfilePic || null,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || null,
      };

      setGroupMessages((prev) => {
        const existing = prev[incomingPost.groupId] || [];
        if (incomingPost._id && existing.some(m => m._id === incomingPost._id)) {
          return prev;
        }
        return {
          ...prev,
          [incomingPost.groupId]: [...existing, incomingPost],
        };
      });
    };
    ctxSocket.on("getForumPost", handleIncomingForumPost);

    return () => {
      ctxSocket.off("getMessage", handleIncomingDirect);
      ctxSocket.off("receiveMessage", handleIncomingDirect);
      ctxSocket.off("getGroupMessage", handleIncomingGroup);
      ctxSocket.off("getForumPost", handleIncomingForumPost);
    };
  }, [ctxSocket, isConnected, currentUserId, selectedChat, recentChats, users, userGroups, fetchRecentConversations, fetchUserIfMissing]);

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
        try {
          localStorage.setItem('users_all_admin', JSON.stringify(userArray));
        } catch (err) {
          console.error('Failed to cache users', err);
        }
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

  useEffect(() => {
    // Run immediately if we have the required data
    if (currentUserId && users.length > 0) {
      fetchRecentConversations();
    }
  }, [currentUserId, users, fetchRecentConversations]); // Dependencies ensure it runs when data is available

  // Lightweight polling fallback for production where sockets may be blocked or cross-instance
  useEffect(() => {
    if (!currentUserId) return;
    const id = setInterval(() => {
      fetchRecentConversations().catch(err => {
        console.error('Polling recent conversations failed', err);
      });
    }, 4000);
    return () => clearInterval(id);
  }, [currentUserId, fetchRecentConversations]);

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
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/messages/${currentUserId}/${selectedChat._id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
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
        if (err.response?.status === 401) {
          window.location.href = "/";
        }
      }
    };

    fetchMessages();
  }, [selectedChat, currentUserId, recentChats]);

  // Auto-scroll
  const renderedMessages = useMemo(() => {
    if (!selectedChat) return [];
    if (selectedChat.isGroup) {
      return groupMessages[selectedChat._id] || [];
    }
    return messages[selectedChat._id] || [];
  }, [selectedChat, groupMessages, messages]);

  useEffect(() => {
    if (isForumChat) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [renderedMessages, isForumChat]);

  const forumThreads = useMemo(() => {
    if (!isForumChat || !selectedChat?._id) return [];
    const sourceMessages = groupMessages[selectedChat._id] || [];
    
    // Debug: Log all messages to see their structure
    if (sourceMessages.length > 0) {
      console.log('[ForumThreads] Processing messages:', sourceMessages.length);
      sourceMessages.forEach((msg, idx) => {
        console.log(`[ForumThreads] Message ${idx}:`, {
          _id: msg._id,
          parentMessageId: msg.parentMessageId,
          threadId: msg.threadId,
          title: msg.title,
          hasParent: !!msg.parentMessageId,
          parentType: typeof msg.parentMessageId,
          messagePreview: msg.message?.substring(0, 30)
        });
      });
    }
    
    const threadMap = new Map();
    const messageMap = new Map(); // Map of _id to message for quick lookup
    
    // First, create a map of all messages by _id for quick parent lookup
    sourceMessages.forEach(msg => {
      const msgId = msg._id ? String(msg._id) : null;
      if (msgId) {
        messageMap.set(msgId, msg);
      }
    });
    
    // Process messages in two passes: root posts first, then replies
    const rootPosts = [];
    const replies = [];
    
    sourceMessages.forEach(msg => {
      // Use isRootPost if available (from new forum API)
      if (msg.isRootPost === false) {
        // This is definitely a reply
        replies.push(msg);
        return;
      }
      if (msg.isRootPost === true) {
        // This is definitely a root post
        rootPosts.push(msg);
        return;
      }
      
      // Fallback: check parentMessageId/parentPostId
      let msgParentId = null;
      const rawParentId = msg.parentMessageId || msg.parentPostId;
      if (rawParentId !== null && rawParentId !== undefined) {
        const parentStr = String(rawParentId).trim();
        if (parentStr && parentStr !== 'null' && parentStr !== 'undefined' && parentStr !== '') {
          msgParentId = parentStr;
        }
      }
      
      if (msgParentId) {
        replies.push(msg);
      } else {
        rootPosts.push(msg);
      }
    });
    
    console.log('[ForumThreads] Categorized:', { rootPosts: rootPosts.length, replies: replies.length });
    
    // First pass: Process root posts
    rootPosts.forEach(msg => {
      const msgThreadId = msg.threadId && String(msg.threadId).trim() ? String(msg.threadId) : null;
      const msgId = msg._id ? String(msg._id) : null;
      
      // For root posts, threadId should be the message's own _id
      const threadKey = msgThreadId || msgId;
      if (!threadKey) {
        console.warn('Skipping root post without _id:', msg);
        return;
      }
      
      const key = String(threadKey);
      if (!threadMap.has(key)) {
        threadMap.set(key, { threadId: key, root: null, rootTimestamp: 0, replies: [] });
      }
      const thread = threadMap.get(key);
      const timestamp = new Date(msg.createdAt || msg.updatedAt || 0).getTime();
      
      if (!thread.root) {
        thread.root = msg;
        thread.rootTimestamp = timestamp;
      } else if (timestamp < thread.rootTimestamp) {
        // This root post is older, make it the root
        thread.replies.push(thread.root);
        thread.root = msg;
        thread.rootTimestamp = timestamp;
      } else {
        // This root post is newer, add to replies (shouldn't happen normally)
        thread.replies.push(msg);
      }
    });
    
    // Second pass: Process replies
    replies.forEach(msg => {
      // Normalize parentMessageId again
      let msgParentId = null;
      if (msg.parentMessageId) {
        const parentStr = String(msg.parentMessageId).trim();
        if (parentStr && parentStr !== 'null' && parentStr !== 'undefined' && parentStr !== '') {
          msgParentId = parentStr;
        }
      }
      
      const msgThreadId = msg.threadId && String(msg.threadId).trim() ? String(msg.threadId) : null;
      
      let threadKey = msgThreadId;
      
      // If threadId is missing, find parent and use its threadId
      if (!threadKey && msgParentId) {
        const parentMsg = messageMap.get(msgParentId);
        if (parentMsg) {
          // If parent is also a reply, recursively find the root
          let currentParent = parentMsg;
          let depth = 0;
          while (currentParent && currentParent.parentMessageId && depth < 10) {
            const parentId = String(currentParent.parentMessageId).trim();
            if (parentId && parentId !== 'null') {
              currentParent = messageMap.get(parentId);
              depth++;
            } else {
              break;
            }
          }
          
          // Now get threadId from the root parent
          const rootThreadId = currentParent?.threadId && String(currentParent.threadId).trim()
            ? String(currentParent.threadId)
            : (currentParent && !currentParent.parentMessageId ? String(currentParent._id) : null);
          
          if (rootThreadId) {
            threadKey = rootThreadId;
            // Update the message's threadId for consistency
            msg.threadId = rootThreadId;
          } else if (currentParent && !currentParent.parentMessageId) {
            // Parent is a root post
            threadKey = String(currentParent._id);
            msg.threadId = threadKey;
          }
        } else {
          // Parent not in message list - use parentMessageId as threadId (assuming parent is root)
          threadKey = msgParentId;
          msg.threadId = threadKey;
        }
      }
      
      if (!threadKey) {
        console.error('Skipping reply without valid threadId or parent:', {
          _id: msg._id,
          parentMessageId: msg.parentMessageId,
          threadId: msg.threadId,
          message: msg.message?.substring(0, 50)
        });
        return;
      }
      
      const key = String(threadKey);
      if (!threadMap.has(key)) {
        // Parent thread doesn't exist yet - this shouldn't happen, but create placeholder
        console.warn('Reply found before its parent thread, creating placeholder thread:', {
          key,
          replyId: msg._id,
          parentId: msgParentId
        });
        threadMap.set(key, { threadId: key, root: null, rootTimestamp: 0, replies: [] });
      }
      
      const thread = threadMap.get(key);
      // Replies should NEVER be root posts - always add to replies array
      thread.replies.push(msg);
    });

    return Array.from(threadMap.values())
      .filter(thread => {
        // Only return threads that have a root post
        // Also ensure the root post doesn't have a parentMessageId (shouldn't happen, but safety check)
        if (!thread.root) return false;
        const rootParentId = thread.root.parentMessageId;
        if (rootParentId) {
          const parentStr = String(rootParentId).trim();
          if (parentStr && parentStr !== 'null' && parentStr !== 'undefined' && parentStr !== '') {
            console.error('Root post has parentMessageId - this should not happen:', {
              rootId: thread.root._id,
              parentId: rootParentId,
              threadId: thread.threadId
            });
            return false; // Don't show corrupted threads
          }
        }
        return true;
      })
      .map(thread => {
        // Final safety check: filter out any replies that somehow ended up in root
        const cleanReplies = thread.replies.filter(reply => {
          const replyParentId = reply.parentMessageId;
          if (!replyParentId) {
            console.warn('Reply without parentMessageId found in replies array:', reply._id);
            return false;
          }
          return true;
        });
        
        return {
          threadId: thread.threadId,
          root: thread.root,
          replies: cleanReplies.sort(
            (a, b) => new Date(a.createdAt || a.updatedAt || 0) - new Date(b.createdAt || b.updatedAt || 0)
          ),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.root?.createdAt || b.root?.updatedAt || 0) -
          new Date(a.root?.createdAt || a.root?.updatedAt || 0)
      );
  }, [isForumChat, groupMessages, selectedChat?._id]);

  const activeForumThread = useMemo(() => {
    if (!forumThreads.length) return null;
    if (!activeForumThreadId) return forumThreads[0];
    return forumThreads.find(thread => thread.threadId === activeForumThreadId) || forumThreads[0];
  }, [forumThreads, activeForumThreadId]);

  useEffect(() => {
    if (!isForumChat) {
      setActiveForumThreadId(null);
      setForumPostTitle("");
      setForumPostBody("");
      setForumPostFiles([]);
      setForumReplyBody("");
      setForumReplyFiles([]);
      return;
    }
    if (forumThreads.length === 0) {
      setActiveForumThreadId(null);
      return;
    }
    if (!activeForumThreadId || !forumThreads.some(thread => thread.threadId === activeForumThreadId)) {
      setActiveForumThreadId(forumThreads[0].threadId);
    }
  }, [isForumChat, forumThreads, activeForumThreadId]);

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
          ctxSocket?.emit("sendMessage", {
            senderId: currentUserId,
            receiverId: selectedChat._id,
            text: fileMessage.message,
            fileUrl: fileMessage.fileUrl || null,
            fileName: fileMessage.fileName || null,
          });

          setMessages((prev) => ({
              ...prev,
              [selectedChat._id]: [...(prev[selectedChat._id] || []), fileMessage],
          }));
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

  const handleForumFileSelect = (e, target = "post") => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const dedupe = (prev, additions) => {
      const existing = new Set(prev.map(f => `${f.name}|${f.size}|${f.lastModified}`));
      const next = additions.filter(f => !existing.has(`${f.name}|${f.size}|${f.lastModified}`));
      return [...prev, ...next];
    };
    if (target === "reply") {
      setForumReplyFiles(prev => dedupe(prev, files));
    } else {
      setForumPostFiles(prev => dedupe(prev, files));
    }
    e.target.value = null;
  };

  const removeForumFile = (target, index) => {
    if (target === "reply") {
      setForumReplyFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setForumPostFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const emitGroupSocketMessage = (message, targetGroupId = selectedChat?._id) => {
    if (!ctxSocket || !targetGroupId || !message) return;
    ctxSocket.emit("sendGroupMessage", {
      senderId: currentUserId,
      groupId: targetGroupId,
      text: message.message,
      fileUrl: message.fileUrl || null,
      fileName: message.fileName || null,
      senderName: parsedCurrentUser ? `${parsedCurrentUser.firstname} ${parsedCurrentUser.lastname}` : "Unknown",
      senderFirstname: parsedCurrentUser ? parsedCurrentUser.firstname : "Unknown",
      senderLastname: parsedCurrentUser ? parsedCurrentUser.lastname : "User",
      senderProfilePic: parsedCurrentUser ? parsedCurrentUser.profilePic : null,
      threadId: message.threadId || null,
      parentMessageId: message.parentMessageId || null,
      title: message.title || null,
    });
  };

  const appendGroupMessageToState = (message, targetGroupId = selectedChat?._id) => {
    if (!targetGroupId || !message) return;
    setGroupMessages((prev) => {
      const existing = prev[targetGroupId] || [];
      if (existing.some(m => m._id === message._id)) {
        return prev;
      }
      // Normalize message fields to ensure consistency
      const normalizedMessage = {
        ...message,
        parentMessageId: message.parentMessageId && String(message.parentMessageId).trim() ? String(message.parentMessageId) : null,
        threadId: message.threadId && String(message.threadId).trim() ? String(message.threadId) : (message.parentMessageId ? null : (message._id ? String(message._id) : null)),
        title: message.title && String(message.title).trim() ? String(message.title).trim() : null,
      };
      return {
        ...prev,
        [targetGroupId]: [...existing, normalizedMessage],
      };
    });
    const previewText = message.message ? message.message : (message.fileUrl ? 'File sent' : '');
    setLastMessages(prev => ({
      ...prev,
      [targetGroupId]: {
        prefix: message.senderId === currentUserId ? 'You: ' : `${message.senderName || 'Member'}: `,
        text: previewText
      }
    }));
  };

  const getAttachmentMeta = (msg) => {
    if (!msg?.fileUrl) return null;
    const isFullUrl = /^https?:\/\//i.test(msg.fileUrl);
    const resolvedUrl = isFullUrl ? msg.fileUrl : `${API_BASE}/${msg.fileUrl}`;
    let resolvedName = msg.fileName;
    if (!resolvedName) {
      const urlParts = msg.fileUrl.split('/');
      const lastPart = urlParts[urlParts.length - 1]?.split('?')[0];
      resolvedName = msg.fileUrl.includes('/raw/upload/') ? `attachment_${lastPart}` : (lastPart || 'attachment');
    }
    const lowerName = resolvedName.toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerName);
    const isExcel = /\.(xlsx|xls|csv)$/i.test(lowerName);
    const isPDF = lowerName.endsWith('.pdf');
    const isWord = lowerName.endsWith('.doc') || lowerName.endsWith('.docx');
    const isPowerPoint = lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx');
    return {
      fileUrl: resolvedUrl,
      fileName: resolvedName,
      isImage,
      isExcel,
      isPDF,
      isWord,
      isPowerPoint,
      isCloudinaryRaw: resolvedUrl.includes('res.cloudinary.com') && resolvedUrl.includes('/raw/upload/')
    };
  };

  const renderAttachmentPreview = (msg, isOwnBubble = false) => {
    if (!msg?.fileUrl) return null;
    const meta = getAttachmentMeta(msg);
    if (!meta) return null;
    const handleDownload = async (e) => {
      e.preventDefault();
      try {
        let downloadUrl = meta.fileUrl;
        if (meta.fileUrl.includes('res.cloudinary.com')) {
          const separator = meta.fileUrl.includes('?') ? '&' : '?';
          downloadUrl = `${meta.fileUrl}${separator}fl_attachment:${encodeURIComponent(meta.fileName)}`;
        }
        const response = await fetch(downloadUrl, { method: 'GET', mode: 'cors' });
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
        let blob;
        if (meta.isCloudinaryRaw) {
          const arrayBuffer = await response.arrayBuffer();
          let mimeType = response.headers.get('content-type') || 'application/octet-stream';
          if (meta.fileName.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          else if (meta.fileName.endsWith('.xls') || meta.fileName.endsWith('.csv')) mimeType = 'application/vnd.ms-excel';
          else if (meta.fileName.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (meta.fileName.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (meta.fileName.endsWith('.doc')) mimeType = 'application/msword';
          blob = new Blob([arrayBuffer], { type: mimeType });
        } else {
          blob = await response.blob();
        }
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = meta.fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 120);
      } catch (error) {
        console.error('Error downloading file:', error);
        if (meta.fileUrl.includes('res.cloudinary.com')) {
          const separator = meta.fileUrl.includes('?') ? '&' : '?';
          const fallbackUrl = `${meta.fileUrl}${separator}fl_attachment:${encodeURIComponent(meta.fileName)}`;
          window.open(fallbackUrl, '_blank');
        } else {
          window.open(meta.fileUrl, '_blank');
        }
      }
    };

    if (meta.isImage) {
      return (
        <a href={meta.fileUrl} target="_blank" rel="noopener noreferrer" onClick={handleDownload}>
          <img
            src={meta.fileUrl}
            alt="Attachment preview"
            className="rounded-md max-h-56 max-w-full object-contain border border-white/30 mt-2"
            loading="lazy"
          />
        </a>
      );
    }

    return (
      <a
        href={meta.fileUrl}
        onClick={handleDownload}
        className={`${isOwnBubble ? "text-blue-100" : "text-blue-700"} underline decoration-current/40 hover:decoration-current flex items-center gap-2 cursor-pointer mt-2`}
      >
        {meta.isExcel && "📊"}
        {meta.isPDF && "📄"}
        {meta.isWord && "📝"}
        {meta.isPowerPoint && "📊"}
        {!meta.isExcel && !meta.isPDF && !meta.isWord && !meta.isPowerPoint && "📎"}
        <span>
          {meta.isExcel ? "Excel File" :
            meta.isPDF ? "PDF Document" :
            meta.isWord ? "Word Document" :
            meta.isPowerPoint ? "PowerPoint" :
            "Attachment"}
        </span>
        <span className="text-xs opacity-75">
          ({meta.fileName.startsWith('attachment_') ? 'File' : meta.fileName})
        </span>
      </a>
    );
  };

  const getSenderDisplayName = (message) => {
    if (!message) return "Unknown User";
    const cachedUser = message.senderId ? userLookup.get(message.senderId) : null;
    if (cachedUser?.lastname && cachedUser?.firstname) {
      return `${cachedUser.lastname}, ${cachedUser.firstname}`;
    }
    if (message.senderName) return message.senderName;
    if (message.senderLastname || message.senderFirstname) {
      const last = message.senderLastname ? `${message.senderLastname}` : "";
      const first = message.senderFirstname ? `${message.senderFirstname}` : "";
      return `${last}${last && first ? ", " : ""}${first}`.trim() || "Unknown User";
    }
    return "Unknown User";
  };

  const getSenderAvatar = (message) => {
    const cachedUser = message?.senderId ? userLookup.get(message.senderId) : null;
    return cachedUser?.profilePic || message?.senderProfilePic || null;
  };

  const formatForumTimestamp = (timestamp, includeYear = false) => {
    if (!timestamp) return '';
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return '';
    const options = includeYear
      ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
      : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    return parsed.toLocaleString('en-US', options);
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
      } catch (error) {
        console.error("User search failed:", error);
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
  }, [currentUserId, ctxSocket]);

  // Fetch group messages when group is selected
  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (!selectedChat || !selectedChat.isGroup) return;
      try {
        const token = localStorage.getItem("token");
        // Use forum-posts API for forum chats, group-messages for regular group chats
        const isForum = selectedChat.name && selectedChat.name.toLowerCase() === "sjdef forum";
        const apiEndpoint = isForum 
          ? `${API_BASE}/forum-posts/${selectedChat._id}?userId=${currentUserId}`
          : `${API_BASE}/group-messages/${selectedChat._id}?userId=${currentUserId}`;
        
        const res = await axios.get(apiEndpoint, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        setGroupMessages((prev) => {
          // Normalize messages: ensure parentMessageId, threadId, and title are properly set
          const normalizedMessages = (res.data || []).map(msg => {
            // Handle forum posts (parentPostId) vs group messages (parentMessageId)
            const rawParentId = msg.parentPostId || msg.parentMessageId;
            // Handle parentMessageId/parentPostId - could be ObjectId, string, null, or undefined
            let normalizedParentId = null;
            if (rawParentId !== null && rawParentId !== undefined) {
              // Handle ObjectId objects (they have toString method)
              if (typeof rawParentId === 'object' && rawParentId.toString) {
                const parentStr = rawParentId.toString().trim();
                if (parentStr && parentStr !== 'null' && parentStr !== 'undefined') {
                  normalizedParentId = parentStr;
                }
              } else {
                const parentStr = String(rawParentId).trim();
                if (parentStr && parentStr !== 'null' && parentStr !== 'undefined' && parentStr !== '') {
                  normalizedParentId = parentStr;
                }
              }
            }
            
            // For forum posts, use isRootPost if available
            const isRoot = msg.isRootPost !== undefined ? msg.isRootPost : !normalizedParentId;
            
            // Handle threadId - could be ObjectId, string, null, or undefined
            let normalizedThreadId = null;
            if (msg.threadId !== null && msg.threadId !== undefined) {
              if (typeof msg.threadId === 'object' && msg.threadId.toString) {
                const threadStr = msg.threadId.toString().trim();
                if (threadStr && threadStr !== 'null' && threadStr !== 'undefined') {
                  normalizedThreadId = threadStr;
                }
              } else {
                const threadStr = String(msg.threadId).trim();
                if (threadStr && threadStr !== 'null' && threadStr !== 'undefined' && threadStr !== '') {
                  normalizedThreadId = threadStr;
                }
              }
            }
            
            // For replies, don't default threadId to _id - it should come from parent
            // For root posts, if threadId is missing, use _id
            if (!normalizedThreadId && !normalizedParentId && msg._id) {
              normalizedThreadId = String(msg._id);
            }
            
            return {
              ...msg,
              parentMessageId: normalizedParentId,
              parentPostId: normalizedParentId, // For compatibility
              threadId: normalizedThreadId,
              title: msg.title && String(msg.title).trim() ? String(msg.title).trim() : null,
              isRootPost: isRoot,
            };
          });
          
          console.log('[FetchGroupMessages] Normalized messages:', normalizedMessages.map(m => ({
            _id: m._id,
            parentMessageId: m.parentMessageId,
            threadId: m.threadId,
            title: m.title
          })));
          
          const newMessages = { ...prev, [selectedChat._id]: normalizedMessages };
          
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
        emitGroupSocketMessage(textMessage, selectedChat._id);
        appendGroupMessageToState(textMessage, selectedChat._id);
      }

      // 2) Send each selected file as its own message with empty text
      for (const file of (selectedFiles || [])) {
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
          emitGroupSocketMessage(fileMessage, selectedChat._id);
          appendGroupMessageToState(fileMessage, selectedChat._id);
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

  const sendThreadedGroupMessage = async ({ text, files = [], parentMessageId = null, title = "" }) => {
    if (!selectedChat || !selectedChat._id) return null;
    const token = localStorage.getItem("token");
    let latestMessage = null;

    // Use forum-posts API for forum chats, group-messages for regular group chats
    const isForum = isForumChat;
    const apiEndpoint = isForum ? `${API_BASE}/forum-posts` : `${API_BASE}/group-messages`;

    // Normalize parentMessageId to string
    const normalizedParentId = parentMessageId 
      ? (typeof parentMessageId === 'object' && parentMessageId.toString 
          ? parentMessageId.toString() 
          : String(parentMessageId))
      : null;

    console.log('[sendThreadedGroupMessage] Sending:', {
      isForum,
      apiEndpoint,
      hasText: !!text,
      hasFiles: files.length > 0,
      parentMessageId: normalizedParentId,
      title: title
    });

    if (text && text.trim()) {
      const textForm = new FormData();
      textForm.append("groupId", selectedChat._id);
      textForm.append("senderId", currentUserId);
      textForm.append("message", text.trim());
      if (isForum) {
        // Forum API uses parentPostId
        if (normalizedParentId) {
          textForm.append("parentPostId", normalizedParentId);
        }
        if (!normalizedParentId && title?.trim()) {
          textForm.append("title", title.trim());
        }
      } else {
        // Group messages API uses parentMessageId
        if (normalizedParentId) {
          textForm.append("parentMessageId", normalizedParentId);
        }
        if (!normalizedParentId && title?.trim()) {
          textForm.append("title", title.trim());
        }
      }
      const textRes = await axios.post(apiEndpoint, textForm, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
      });
      latestMessage = textRes.data;
      
      // Normalize response to common format
      if (isForum) {
        latestMessage.parentMessageId = latestMessage.parentPostId || null;
        latestMessage.isRootPost = latestMessage.isRootPost !== undefined ? latestMessage.isRootPost : !latestMessage.parentPostId;
      }
      
      console.log('[sendThreadedGroupMessage] Response received:', {
        _id: latestMessage._id,
        parentMessageId: latestMessage.parentMessageId || latestMessage.parentPostId,
        threadId: latestMessage.threadId,
        title: latestMessage.title,
        isRootPost: latestMessage.isRootPost
      });
      
      if (!latestMessage.threadId) {
        latestMessage.threadId = normalizedParentId || latestMessage._id;
      }
      if (!parentMessageId && title?.trim() && !latestMessage.title) {
        latestMessage.title = title.trim();
      }
      
      if (isForum) {
        // For forum posts, add to forum-specific state
        appendGroupMessageToState(latestMessage, selectedChat._id);
      } else {
        emitGroupSocketMessage(latestMessage, selectedChat._id);
        appendGroupMessageToState(latestMessage, selectedChat._id);
      }
    }

    const attachmentParentId = normalizedParentId || latestMessage?._id || null;
    const fallbackThreadId = latestMessage?.threadId || normalizedParentId || null;

    for (const file of files) {
      const fileForm = new FormData();
      fileForm.append("groupId", selectedChat._id);
      fileForm.append("senderId", currentUserId);
      fileForm.append("message", "");
      if (isForum) {
        if (attachmentParentId) {
          fileForm.append("parentPostId", attachmentParentId);
        }
      } else {
        if (attachmentParentId) {
          fileForm.append("parentMessageId", attachmentParentId);
        }
      }
      fileForm.append("file", file);

      try {
        const fileRes = await axios.post(apiEndpoint, fileForm, {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          },
        });
        const savedAttachment = fileRes.data;
        
        // Normalize response
        if (isForum) {
          savedAttachment.parentMessageId = savedAttachment.parentPostId || null;
          savedAttachment.isRootPost = savedAttachment.isRootPost !== undefined ? savedAttachment.isRootPost : !savedAttachment.parentPostId;
        }
        
        if (fallbackThreadId && !savedAttachment.threadId) {
          savedAttachment.threadId = fallbackThreadId;
        }
        if (!savedAttachment.parentMessageId && attachmentParentId) {
          savedAttachment.parentMessageId = attachmentParentId;
        }
        
        if (!isForum) {
          emitGroupSocketMessage(savedAttachment, selectedChat._id);
        }
        appendGroupMessageToState(savedAttachment, selectedChat._id);
      } catch (fileError) {
        console.error('Error sending forum attachment:', fileError);
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Attachment Failed',
          message: `Failed to upload "${file.name}". ${fileError.response?.data?.error || fileError.message}`
        });
      }
    }

    return latestMessage;
  };

  const handleCreateForumPost = async () => {
    if (!isForumChat || !selectedChat) return;
    if (!forumPostTitle.trim()) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Title',
        message: "Please provide a topic title for the forum post."
      });
      return;
    }
    if (!forumPostBody.trim() && forumPostFiles.length === 0) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Nothing to Post',
        message: "Add a description or at least one attachment before posting."
      });
      return;
    }
    setIsPostingThread(true);
    try {
      const created = await sendThreadedGroupMessage({
        text: forumPostBody.trim(),
        files: forumPostFiles,
        parentMessageId: null,
        title: forumPostTitle.trim()
      });
      if (created) {
        setActiveForumThreadId(created.threadId || created._id);
      }
      setForumPostTitle("");
      setForumPostBody("");
      setForumPostFiles([]);
    } catch (err) {
      console.error('Error creating forum post:', err);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Post Failed',
        message: err.response?.data?.error || "Unable to create the forum post."
      });
    } finally {
      setIsPostingThread(false);
    }
  };

  const handleReplyToThread = async () => {
    if (!isForumChat || !selectedChat || !activeForumThreadId) return;
    const rootMessage = activeForumThread?.root || (groupMessages[selectedChat._id] || []).find(msg => msg.threadId === activeForumThreadId && !msg.parentMessageId);
    if (!rootMessage) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Thread Missing',
        message: "Unable to find the selected discussion thread."
      });
      return;
    }
    if (!forumReplyBody.trim() && forumReplyFiles.length === 0) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Empty Reply',
        message: "Add a reply message or attach a file."
      });
      return;
    }
    
    // Ensure rootMessage._id is a string
    const rootMessageId = rootMessage._id ? String(rootMessage._id) : null;
    console.log('[handleReplyToThread] Replying to:', {
      rootMessageId,
      rootMessageIdType: typeof rootMessageId,
      rootMessage: {
        _id: rootMessage._id,
        threadId: rootMessage.threadId,
        parentMessageId: rootMessage.parentMessageId
      }
    });
    
    setIsPostingReply(true);
    try {
      await sendThreadedGroupMessage({
        text: forumReplyBody.trim(),
        files: forumReplyFiles,
        parentMessageId: rootMessageId
      });
      setForumReplyBody("");
      setForumReplyFiles([]);
    } catch (err) {
      console.error('Error posting forum reply:', err);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Reply Failed',
        message: err.response?.data?.error || "Unable to submit your reply."
      });
    } finally {
      setIsPostingReply(false);
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

                {isForumChat ? (
                  <>
                    <div className="flex-1 flex items-center justify-center text-center px-6">
                      <div className="max-w-md space-y-3">
                        <h4 className="text-xl font-semibold text-gray-900">SJDEF Forum</h4>
                        <p className="text-sm text-gray-600">
                          This group uses a threaded forum experience so everyone can post topics and reply in organized discussions.
                        </p>
                        <button
                          onClick={() => setShowForumModal(true)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Open Forum
                        </button>
                      </div>
                    </div>
                    <div className="bg-white border-t p-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">Need to create a topic or reply? Launch the forum workspace.</p>
                      <button
                        onClick={() => setShowForumModal(true)}
                        className="inline-flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <span className="material-icons text-base">forum</span>
                        Open Forum Modal
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
                      {renderedMessages.map((msg, index, arr) => {
                    const sender = users.find(u => u._id === msg.senderId);
                    const prevMsg = arr[index - 1];
                    const showHeader =
                      index === 0 ||
                      msg.senderId !== prevMsg?.senderId ||
                      Math.abs(new Date(msg.createdAt || msg.updatedAt) - new Date(prevMsg?.createdAt || prevMsg?.updatedAt)) > 5 * 60 * 1000;
                    return (
                          <div key={msg._id || `${index}-${msg.createdAt}`} className={`flex ${msg.senderId !== currentUserId ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-xs lg:max-w-md ${msg.senderId !== currentUserId ? "order-1" : "order-2"}`}>
                          {showHeader && msg.senderId !== currentUserId && (
                            <div className="text-xs text-gray-500 mb-1">
                              {selectedChat.isGroup ? (msg.senderName || "Unknown User") : (sender ? `${sender.lastname}, ${sender.firstname}` : "Unknown User")}
                            </div>
                          )}
                          <div className={`rounded-lg px-4 py-2 ${msg.senderId !== currentUserId ? "bg-gray-200 text-gray-800" : "bg-blue-500 text-white"}`}>
                            {msg.message && <p className="break-words">{msg.message}</p>}
                                {renderAttachmentPreview(msg, msg.senderId === currentUserId)}
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
                )}
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

        <ForumModal
          isOpen={showForumModal && isForumChat}
          onClose={() => setShowForumModal(false)}
          selectedChat={selectedChat}
          apiBase={API_BASE}
          forumThreads={forumThreads}
          activeForumThreadId={activeForumThreadId}
          setActiveForumThreadId={setActiveForumThreadId}
          forumPostTitle={forumPostTitle}
          setForumPostTitle={setForumPostTitle}
          forumPostBody={forumPostBody}
          setForumPostBody={setForumPostBody}
          forumReplyBody={forumReplyBody}
          setForumReplyBody={setForumReplyBody}
          forumPostFiles={forumPostFiles}
          forumReplyFiles={forumReplyFiles}
          removeForumFile={removeForumFile}
          handleForumFileSelect={handleForumFileSelect}
          handleCreateForumPost={handleCreateForumPost}
          handleReplyToThread={handleReplyToThread}
          isPostingThread={isPostingThread}
          isPostingReply={isPostingReply}
          currentUserId={currentUserId}
          getSenderDisplayName={getSenderDisplayName}
          getSenderAvatar={getSenderAvatar}
          renderAttachmentPreview={renderAttachmentPreview}
          formatForumTimestamp={formatForumTimestamp}
        />

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
