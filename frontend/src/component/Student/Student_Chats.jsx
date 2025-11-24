//Student_Chats.jsx

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import uploadfile from "../../assets/uploadfile.png";
import Student_Navbar from "./Student_Navbar";
import ProfileMenu from "../ProfileMenu";
import defaultAvatar from "../../assets/profileicon (1).svg";
import { useNavigate } from "react-router-dom";
import ValidationModal from "../ValidationModal";
import { getProfileImageUrl } from "../../utils/imageUtils";
import ForumModal from "../common/ForumModal.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function Student_Chats() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState(() => {
    try {
      const cached = localStorage.getItem('users_all_student');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [recentChats, setRecentChats] = useState(() => {
    // Load from localStorage if available
    const stored = localStorage.getItem("recentChats_student");
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
          localStorage.setItem("recentChats_student", JSON.stringify(filtered));
        }
        return filtered;
      } catch (e) {
        console.error("Error parsing recentChats from localStorage:", e);
        localStorage.removeItem("recentChats_student");
        return [];
      }
    }
    return [];
  });
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  const storedUser = localStorage.getItem("user");
  const currentUserId = storedUser ? JSON.parse(storedUser)?._id : null;

  // Group chat states
  const [groups, setGroups] = useState([]);
  const forumGroup = useMemo(
    () => groups.find(group => (group?.name || "").toLowerCase() === "sjdef forum"),
    [groups]
  );
  const forumGroupId = forumGroup?._id || null;
  const [groupMessages, setGroupMessages] = useState({});
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [joinGroupCode, setJoinGroupCode] = useState("");
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);

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

  // Add loading state for chat list
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  // Track chats that should be highlighted due to new messages
  const [highlightedChats, setHighlightedChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('highlightedChats_student') || '{}'); } catch { return {}; }
  });
  const addHighlight = (chatId) => {
    if (!chatId) return;
    setHighlightedChats(prev => {
      const next = { ...prev, [chatId]: Date.now() };
      try { localStorage.setItem('highlightedChats_student', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const clearHighlight = (chatId) => {
    if (!chatId) return;
    setHighlightedChats(prev => {
      if (!prev[chatId]) return prev;
      const { [chatId]: _ignore, ...rest } = prev;
      try { localStorage.setItem('highlightedChats_student', JSON.stringify(rest)); } catch {}
      return rest;
    });
  };

  const [showForumModal, setShowForumModal] = useState(false);
  const [forumPosts, setForumPosts] = useState([]);
  const [activeForumThreadId, setActiveForumThreadId] = useState(null);
  const [forumPostTitle, setForumPostTitle] = useState("");
  const [forumPostBody, setForumPostBody] = useState("");
  const [forumReplyBody, setForumReplyBody] = useState("");
  const [forumPostFiles, setForumPostFiles] = useState([]);
  const [forumReplyFiles, setForumReplyFiles] = useState([]);
  const [isPostingThread, setIsPostingThread] = useState(false);
  const [isPostingReply, setIsPostingReply] = useState(false);

  const normalizeForumPost = useCallback((post) => {
    if (!post) return null;
    const rawParent = post.parentPostId ?? post.parentMessageId;
    const parentId = rawParent !== null && rawParent !== undefined && String(rawParent).trim() !== "" ? String(rawParent) : null;
    let threadId = post.threadId !== null && post.threadId !== undefined ? String(post.threadId) : null;
    if (!threadId && !parentId && post._id) {
      threadId = String(post._id);
    }
    return {
      ...post,
      parentMessageId: parentId,
      parentPostId: parentId,
      threadId,
      title: post.title && post.title.trim() ? post.title.trim() : null,
      isRootPost: post.isRootPost !== undefined ? post.isRootPost : !parentId,
    };
  }, []);

  const appendForumPostToState = useCallback((post) => {
    if (!post) return;
    const normalized = normalizeForumPost(post);
    if (!normalized) return;
    setForumPosts((prev) => {
      const index = prev.findIndex((item) => item._id === normalized._id);
      if (index !== -1) {
        const next = [...prev];
        next[index] = normalized;
        return next;
      }
      return [...prev, normalized];
    });
  }, [normalizeForumPost]);

  const fetchForumPosts = useCallback(async () => {
    if (!forumGroupId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/forum-posts/${forumGroupId}?userId=${currentUserId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const normalized = (res.data || []).map(normalizeForumPost).filter(Boolean);
      setForumPosts(normalized);
      setActiveForumThreadId((prev) => {
        if (prev && normalized.some(thread => thread.threadId === prev)) {
          return prev;
        }
        return normalized.length > 0 ? normalized[0].threadId : null;
      });
    } catch (err) {
      console.error("Error loading forum posts:", err);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Forum Error',
        message: 'Unable to load forum topics right now. Please try again later.'
      });
    }
  }, [forumGroupId, currentUserId, normalizeForumPost]);

  useEffect(() => {
    if (showForumModal && forumGroupId) {
      fetchForumPosts();
    }
  }, [showForumModal, forumGroupId, fetchForumPosts]);

  const forumThreads = useMemo(() => {
    if (!forumPosts.length) return [];
    const threadMap = new Map();
    const messageMap = new Map();

    forumPosts.forEach((msg) => {
      if (msg?._id) {
        messageMap.set(String(msg._id), msg);
      }
    });

    const rootPosts = [];
    const replies = [];

    forumPosts.forEach((msg) => {
      if (msg.isRootPost || !msg.parentMessageId) {
        rootPosts.push(msg);
      } else {
        replies.push(msg);
      }
    });

    rootPosts.forEach((msg) => {
      const key = msg.threadId || (msg._id ? String(msg._id) : null);
      if (!key) return;
      if (!threadMap.has(key)) {
        threadMap.set(key, { threadId: key, root: msg, replies: [], rootTimestamp: new Date(msg.createdAt || msg.updatedAt || 0).getTime() });
      } else {
        const existing = threadMap.get(key);
        const timestamp = new Date(msg.createdAt || msg.updatedAt || 0).getTime();
        if (!existing.root || timestamp < existing.rootTimestamp) {
          if (existing.root) {
            existing.replies.push(existing.root);
          }
          existing.root = msg;
          existing.rootTimestamp = timestamp;
        } else {
          existing.replies.push(msg);
        }
      }
    });

    replies.forEach((msg) => {
      const parentId = msg.parentMessageId ? String(msg.parentMessageId) : null;
      let threadKey = msg.threadId ? String(msg.threadId) : null;

      if (!threadKey && parentId) {
        const parent = messageMap.get(parentId);
        if (parent) {
          threadKey = parent.threadId || parentId;
        } else {
          threadKey = parentId;
        }
      }

      if (!threadKey) return;

      if (!threadMap.has(threadKey)) {
        threadMap.set(threadKey, { threadId: threadKey, root: null, replies: [] });
      }
      threadMap.get(threadKey).replies.push(msg);
    });

    return Array.from(threadMap.values())
      .filter(thread => thread.root)
      .map(thread => ({
        threadId: thread.threadId,
        root: thread.root,
        replies: thread.replies.sort(
          (a, b) => new Date(a.createdAt || a.updatedAt || 0) - new Date(b.createdAt || b.updatedAt || 0)
        ),
      }))
      .sort(
        (a, b) =>
          new Date(b.root?.createdAt || b.root?.updatedAt || 0) -
          new Date(a.root?.createdAt || a.root?.updatedAt || 0)
      );
  }, [forumPosts]);

  const activeForumThread = useMemo(() => {
    if (!forumThreads.length) return null;
    if (!activeForumThreadId) return forumThreads[0];
    return forumThreads.find(thread => thread.threadId === activeForumThreadId) || forumThreads[0];
  }, [forumThreads, activeForumThreadId]);

  useEffect(() => {
    if (!showForumModal) return;
    if (!forumThreads.length) {
      setActiveForumThreadId(null);
      return;
    }
    if (!activeForumThreadId || !forumThreads.some(thread => thread.threadId === activeForumThreadId)) {
      setActiveForumThreadId(forumThreads[0].threadId);
    }
  }, [forumThreads, activeForumThreadId, showForumModal]);

  const handleCloseForumModal = () => {
    setShowForumModal(false);
    setForumPostTitle("");
    setForumPostBody("");
    setForumPostFiles([]);
    setForumReplyBody("");
    setForumReplyFiles([]);
  };

  const handleForumFileSelect = (e, target = "post") => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const dedupe = (prev, additions) => {
      const existing = new Set(prev.map(f => `${f.name}|${f.size}|${f.lastModified}`));
      const filtered = additions.filter(f => !existing.has(`${f.name}|${f.size}|${f.lastModified}`));
      return [...prev, ...filtered];
    };
    if (target === "reply") {
      setForumReplyFiles((prev) => dedupe(prev, files));
    } else {
      setForumPostFiles((prev) => dedupe(prev, files));
    }
    e.target.value = null;
  };

  const removeForumFile = (target, index) => {
    if (target === "reply") {
      setForumReplyFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setForumPostFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const sendForumMessage = useCallback(async ({ text, files = [], parentMessageId = null, title = "" }) => {
    if (!forumGroupId) return null;
    const token = localStorage.getItem("token");
    let latestMessage = null;

    try {
      if (text && text.trim()) {
        const textForm = new FormData();
        textForm.append("groupId", forumGroupId);
        textForm.append("senderId", currentUserId);
        textForm.append("message", text.trim());
        if (parentMessageId) {
          textForm.append("parentPostId", parentMessageId);
        } else if (title?.trim()) {
          textForm.append("title", title.trim());
        }
        const textRes = await axios.post(`${API_BASE}/forum-posts`, textForm, {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          }
        });
        latestMessage = normalizeForumPost(textRes.data);
        appendForumPostToState(latestMessage);
      }

      const attachmentParentId = parentMessageId || latestMessage?._id || null;
      for (const file of files) {
        const fileForm = new FormData();
        fileForm.append("groupId", forumGroupId);
        fileForm.append("senderId", currentUserId);
        fileForm.append("message", "");
        if (attachmentParentId) {
          fileForm.append("parentPostId", attachmentParentId);
        }
        fileForm.append("file", file);
        const fileRes = await axios.post(`${API_BASE}/forum-posts`, fileForm, {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          }
        });
        appendForumPostToState(fileRes.data);
      }

      return latestMessage;
    } catch (error) {
      console.error("Error sending forum message:", error);
      const message = error.response?.data?.error || "Unable to send your forum message.";
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Forum Error',
        message
      });
      throw error;
    }
  }, [API_BASE, appendForumPostToState, forumGroupId, currentUserId, normalizeForumPost]);

  const handleCreateForumPost = async () => {
    if (!forumGroup) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Forum Unavailable',
        message: 'The SJDEF Forum group is not available right now.'
      });
      return;
    }
    if (!forumPostTitle.trim()) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Title',
        message: 'Please provide a title for your topic.'
      });
      return;
    }
    if (!forumPostBody.trim() && forumPostFiles.length === 0) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Nothing to Post',
        message: 'Add a message or attach at least one file before posting.'
      });
      return;
    }
    setIsPostingThread(true);
    try {
      const created = await sendForumMessage({
        text: forumPostBody.trim(),
        files: forumPostFiles,
        parentMessageId: null,
        title: forumPostTitle.trim()
      });
      if (created?.threadId) {
        setActiveForumThreadId(created.threadId);
      }
      setForumPostTitle("");
      setForumPostBody("");
      setForumPostFiles([]);
    } catch {
      // handled upstream
    } finally {
      setIsPostingThread(false);
    }
  };

  const handleReplyToThread = async () => {
    if (!forumGroup) return;
    const rootMessage = activeForumThread?.root;
    if (!rootMessage?._id) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Thread Missing',
        message: 'Select a topic before posting a reply.'
      });
      return;
    }
    if (!forumReplyBody.trim() && forumReplyFiles.length === 0) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Empty Reply',
        message: 'Add a reply message or attach a file.'
      });
      return;
    }
    setIsPostingReply(true);
    try {
      await sendForumMessage({
        text: forumReplyBody.trim(),
        files: forumReplyFiles,
        parentMessageId: String(rootMessage._id)
      });
      setForumReplyBody("");
      setForumReplyFiles([]);
    } catch {
      // handled upstream
    } finally {
      setIsPostingReply(false);
    }
  };

  const formatForumTimestamp = (timestamp, includeYear = false) => {
    if (!timestamp) return "";
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return "";
    const options = includeYear
      ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
    return parsed.toLocaleString("en-US", options);
  };

  const getSenderDisplayName = (message) => {
    if (!message) return "Unknown User";
    const cached = message.senderId ? users.find(u => u._id === message.senderId) : null;
    if (cached?.lastname && cached?.firstname) {
      return `${cached.lastname}, ${cached.firstname}`;
    }
    if (message.senderName) return message.senderName;
    const last = message.senderLastname || "";
    const first = message.senderFirstname || "";
    return `${last}${last && first ? ", " : ""}${first}`.trim() || "Unknown User";
  };

  const getSenderAvatar = (message) => {
    const cached = message?.senderId ? users.find(u => u._id === message.senderId) : null;
    return cached?.profilePic || message?.senderProfilePic || null;
  };

  const getAttachmentMeta = (msg) => {
    if (!msg?.fileUrl) return null;
    const isFullUrl = /^https?:\/\//i.test(msg.fileUrl);
    const resolvedUrl = isFullUrl ? msg.fileUrl : `${API_BASE}/${msg.fileUrl}`;
    let resolvedName = msg.fileName;
    if (!resolvedName) {
      const urlParts = msg.fileUrl.split("/");
      const lastPart = urlParts[urlParts.length - 1]?.split("?")[0];
      resolvedName = msg.fileUrl.includes("/raw/upload/") ? `attachment_${lastPart}` : (lastPart || "attachment");
    }
    const lowerName = resolvedName.toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerName);
    const isExcel = /\.(xlsx|xls|csv)$/i.test(lowerName);
    const isPDF = lowerName.endsWith(".pdf");
    const isWord = lowerName.endsWith(".doc") || lowerName.endsWith(".docx");
    const isPowerPoint = lowerName.endsWith(".ppt") || lowerName.endsWith(".pptx");
    return {
      fileUrl: resolvedUrl,
      fileName: resolvedName,
      isImage,
      isExcel,
      isPDF,
      isWord,
      isPowerPoint,
      isCloudinaryRaw: resolvedUrl.includes("res.cloudinary.com") && resolvedUrl.includes("/raw/upload/")
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
        if (meta.fileUrl.includes("res.cloudinary.com")) {
          const separator = meta.fileUrl.includes("?") ? "&" : "?";
          downloadUrl = `${meta.fileUrl}${separator}fl_attachment:${encodeURIComponent(meta.fileName)}`;
        }
        const response = await fetch(downloadUrl, { method: "GET", mode: "cors" });
        if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
        let blob;
        if (meta.isCloudinaryRaw) {
          const arrayBuffer = await response.arrayBuffer();
          let mimeType = response.headers.get("content-type") || "application/octet-stream";
          blob = new Blob([arrayBuffer], { type: mimeType });
        } else {
          blob = await response.blob();
        }
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = meta.fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 120);
      } catch (error) {
        console.error("Error downloading file:", error);
        window.open(meta.fileUrl, "_blank");
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


  const handleOpenForum = () => {
    if (!forumGroup) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Forum Unavailable',
        message: 'The SJDEF Forum group is not available right now.'
      });
      return;
    }
    clearHighlight(forumGroup._id);
    setShowForumModal(true);
  };

  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);
  const chatListRef = useRef(null);
  const fetchedGroupPreviewIds = useRef(new Set());
  const groupsRef = useRef([]);
  const lastSendRef = useRef(0);
  // Live refs to avoid stale closures in socket handlers
  const recentChatsRef = useRef([]);
  const selectedChatRef = useRef(null);
  const isGroupChatRef = useRef(false);
  const usersRef = useRef([]);

  const API_URL = (import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com").replace(/\/$/, "");
  const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_URL).replace(/\/$/, "");

  const navigate = useNavigate();

  // Keep refs in sync with state
  useEffect(() => { recentChatsRef.current = recentChats; }, [recentChats]);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { isGroupChatRef.current = isGroupChat; }, [isGroupChat]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);

  // Fetch a single user by id and merge to cache/state (used when sender not in users list yet)
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
          try { localStorage.setItem('users_all_student', JSON.stringify(next)); } catch {}
          return next;
        });
        return fetched;
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  useEffect(() => {
    if (!currentUserId) {
      navigate("/", { replace: true });
    }
  }, [currentUserId, navigate]);

  const bumpChatToTop = (chatUser) => {
    if (!chatUser || !chatUser._id) return;
    setRecentChats((prev) => {
      const filtered = prev.filter((c) => c._id !== chatUser._id);
      const updated = [chatUser, ...filtered];
      localStorage.setItem("recentChats_student", JSON.stringify(updated));
      return updated;
    });
  };

  // ================= SOCKET.IO SETUP =================
  useEffect(() => {
    socket.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      timeout: 10000,
      auth: {
        token: localStorage.getItem('token'),
        userId: currentUserId
      }
    });

    socket.current.emit("addUser", currentUserId);

    // Ensure we (re)join all group rooms on connect/reconnect
    const onConnect = () => {
      try {
        socket.current.emit("addUser", currentUserId);
        (groupsRef.current || []).forEach(g => {
          if (g && g._id) {
            socket.current.emit("joinGroup", { userId: currentUserId, groupId: g._id });
          }
        });
      } catch {}
    };
    socket.current.on('connect', onConnect);

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
        
        // If chat not found in recentChats, fetch the sender and add them
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
                localStorage.setItem("recentChats_student", JSON.stringify(updated));
                return updated;
              });
              const previewText = incomingMessage.message ? incomingMessage.message : (incomingMessage.fileUrl ? 'File sent' : '');
              setLastMessages(prev => ({
                ...prev,
                [newChat._id]: { prefix: `${newChat.lastname || 'Unknown'}, ${newChat.firstname || 'User'}: `, text: previewText }
              }));
              if (!(selectedChatRef.current && !isGroupChatRef.current && selectedChatRef.current._id === newChat._id)) {
                addHighlight(newChat._id);
              }
            }
          };
          // fire and forget; do not block handler
          ensureSender();
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

          // Highlight conversation item if not currently open
          if (!(selectedChatRef.current && !isGroupChatRef.current && selectedChatRef.current._id === chat._id)) {
            addHighlight(chat._id);
          }
          
                  // Refresh recent conversations to update sidebar
        setTimeout(() => {
          fetchRecentConversations();
        }, 60);
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
      }, 20);
    };
    socket.current.on("getMessage", handleIncomingDirect);
    socket.current.on("receiveMessage", handleIncomingDirect);

    // Group chat socket events
    socket.current.on("getGroupMessage", (data) => {
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
        const updated = {
          ...prev,
          [data.groupId]: [...(prev[data.groupId] || []), incomingGroupMessage],
        };
        
        // If this group is currently selected, force an immediate UI update
        if (selectedChatRef.current && selectedChatRef.current._id === data.groupId && isGroupChatRef.current) {
          // Force a re-render by updating the selected chat messages
          setTimeout(() => {
            setGroupMessages(current => ({ ...current }));
          }, 10);
        }
        
        return updated;
      });

      // Highlight group item if it's not the currently open chat
      if (!(selectedChatRef.current && isGroupChatRef.current && selectedChatRef.current._id === data.groupId)) {
        addHighlight(data.groupId);
      }

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
      socket.current.off('connect', onConnect);
      socket.current.disconnect();
    };
  }, [currentUserId, recentChats]);

  // Also (re)join any newly available groups when the list changes
  useEffect(() => {
    if (!socket.current || !socket.current.connected || !currentUserId) return;
    try {
      groups.forEach(g => {
        if (g && g._id) {
          socket.current.emit('joinGroup', { userId: currentUserId, groupId: g._id });
        }
      });
    } catch {}
  }, [groups, currentUserId]);

  // ================= FETCH USERS =================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (users.length === 0) setIsLoadingChats(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/users/active`, { headers: { 'Authorization': `Bearer ${token}` } });
        const userArray = Array.isArray(res.data) ? res.data : [];
        setUsers(userArray);
        try { localStorage.setItem('users_all_student', JSON.stringify(userArray)); } catch {}
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
          localStorage.setItem("recentChats_student", JSON.stringify(newRecentChats));
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
        localStorage.setItem("recentChats_student", JSON.stringify(cleanedChats));
      }
    }
  }, [recentChats]);

  // Force cleanup of corrupted data on component mount
  useEffect(() => {
    const cleanupCorruptedData = () => {
      const stored = localStorage.getItem("recentChats_student");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const cleaned = parsed.filter(chat => 
            chat && chat._id && chat.firstname && chat.lastname && 
            chat.firstname !== 'undefined' && chat.lastname !== 'undefined' &&
            chat.firstname !== undefined && chat.lastname !== undefined
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem("recentChats_student", JSON.stringify(cleaned));
            setRecentChats(cleaned);
          }
        } catch {
          localStorage.removeItem("recentChats_student");
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
        // Join all groups in Socket.IO
        res.data.forEach(group => {
          socket.current?.emit("joinGroup", { userId: currentUserId, groupId: group._id });
        });

        // Lazy hydrate previews
        const hydrateRange = async (startIndex, endIndex) => {
          const slice = res.data.slice(startIndex, endIndex).filter(g => !fetchedGroupPreviewIds.current.has(g._id));
          if (slice.length === 0) return;
          slice.forEach(g => fetchedGroupPreviewIds.current.add(g._id));
          try {
            const batch = await Promise.all(
              slice.map(group =>
                axios.get(`${API_BASE}/group-messages/${group._id}?userId=${currentUserId}&limit=1&sort=desc`, {
                  headers: { Authorization: `Bearer ${token}` }
                }).then(r => ({ groupId: group._id, list: Array.isArray(r.data) ? r.data : [] })).catch(() => ({ groupId: group._id, list: [] }))
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
            if (Object.keys(previews).length > 0) setLastMessages(prev => ({ ...prev, ...previews }));
          } catch {}
        };
        hydrateRange(0, 15);
        const el = chatListRef.current; if (el) {
          let t=null; const onScroll=()=>{ if (t) cancelAnimationFrame(t); t=requestAnimationFrame(()=>{ const h=64; const start=Math.max(0, Math.floor(el.scrollTop/h)-5); const end=start+25; hydrateRange(start,end); }); };
          el.addEventListener('scroll', onScroll); return () => el.removeEventListener('scroll', onScroll);
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
      }
    };
    const cleanup = fetchGroups();
    return () => { if (typeof cleanup === 'function') cleanup(); };
  }, [currentUserId]);

  // ================= FETCH MESSAGES =================
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat) return;
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/messages/${currentUserId}/${selectedChat._id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        setMessages((prev) => {
          const newMessages = { ...prev, [selectedChat._id]: res.data };
          
          // Compute last messages for all recent chats
          const newLastMessages = {};
          recentChats.forEach(chat => {
            const chatMessages = newMessages[chat._id] || [];
            const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
            if (lastMsg) {
              let prefix;
              const text = lastMsg.message 
                ? lastMsg.message 
                : (lastMsg.fileUrl ? "File sent" : "");
              
              if (lastMsg.senderId === currentUserId) {
                prefix = "You: ";
              } else {
                prefix = `${chat.lastname || "Unknown"}, ${chat.firstname || "User"}: `;
              }
              
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
    if (isSending) return;

    setIsSending(true);
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
          fileName: sentMessage.fileName || null,
          senderName: storedUser ? JSON.parse(storedUser).firstname + " " + JSON.parse(storedUser).lastname : "Unknown",
          senderFirstname: storedUser ? JSON.parse(storedUser).firstname : "Unknown",
          senderLastname: storedUser ? JSON.parse(storedUser).lastname : "User",
          senderProfilePic: storedUser ? JSON.parse(storedUser).profilePic : null,
          threadId: sentMessage.threadId || null,
          parentMessageId: sentMessage.parentMessageId || null,
          title: sentMessage.title || null,
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

        // Refresh recent conversations to update sidebar
        setTimeout(() => {
          fetchRecentConversations();
        }, 100);

        setNewMessage("");
        setSelectedFile(null);
      } catch (err) {
        console.error("Error sending group message:", err);
      } finally {
        setIsSending(false);
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
          fileName: sentMessage.fileName || null,
        });

        setMessages((prev) => ({
          ...prev,
          [selectedChat._id]: [...(prev[selectedChat._id] || []), sentMessage],
        }));

        bumpChatToTop(selectedChat);

        // Refresh recent conversations to ensure all users with message history are loaded
        setTimeout(() => {
          fetchRecentConversations();
        }, 100);

        // Update last message for this individual chat
        const text = sentMessage.message 
          ? sentMessage.message 
          : (sentMessage.fileUrl ? "File sent" : "");
        setLastMessages(prev => ({
          ...prev,
          [selectedChat._id]: { prefix: "You: ", text }
        }));

        setNewMessage("");
        setSelectedFile(null);
      } catch (err) {
        console.error("Error sending message:", err);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isSending) return;
      const now = Date.now();
      if (now - (lastSendRef.current || 0) < 400) return;
      lastSendRef.current = now;
      handleSendMessage();
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Set the first file for single file chat input
      setSelectedFile(files[0]);
      
      // Also update the selectedFiles array for potential multi-file support
      setSelectedFiles((prev) => {
        const existingNames = new Set(prev.map(f => `${f.name}|${f.size}|${f.lastModified}`));
        const additions = files.filter(f => !existingNames.has(`${f.name}|${f.size}|${f.lastModified}`));
        return [...prev, ...additions];
      });
      e.target.value = null;
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
      // Prevent joining if already a member of this group
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

      // Fetch the joined group and merge into state (robust against fetch latency)
      const groupRes = await axios.get(`${API_BASE}/group-chats/${joinGroupCode}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const joinedGroup = groupRes.data;
      setGroups(prev => {
        const exists = prev.some(g => g._id === joinedGroup._id);
        return exists ? prev : [joinedGroup, ...prev];
      });
      // Also refresh complete list in background (non-blocking)
      axios.get(`${API_BASE}/group-chats/user/${currentUserId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(res => setGroups(res.data)).catch(() => {});

      // Join the socket room and focus the group
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
        localStorage.removeItem("selectedChatId_student");
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
          let prefix;
          const text = lastMsg.message 
            ? lastMsg.message 
            : (lastMsg.fileUrl ? "File sent" : "");
          
          if (lastMsg.senderId === currentUserId) {
            prefix = "You: ";
          } else {
            prefix = `${chat.lastname || "Unknown"}, ${chat.firstname || "User"}: `;
          }
          
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
  // Show all groups the user belongs to (even if no messages yet)
  const groupsWithMessages = groups;
  
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
  // Enhanced search: include all groups you belong to (even if no messages yet)
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
    // Then show your other groups (without messages) that match
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
      <Student_Navbar />
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
            {/* Header Tabs and Actions */}
            <div className="mb-4">
              <div className="flex border-b border-gray-300 mb-3">
                <button
                  className="px-4 py-2 text-sm font-semibold border-b-2 border-blue-900 text-blue-900"
                  type="button"
                  aria-current="true"
                >
                  Chats
                </button>
                <button
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                    forumGroup
                      ? "border-transparent text-gray-500 hover:text-blue-900 hover:border-blue-300"
                      : "border-transparent text-gray-400 cursor-not-allowed"
                  }`}
                  type="button"
                  onClick={forumGroup ? handleOpenForum : undefined}
                  disabled={!forumGroup}
                  title={forumGroup ? "Open SJDEF Forum" : "Forum group not available yet"}
                >
                  SJDEF Forum
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
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
                    <div className="absolute right-0 mt-2 w-36 bg-white border rounded-lg                                                                                                                       shadow-lg z-10">
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
            </div>
            {/* Unified Chat List */}
            <div ref={chatListRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
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
                        (selectedChat?._id === chat._id && ((isGroupChat && chat.type === 'group') || (!isGroupChat && chat.type === 'individual')))
                          ? "bg-white"
                          : (highlightedChats[chat._id] ? "bg-yellow-50 ring-2 ring-yellow-400" : "bg-gray-100 hover:bg-gray-300")
                      }`}
                      onClick={() => {
                        if (chat.type === 'group') {
                          setSelectedChat(chat);
                          setIsGroupChat(true);
                          localStorage.setItem("selectedChatId_student", chat._id);
                          clearHighlight(chat._id);
                        } else {
                          setSelectedChat(chat);
                          setIsGroupChat(false);
                          localStorage.setItem("selectedChatId_student", chat._id);
                          clearHighlight(chat._id);
                        }
                      }}
                    >
                      {chat.type === 'group' ? (
                        <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold">
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
                        {lastMessages[chat._id] && (
                          <span className="text-xs text-gray-500 truncate">
                            {lastMessages[chat._id].prefix}{lastMessages[chat._id].text}
                          </span>
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
                          setIsGroupChat(true);
                          localStorage.setItem("selectedChatId_student", item._id);
                          setSearchTerm(""); // Clear search after selecting
                        } else {
                          setSelectedChat(item);
                          setIsGroupChat(false);
                          localStorage.setItem("selectedChatId_student", item._id);
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
                    {isGroupChat ? (
                      <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center text-lg font-bold">
                        {selectedChat.name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <img
                        src={getProfileImageUrl(selectedChat.profilePic, API_BASE, defaultAvatar)}
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
                              <div className="px-4 py-2 rounded-lg text-sm max-w-xs bg-blue-900 text-white mt-0.5">
                                {msg.message && <p>{msg.message}</p>}
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
                                      const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);
                                      const isExcel = /\.(xlsx|xls)$/i.test(fileName);
                                      const isPDF = /\.(pdf)$/i.test(fileName);
                                      const isWord = /\.(doc|docx)$/i.test(fileName);
                                      const isPowerPoint = /\.(ppt|pptx)$/i.test(fileName);
                                      
                                      // Handle file download with proper filename
                                      const handleFileDownload = async (e) => {
                                        e.preventDefault();
                                        try {
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
                                          } else {
                                            blob = await response.blob();
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
                                          className="text-blue-200 hover:text-blue-100 underline items-center gap-2 cursor-pointer"
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
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Recipient's message
                          <div className="flex items-end gap-2">
                            {showHeader ? (
                              <>
                                <img
                                  src={isGroupChat ? getProfileImageUrl(msg.senderProfilePic, API_BASE, defaultAvatar) : getProfileImageUrl(sender?.profilePic, API_BASE, defaultAvatar)}
                                  alt="Profile"
                                  className="w-10 h-10 rounded-full object-cover border"
                                  onError={e => { e.target.onerror = null; e.target.src = defaultAvatar; }}
                                />
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">
                                      {isGroupChat ? (msg.senderName || "Unknown") : (sender ? `${sender.lastname}, ${sender.firstname}` : "")}
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
                                        className="underline text-xs block mt-1 flex items-center gap-1"
                                      >
                                        🔗 File Attachment
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
                                      className="underline text-xs block mt-1 flex items-center gap-1"
                                    >
                                      🔗 File Attachment
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
                    accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.ppt,.pptx"
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
                    disabled={isSending || (!newMessage.trim() && !selectedFile)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      (newMessage.trim() || selectedFile) && !isSending ? "bg-blue-900 text-white" : "bg-gray-400 text-white cursor-not-allowed"
                    }`}
                  >
                    {isSending ? "Sending..." : "Send"}
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
                placeholder="Enter Group ID"
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
                {(selectedChat?.participants || []).map(userId => {
                  const user = users.find(u => u._id === userId);
                  if (!user) return null;
                  const isCreator = selectedChat?.createdBy === userId;
                  return (
                    <li key={userId} className="flex items-center justify-between py-2">
                      <span>{user.lastname}, {user.firstname} {isCreator && <span className="text-xs text-blue-700">(Creator)</span>}</span>
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

        <ForumModal
          isOpen={showForumModal && !!forumGroup}
          onClose={handleCloseForumModal}
          selectedChat={forumGroup}
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
