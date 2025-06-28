//Director_Chats.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import videocall from "../../assets/videocall.png";
import voicecall from "../../assets/voicecall.png";
import uploadfile from "../../assets/uploadfile.png";
import closeIcon from "../../assets/close.png";
import Director_Navbar from "./Director_Navbar";
import ProfileMenu from "../ProfileMenu";
import defaultAvatar from "../../assets/profileicon (1).svg";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Director_Chats() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [recentChats, setRecentChats] = useState(() => {
    // Load from localStorage if available
    const stored = localStorage.getItem("recentChats_director");
    return stored ? JSON.parse(stored) : [];
  });
  const [lastMessage, setLastMessage] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

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
      setOnlineUsers(users);
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
        localStorage.removeItem("selectedChatId_director");
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
    localStorage.setItem("selectedChatId_director", user._id);
    // Add to recent chats if not already present
    setRecentChats((prev) => {
      const exists = prev.find((u) => u._id === user._id);
      if (exists) return prev;
      const updated = [user, ...prev].slice(0, 10); // Keep max 10 recent
      localStorage.setItem("recentChats_director", JSON.stringify(updated));
      return updated;
    });
  };

  // Keep recentChats in sync with localStorage
  useEffect(() => {
    localStorage.setItem("recentChats_director", JSON.stringify(recentChats));
  }, [recentChats]);

  const filteredUsers = users.filter((u) =>
    `${u.firstname} ${u.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) && u.role !== "vice president of education"
  );

  // ================= RENDER =================
  useEffect(() => {
    if (selectedChat) {
      const chatMessages = messages[selectedChat._id] || [];
      const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
      if (lastMsg) {
        let prefix = (lastMsg.senderId === currentUserId) ? "You: " : `${selectedChat.lastname}, ${selectedChat.firstname}: `;
        let text = (lastMsg.message) ? lastMsg.message : (lastMsg.fileUrl ? "File sent" : "");
        setLastMessage({ prefix, text });
      } else {
        setLastMessage(null);
      }
    } else {
      setLastMessage(null);
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

  return (
    <div className="flex min-h-screen h-screen max-h-screen">
      <Director_Navbar />
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
          <ProfileMenu />
        </div>

        <div className="flex flex-1 overflow-hidden h-full">
          {/* LEFT PANEL */}
          <div className="w-full md:w-1/3 p-4 overflow-hidden flex flex-col h-full">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full mb-4 p-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
            {/* Recent Chats */}
            {searchTerm.trim() === "" && recentChats.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-2 pl-1">Recent Chats</div>
                <div className="space-y-2">
                  {recentChats.map((user) => {
                    // Find the latest message between current user and this user
                    const chatMessages = messages[user._id] || [];
                    const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
                    let lastMsgPrefix = "";
                    let lastMsgText = "";
                    if (lastMsg) {
                      if (lastMsg.senderId === currentUserId) {
                        lastMsgPrefix = "You: ";
                      } else {
                        lastMsgPrefix = `${user.lastname}, ${user.firstname}: `;
                      }
                      if (lastMsg.message) {
                        lastMsgText = lastMsg.message;
                      } else if (lastMsg.fileUrl) {
                        lastMsgText = "File sent";
                      }
                    }
                    return (
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
                              localStorage.setItem('recentChats_director', JSON.stringify(updated));
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
                    );
                  })}
                </div>
              </div>
            )}
            {/* If no search and no recent chats, show message */}
            {searchTerm.trim() === "" && recentChats.length === 0 && (
              <div className="p-3 rounded-lg bg-gray-100">
                <p className="text-gray-600 text-center">No users available</p>
              </div>
            )}
          </div>

          {/* Divider - Always show */}
          <div className="w-px bg-black" />

          {/* RIGHT PANEL - Always show */}
          <div className="w-full md:w-2/3 flex flex-col p-4 overflow-hidden h-full">
            {selectedChat && users.some(u => u._id === selectedChat._id) ? (
              <>
                <div className="flex justify-between items-center mb-4 border-b border-black pb-4">
                  <div className="flex items-center gap-3">
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
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
                  {selectedChatMessages.map((msg, index) => {
                    const isRecipient = msg.senderId !== currentUserId;
                    const sender = isRecipient ? users.find(u => u._id === msg.senderId) : null;
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
                          // Current user's message (right aligned, time above message)
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
                          // Recipient's message (left aligned, profile pic, name, timestamp)
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
                                    <span className="font-semibold text-sm">{sender ? `${sender.lastname}, ${sender.firstname}` : ""}</span>
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
      </div>
    </div>
  );
}
