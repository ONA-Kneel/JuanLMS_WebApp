import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { getUserDisplayName } from "../../utils/userDisplayUtils";

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

const VPE_Chats = () => {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  const [contactNicknames, setContactNicknames] = useState({});
  const [groups, setGroups] = useState([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinGroupCode, setJoinGroupCode] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);
  const [groupToLeave, setGroupToLeave] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showCreatorLeaveError, setShowCreatorLeaveError] = useState(false);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupMessages, setGroupMessages] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: '',
    title: '',
    message: ''
  });

  const socket = useRef();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ================= INITIALIZATION =================
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      setCurrentUserId(user._id);
    }
  }, []);

  // ================= FETCH DATA =================
  useEffect(() => {
    if (!currentUserId) return;

    const fetchData = async () => {
      try {
        await Promise.all([
          fetchUsers(),
          fetchContactNicknames(),
          fetchGroups()
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
        // Ensure contactId is properly handled as a string
        const contactId = item.contactId?.toString() || item.contactId;
        if (contactId && item.nickname) {
          nicknamesMap[contactId] = item.nickname;
        }
      });
      setContactNicknames(nicknamesMap);
    } catch (error) {
      console.error('Error fetching contact nicknames:', error);
    }
  };

  // ================= FETCH GROUPS =================
  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${API_BASE}/group-chats/user/${currentUserId}`);
      setGroups(res.data);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  // ================= FETCH RECENT CHATS =================
  useEffect(() => {
    const fetchRecentChats = async () => {
      if (!currentUserId) return;
      try {
        const res = await axios.get(`${API_BASE}/messages/recent-chats/${currentUserId}`);
        setRecentChats(res.data);
        localStorage.setItem("recentChats_vpe", JSON.stringify(res.data));
      } catch (err) {
        console.error("Error fetching recent chats:", err);
      }
    };

    fetchRecentChats();
  }, [currentUserId]);

  // ================= LOAD RECENT CHATS FROM LOCALSTORAGE =================
  useEffect(() => {
    const savedChats = localStorage.getItem("recentChats_vpe");
    if (savedChats) {
      setRecentChats(JSON.parse(savedChats));
    }
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
              const contactNickname = contactNicknames[chat._id] || null;
              const prefix = lastMsg.senderId === currentUserId 
                ? "You: " 
                : `${getUserDisplayName(chat, contactNickname)}: `;
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
  }, [selectedChat, currentUserId, recentChats, contactNicknames]);

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
            ? "Sent a file" 
            : "";
          const lastMessage = prefix + text;
          
          setLastMessages(prev => ({
            ...prev,
            [incomingMessage.senderId]: lastMessage
          }));
        }
        
        return newMessages;
      });
    });

    // Add group message handler
    socket.current.on("getGroupMessage", (data) => {
      const incomingGroupMessage = {
        senderId: data.senderId,
        groupId: data.groupId,
        message: data.text,
        fileUrl: data.fileUrl || null,
        senderName: data.senderName || null,
      };
      setGroupMessages((prev) => ({
        ...prev,
        [incomingGroupMessage.groupId]: [
          ...(prev[incomingGroupMessage.groupId] || []),
          incomingGroupMessage,
        ],
      }));
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [currentUserId, recentChats, contactNicknames]);

  // ================= SCROLL TO BOTTOM =================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages]);

  // ================= FILE UPLOAD HANDLER =================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setValidationModal({
          isOpen: true,
          type: 'warning',
          title: 'File Too Large',
          message: 'File size must be less than 10MB'
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  // ================= MESSAGE HANDLERS =================
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedChat) return;

    try {
      let fileUrl = null;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadResponse = await axios.post(`${API_BASE}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        fileUrl = uploadResponse.data.fileUrl;
      }

      const sentMessage = {
        message: newMessage.trim(),
        fileUrl: fileUrl,
      };

      // Add to local state immediately
      const newMessageObj = {
        senderId: currentUserId,
        receiverId: selectedChat._id,
        message: sentMessage.message,
        fileUrl: sentMessage.fileUrl || null,
        timestamp: new Date(),
      };

      setMessages((prev) => ({
        ...prev,
        [selectedChat._id]: [
          ...(prev[selectedChat._id] || []),
          newMessageObj,
        ],
      }));

      // Emit to socket
      if (socket.current) {
        socket.current.emit("sendMessage", {
          senderId: currentUserId,
          receiverId: selectedChat._id,
          text: sentMessage.message,
          fileUrl: sentMessage.fileUrl || null,
        });
      }

      setNewMessage("");
      setSelectedFile(null);
      
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // ================= GROUP CHAT HANDLERS =================
  const handleSendGroupMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedChat) return;

    try {
      let fileUrl = null;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadResponse = await axios.post(`${API_BASE}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        fileUrl = uploadResponse.data.fileUrl;
      }

      const sentMessage = {
        message: newMessage.trim(),
        fileUrl: fileUrl,
      };

      // Add to local state immediately
      const newGroupMessage = {
        senderId: currentUserId,
        groupId: selectedChat._id,
        message: sentMessage.message,
        fileUrl: sentMessage.fileUrl || null,
        timestamp: new Date(),
      };

      setGroupMessages((prev) => ({
        ...prev,
        [selectedChat._id]: [
          ...(prev[selectedChat._id] || []),
          newGroupMessage,
        ],
      }));

      // Emit to socket
      if (socket.current) {
        socket.current.emit("sendGroupMessage", {
          senderId: currentUserId,
          groupId: selectedChat._id,
          text: sentMessage.message,
          fileUrl: sentMessage.fileUrl || null,
          senderName: JSON.parse(localStorage.getItem("user")).firstname + " " + JSON.parse(localStorage.getItem("user")).lastname,
        });
      }

      setNewMessage("");
      setSelectedFile(null);
      
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  };

  const handleStartNewChat = (user) => {
    setSelectedChat(user);
    setIsGroupChat(false);
    setRecentChats(prev => {
      const newChats = prev.filter(chat => chat._id !== user._id);
      return [user, ...newChats];
    });
    localStorage.setItem("recentChats_vpe", JSON.stringify([user, ...recentChats.filter(chat => chat._id !== user._id)]));
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) {
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
        name: newGroupName,
        description: "",
        createdBy: currentUserId,
        participants: selectedGroupMembers,
      });

      const newGroup = { ...res.data, isGroup: true };
      setGroups(prev => [newGroup, ...prev]);
      setSelectedChat(newGroup);
      setIsGroupChat(true);
      setShowCreateGroupModal(false);
      setNewGroupName("");
      setSelectedGroupMembers([]);

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
    if (!joinGroupCode.trim()) {
      setValidationModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Group Code',
        message: "Please enter a group ID"
      });
      return;
    }

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

      setGroups(prev => prev.filter(g => g._id !== selectedChat._id));
      setSelectedChat(null);
      setGroupMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[selectedChat._id];
        return newMessages;
      });
      setIsGroupChat(false);
      setShowLeaveGroupModal(false);
      setGroupToLeave(null);
    } catch (err) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Leave Failed',
        message: err.response?.data?.error || "Error leaving group"
      });
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

  const handleRemoveMember = async (memberId) => {
    if (!selectedChat || !selectedChat.isGroup) return;

    try {
      await axios.post(`${API_BASE}/group-chats/${selectedChat._id}/remove-member`, {
        userId: memberId,
      });

      // Refresh group data
      const res = await axios.get(`${API_BASE}/group-chats/${selectedChat._id}`);
      setSelectedChat(res.data);
      setGroups(prev => prev.map(g => g._id === selectedChat._id ? res.data : g));
      setShowRemoveConfirm(false);
    } catch (err) {
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Remove Failed',
        message: err.response?.data?.error || "Error removing member"
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isGroupChat) {
        handleSendGroupMessage();
      } else {
        handleSendMessage();
      }
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    setIsGroupChat(chat.isGroup || false);
    
    // Update recent chats
    setRecentChats(prev => {
      const newChats = prev.filter(c => c._id !== chat._id);
      return [chat, ...newChats];
    });
    localStorage.setItem("recentChats_vpe", JSON.stringify([chat, ...recentChats.filter(c => c._id !== chat._id)]));
  };

  const handleGroupSelect = (group) => {
    setSelectedChat(group);
    setIsGroupChat(true);
    
    // Update recent chats
    setRecentChats(prev => {
      const newChats = prev.filter(c => c._id !== group._id);
      return [group, ...newChats];
    });
    localStorage.setItem("recentChats_vpe", JSON.stringify([group, ...recentChats.filter(c => c._id !== group._id)]));
  };

  // ================= RENDER FUNCTIONS =================
  const renderMessage = (message, isOwn) => (
    <div
      key={message._id || Math.random()}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-800"
        }`}
      >
        {message.fileUrl ? (
          <div>
            <p className="text-sm mb-2">File sent</p>
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View File
            </a>
          </div>
        ) : (
          <p className="text-sm">{message.message}</p>
        )}
        <p className={`text-xs mt-1 ${isOwn ? "text-blue-100" : "text-gray-500"}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );

  const renderGroupMessage = (message) => {
    const isOwn = message.senderId === currentUserId;
    const sender = users.find(u => u._id === message.senderId);
    
    return (
      <div
        key={message._id || Math.random()}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isOwn
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          {!isOwn && (
            <p className={`text-xs font-semibold mb-1 ${isOwn ? "text-blue-100" : "text-gray-600"}`}>
              {sender ? getUserDisplayName(sender, contactNicknames[sender._id]) : "Unknown User"}
            </p>
          )}
          {message.fileUrl ? (
            <div>
              <p className="text-sm mb-2">File sent</p>
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View File
              </a>
            </div>
          ) : (
            <p className="text-sm">{message.message}</p>
          )}
          <p className={`text-xs mt-1 ${isOwn ? "text-blue-100" : "text-gray-500"}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  };

  const renderChatList = () => (
    <div className="w-full md:w-1/3 bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Chats</h2>
        <div className="mt-4 space-y-2">
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create Group
          </button>
          <button
            onClick={() => setShowJoinGroupModal(true)}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
          >
            Join Group
          </button>
        </div>
      </div>

      {/* Recent Chats */}
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Recent Chats</h3>
        <div className="space-y-2">
          {recentChats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => handleChatSelect(chat)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedChat?._id === chat._id
                  ? "bg-blue-100 border-l-4 border-blue-500"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {chat.isGroup ? "G" : chat.firstname?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {chat.isGroup ? chat.name : getUserDisplayName(chat, contactNicknames[chat._id])}
                  </p>
                  {lastMessages[chat._id] && (
                    <p className="text-xs text-gray-500 truncate">
                      {lastMessages[chat._id].prefix}{lastMessages[chat._id].text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Groups */}
      <div className="p-4 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Groups</h3>
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group._id}
              onClick={() => handleGroupSelect(group)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedChat?._id === group._id
                  ? "bg-blue-100 border-l-4 border-blue-500"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  G
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {group.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {group.participants?.length || 0} members
                  </p>
                </div>
                {group.createdBy !== currentUserId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmLeaveGroup(group);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Leave
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users */}
      <div className="p-4 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Start New Chat</h3>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user._id}
              onClick={() => handleStartNewChat(user)}
              className="p-3 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.firstname?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getUserDisplayName(user, contactNicknames[user._id])}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.role || "User"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderChatArea = () => (
    <div className="flex-1 flex flex-col bg-gray-50">
      {selectedChat ? (
        <>
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                  isGroupChat ? "bg-green-500" : "bg-blue-500"
                }`}>
                  {isGroupChat ? "G" : selectedChat.firstname?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isGroupChat ? selectedChat.name : getUserDisplayName(selectedChat, contactNicknames[selectedChat._id])}
                  </h3>
                  {isGroupChat && (
                    <p className="text-sm text-gray-500">
                      {selectedChat.participants?.length || 0} members
                    </p>
                  )}
                </div>
              </div>
              {isGroupChat && selectedChat.createdBy === currentUserId && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowRemoveConfirm(true)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Manage Group
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isGroupChat ? (
              groupMessages[selectedChat._id]?.map((message) => renderGroupMessage(message)) || []
            ) : (
              messages[selectedChat._id]?.map((message) => 
                renderMessage(message, message.senderId === currentUserId)
              ) || []
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={openFilePicker}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                📎
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={isGroupChat ? handleSendGroupMessage : handleSendMessage}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Send
              </button>
            </div>
            {selectedFile && (
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-sm text-gray-600">File: {selectedFile.name}</span>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Select a chat to start messaging
            </h3>
            <p className="text-gray-500">
              Choose from your recent chats or start a new conversation
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ================= MODALS =================
  const renderCreateGroupModal = () => (
    showCreateGroupModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">Create New Group</h3>
          <input
            type="text"
            placeholder="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Participants
            </label>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {users.map((user) => (
                <label key={user._id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedGroupMembers.includes(user._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroupMembers([...selectedGroupMembers, user._id]);
                      } else {
                        setSelectedGroupMembers(selectedGroupMembers.filter(id => id !== user._id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{getUserDisplayName(user, contactNicknames[user._id])}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCreateGroup}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreateGroupModal(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  );

  const renderJoinGroupModal = () => (
    showJoinGroupModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">Join Group</h3>
          <input
            type="text"
            placeholder="Group ID"
            value={joinGroupCode}
            onChange={(e) => setJoinGroupCode(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex space-x-2">
            <button
              onClick={handleJoinGroup}
              className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
            >
              Join
            </button>
            <button
              onClick={() => setShowJoinGroupModal(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  );

  const renderLeaveGroupModal = () => (
    showLeaveGroupModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">Leave Group</h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to leave "{groupToLeave?.name}"? You can rejoin later if you have the group ID.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleLeaveGroup}
              className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
            >
              Leave
            </button>
            <button
              onClick={() => setShowLeaveGroupModal(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  );

  const renderRemoveConfirmModal = () => (
    showRemoveConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">Remove Member</h3>
          <p className="text-gray-600 mb-4">
            Select a member to remove from the group:
          </p>
          <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
            {selectedChat?.participants?.map((participantId) => {
              const participant = users.find(u => u._id === participantId);
              if (!participant || participant._id === currentUserId) return null;
              
              return (
                <div key={participant._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{getUserDisplayName(participant, contactNicknames[participant._id])}</span>
                  <button
                                         onClick={() => handleRemoveMember(participant._id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setShowRemoveConfirm(false)}
            className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  );

  const renderCreatorLeaveError = () => (
    showCreatorLeaveError && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4 text-red-600">Cannot Leave Group</h3>
          <p className="text-gray-600 mb-4">
            As the group creator, you cannot leave the group. You can either delete the group or transfer ownership to another member.
          </p>
          <button
            onClick={() => setShowCreatorLeaveError(false)}
            className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  );

  const renderValidationModal = () => (
    validationModal.isOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className={`text-lg font-semibold mb-4 ${
            validationModal.type === 'error' ? 'text-red-600' : 
            validationModal.type === 'warning' ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            {validationModal.title}
          </h3>
          <p className="text-gray-600 mb-4">{validationModal.message}</p>
          <button
            onClick={() => setValidationModal({ isOpen: false, type: '', title: '', message: '' })}
            className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  );

  // ================= MAIN RENDER =================
  return (
    <div className="flex h-screen bg-gray-100">
      {renderChatList()}
      {renderChatArea()}
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
      
      {/* Modals */}
      {renderCreateGroupModal()}
      {renderJoinGroupModal()}
      {renderLeaveGroupModal()}
      {renderRemoveConfirmModal()}
      {renderCreatorLeaveError()}
      {renderValidationModal()}
    </div>
  );
};

export default VPE_Chats;
