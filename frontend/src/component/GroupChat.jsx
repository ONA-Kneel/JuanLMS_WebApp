// GroupChat.jsx
// A comprehensive group chat component for all user roles

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import uploadfile from "../assets/uploadfile.png";
import closeIcon from "../assets/close.png";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

export default function GroupChat({ NavbarComponent }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [groupMessages, setGroupMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [joinGroupId, setJoinGroupId] = useState("");
  const [lastMessages, setLastMessages] = useState({});

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);

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

    // Join all user's groups
    userGroups.forEach(group => {
      socket.current.emit("joinGroup", { userId: currentUserId, groupId: group._id });
    });

    socket.current.on("getGroupMessage", (data) => {
      const incomingMessage = {
        senderId: data.senderId,
        groupId: data.groupId,
        message: data.text,
        fileUrl: data.fileUrl || null,
      };

      setGroupMessages((prev) => {
        const newMessages = {
          ...prev,
          [incomingMessage.groupId]: [
            ...(prev[incomingMessage.groupId] || []),
            incomingMessage,
          ],
        };
        
        // Update last message for this group
        const group = userGroups.find(g => g._id === incomingMessage.groupId);
        if (group) {
          const sender = users.find(u => u._id === incomingMessage.senderId);
          const prefix = incomingMessage.senderId === currentUserId 
            ? "You: " 
            : `${sender?.lastname || 'Unknown'}, ${sender?.firstname || 'User'}: `;
          const text = incomingMessage.message 
            ? incomingMessage.message 
            : (incomingMessage.fileUrl ? "File sent" : "");
          setLastMessages(prev => ({
            ...prev,
            [group._id]: { prefix, text }
          }));
        }
        
        return newMessages;
      });
    });

    return () => {
      socket.current.disconnect();
    };
  }, [currentUserId, userGroups, users]);

  // ================= FETCH USERS =================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/users`);
        const userArray = Array.isArray(res.data) ? res.data : res.data.users || [];
        setUsers(userArray);
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

  // ================= FETCH USER GROUPS =================
  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        const res = await axios.get(`${API_BASE}/group-chats/user/${currentUserId}`);
        setUserGroups(res.data);
      } catch (err) {
        console.error("Error fetching user groups:", err);
      }
    };
    fetchUserGroups();
  }, [currentUserId]);

  // ================= FETCH GROUP MESSAGES =================
  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (!selectedGroup) return;
      try {
        const res = await axios.get(`${API_BASE}/group-messages/${selectedGroup._id}?userId=${currentUserId}`);
        setGroupMessages((prev) => {
          const newMessages = { ...prev, [selectedGroup._id]: res.data };
          
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
          setLastMessages(newLastMessages);
          
          return newMessages;
        });
      } catch (err) {
        console.error("Error fetching group messages:", err);
      }
    };

    fetchGroupMessages();
  }, [selectedGroup, currentUserId, userGroups, users]);

  // Auto-scroll
  const selectedGroupMessages = groupMessages[selectedGroup?._id] || [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedGroupMessages]);

  // ================= HANDLERS =================

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedGroup) return;

    const formData = new FormData();
    formData.append("groupId", selectedGroup._id);
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
        groupId: selectedGroup._id,
        text: sentMessage.message,
        fileUrl: sentMessage.fileUrl || null,
      });

      setGroupMessages((prev) => ({
        ...prev,
        [selectedGroup._id]: [...(prev[selectedGroup._id] || []), sentMessage],
      }));

      setNewMessage("");
      setSelectedFile(null);
    } catch (err) {
      console.error("Error sending group message:", err);
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

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
  };

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

      const newGroup = res.data;
      setUserGroups(prev => [newGroup, ...prev]);
      setSelectedGroup(newGroup);
      setShowCreateGroup(false);
      setGroupName("");
      setGroupDescription("");
      setSelectedParticipants([]);

      // Join the group in socket
      socket.current.emit("joinGroup", { userId: currentUserId, groupId: newGroup._id });
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
    if (!selectedGroup) return;

    try {
      await axios.post(`${API_BASE}/group-chats/${selectedGroup._id}/leave`, {
        userId: currentUserId,
      });

      setUserGroups(prev => prev.filter(g => g._id !== selectedGroup._id));
      setSelectedGroup(null);
      setGroupMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[selectedGroup._id];
        return newMessages;
      });

      // Leave the group in socket
      socket.current.emit("leaveGroup", { userId: currentUserId, groupId: selectedGroup._id });
    } catch (err) {
      console.error("Error leaving group:", err);
      alert(err.response?.data?.error || "Error leaving group");
    }
  };

  const toggleParticipant = (userId) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter((u) =>
    `${u.firstname} ${u.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) && 
    u._id !== currentUserId
  );

  const filteredGroups = userGroups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Navbar */}
      {NavbarComponent && <NavbarComponent />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Group Chats</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create Group
              </button>
              <button
                onClick={() => setShowJoinGroup(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Join Group
              </button>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL - Group List */}
          <div className="w-1/3 bg-white border-r flex flex-col">
            {/* Search */}
            <div className="p-4 border-b">
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Group List */}
            <div className="flex-1 overflow-y-auto">
              {filteredGroups.map((group) => (
                <div
                  key={group._id}
                  onClick={() => handleSelectGroup(group)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedGroup?._id === group._id ? "bg-blue-50 border-blue-200" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{group.name}</h3>
                      <p className="text-sm text-gray-600">{group.description}</p>
                      <p className="text-xs text-gray-500">
                        {group.participants.length} participants
                      </p>
                      {lastMessages[group._id] && (
                        <p className="text-xs text-gray-500 mt-1">
                          {lastMessages[group._id].prefix}{lastMessages[group._id].text}
                        </p>
                      )}
                    </div>
                    {group.admins.includes(currentUserId) && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL - Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedGroup ? (
              <>
                {/* Group Header */}
                <div className="bg-white border-b px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">{selectedGroup.name}</h2>
                      <p className="text-sm text-gray-600">{selectedGroup.description}</p>
                      <p className="text-xs text-gray-500">
                        {selectedGroup.participants.length} participants
                      </p>
                    </div>
                    <button
                      onClick={handleLeaveGroup}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Leave Group
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedGroupMessages.map((msg, index) => {
                    const isSender = msg.senderId === currentUserId;
                    const sender = users.find(u => u._id === msg.senderId);
                    const prevMsg = selectedGroupMessages[index - 1];
                    const showHeader =
                      index === 0 ||
                      msg.senderId !== prevMsg?.senderId ||
                      Math.abs(new Date(msg.createdAt) - new Date(prevMsg?.createdAt)) > 5 * 60 * 1000;

                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-xs lg:max-w-md ${isSender ? "order-2" : "order-1"}`}>
                          {showHeader && !isSender && (
                            <div className="text-xs text-gray-500 mb-1">
                              {sender ? `${sender.lastname}, ${sender.firstname}` : "Unknown User"}
                            </div>
                          )}
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isSender
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                          >
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
                            <div className={`text-xs mt-1 ${isSender ? "text-blue-100" : "text-gray-500"}`}>
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
                      onClick={handleSendMessage}
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
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a Group</h3>
                  <p className="text-gray-500">Choose a group from the list to start chatting</p>
                </div>
              </div>
            )}
          </div>
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
                  {filteredUsers.map((user) => (
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
  );
} 