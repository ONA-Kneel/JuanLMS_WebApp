import React, { useState, useEffect } from "react";
import { Headphones, Search, FileText, Clock, CheckCircle, XCircle, Copy, ArrowLeft, MessageCircle, Plus } from 'lucide-react';
import axios from 'axios';
import { getUserTickets } from '../../services/ticketService';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function SupportModal({ onClose }) {
  const [view, setView] = useState('main'); // main | new | submitted | myTickets
  // Generate ticket number function
  function generateTicketNumber() {
    let num = '';
    for (let i = 0; i < 12; i++) {
      num += Math.floor(Math.random() * 10);
    }
    return `SJDD${num}`;
  }

  const [newTicket, setNewTicket] = useState({
    number: generateTicketNumber(),
    subject: '',
    content: '',
    file: null
  });

  // Enhanced state for user tickets
  const [userTickets, setUserTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserTicket, setSelectedUserTicket] = useState(null);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [userRole, setUserRole] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, new, opened, closed
  const [user, setUser] = useState(null);

  // Attachment preview state
  const [showAttachment, setShowAttachment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("attachment");
  const [attachmentType, setAttachmentType] = useState("application/octet-stream");
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  // Get user role on component mount
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const role = userData.role || localStorage.getItem('role') || '';
    setUserRole(role);
    setUser(userData);
  }, []);

  // Auto-close toast and modal after 2.5s
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        handleClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Reset state when modal closes
  const handleClose = () => {
    setView('main');
    setNewTicket({ number: generateTicketNumber(), subject: '', content: '', file: null });
    setUserTickets([]);
    setSearchTerm('');
    setSelectedUserTicket(null);
    setTicketsError('');
    setShowAllTickets(false);
    setSortOrder('newest');
    setActiveFilter('all');
    onClose();
  };

  // Navigate back within the support center modal
  const handleBack = () => {
    if (view === 'main') {
      handleClose();
    } else {
      setView('main');
      setSelectedUserTicket(null);
      setShowAllTickets(false);
      setSearchTerm('');
    }
  };

  // Fetch user tickets
  const fetchUserTickets = async () => {
    setTicketsLoading(true);
    setTicketsError('');
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Always use _id for tickets (MongoDB ObjectId)
      const userId = user._id;
      
      if (!userId) {
        setTicketsError('User ID not found. Please log in again.');
        return;
      }

      const tickets = await getUserTickets(userId);
      setUserTickets(tickets || []);
    } catch (err) {
      console.error('Error fetching user tickets:', err);
      setUserTickets([]);
      if (err.response) {
        setTicketsError(err.response.data?.error || 'Failed to fetch tickets');
      } else if (err.request) {
        setTicketsError('Network error. Please check your connection and try again.');
      } else {
        setTicketsError('Failed to fetch tickets. Please try again.');
      }
    } finally {
      setTicketsLoading(false);
    }
  };

  // Filter tickets based on search term and status
  const filteredTickets = userTickets.filter(ticket => {
    const matchesSearch = ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || ticket.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Sort tickets based on sort order
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
  });

  // Get most recent ticket for summary view
  const mostRecentTicket = sortedTickets[0];

  // Get status info for styling
  const getStatusInfo = (status) => {
    switch (status) {
      case 'new':
        return {
          icon: <Clock size={16} />,
          bgColor: 'bg-blue-100',
          color: 'text-blue-800',
          label: 'New'
        };
      case 'opened':
        return {
          icon: <MessageCircle size={16} />,
          bgColor: 'bg-yellow-100',
          color: 'text-yellow-800',
          label: 'Opened'
        };
      case 'closed':
        return {
          icon: <CheckCircle size={16} />,
          color: 'text-green-800',
          label: 'Closed'
        };
      default:
        return {
          icon: <FileText size={16} />,
          bgColor: 'bg-gray-100',
          color: 'text-gray-800',
          label: status
        };
    }
  };

  // Get ticket counts for each status
  const getTicketCounts = () => {
    const counts = { all: userTickets.length, new: 0, opened: 0, closed: 0 };
    userTickets.forEach(ticket => {
      if (counts[ticket.status] !== undefined) {
        counts[ticket.status]++;
      }
    });
    return counts;
  };

  const ticketCounts = getTicketCounts();

  // Handle ticket submission
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!newTicket.subject.trim() || !newTicket.content.trim()) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Always use _id for tickets (MongoDB ObjectId)
      const userId = user._id;
      
      if (!userId) {
        setError('User ID not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('subject', newTicket.subject);
      formData.append('description', newTicket.content);
      formData.append('userId', userId);
      formData.append('number', newTicket.number);
      
      if (newTicket.file) {
        formData.append('file', newTicket.file);
      }

      const response = await axios.post(`${import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com"}/api/tickets`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 201) {
        setShowToast(true);
        // Refresh tickets list
        fetchUserTickets();
      }
    } catch (err) {
      console.error('Ticket submission error:', err);
      if (err.response) {
        setError(err.response.data?.error || 'Failed to submit ticket');
      } else if (err.request) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to submit ticket. Please try again.');
      }
    }
    setLoading(false);
  }

  // Handle viewing my tickets
  const handleViewMyTickets = () => {
    setView('myTickets');
    fetchUserTickets();
  };

  // Copy ticket number to clipboard
  const copyTicketNumber = async () => {
    try {
      await navigator.clipboard.writeText(newTicket.number);
      // Show temporary success feedback
      const copyButton = document.getElementById('copy-ticket-number');
      if (copyButton) {
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = 'Copied!';
        copyButton.classList.add('bg-green-500', 'hover:bg-green-600');
        setTimeout(() => {
          copyButton.innerHTML = originalText;
          copyButton.classList.remove('bg-green-500', 'hover:bg-green-600');
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to copy ticket number:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = newTicket.number;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      // Show feedback
      const copyButton = document.getElementById('copy-ticket-number');
      if (copyButton) {
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = 'Copied!';
        copyButton.classList.add('bg-green-500', 'hover:bg-green-600');
        setTimeout(() => {
          copyButton.innerHTML = originalText;
          copyButton.classList.remove('bg-green-500', 'hover:bg-green-600');
        }, 1500);
      }
    }
  };

  // Helper to fetch ticket attachment as Blob
  async function fetchAttachmentBlob(ticketId) {
    const raw = localStorage.getItem("token") || "";
    const token = raw.startsWith('"') ? JSON.parse(raw) : raw;
    if (!token) throw new Error("Missing auth token");

    const url = `${API_BASE}/api/tickets/file/${ticketId}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const cd = res.headers.get("Content-Disposition") || "";
    let name = "attachment";
    const star = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
    const bare = cd.match(/filename\s*=\s*([^;]+)/i);
    if (star) name = decodeURIComponent(star[1]);
    else if (quoted) name = quoted[1];
    else if (bare) name = bare[1].trim();

    const type = res.headers.get("Content-Type") || "application/octet-stream";
    const blob = await res.blob();
    return { blob, name, type };
  }

  async function handleOpenAttachment(ticketId) {
    try {
      setAttachmentLoading(true);
      setAttachmentError("");
      const { blob, name, type } = await fetchAttachmentBlob(ticketId);
      const url = URL.createObjectURL(blob);
      setAttachmentName(name);
      setAttachmentType(type);
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) {
        setAttachmentUrl(url);
        setShowAttachment(true);
      } else {
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch {
      setAttachmentError("Failed to open attachment. Please try downloading it instead.");
      setShowAttachment(true);
    } finally {
      setAttachmentLoading(false);
    }
  }

  // Get role-specific welcome message
  const getRoleWelcomeMessage = () => {
    switch (userRole) {
      case 'faculty':
        return 'Faculty Support';
      case 'students':
        return 'Student Support';
      case 'principal':
        return 'Principal Support';
      case 'admin':
        return 'Admin Support';
      default:
        return 'Support Center';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div
        className="animate-support-modal w-[90vw] max-w-6xl h-[90vh] p-8 rounded-2xl shadow-2xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #e6f0ff 25%, #cfe0ff 60%, #1e40af 100%)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }}
      >
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 text-gray-500 text-2xl font-bold hover:text-gray-700 z-10"
        >
          &lt;
        </button>

        {/* Main view: two buttons */}
        {view === 'main' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{getRoleWelcomeMessage()}</h2>
                <p className="text-sm text-gray-600">How can we help you today?</p>
              </div>
              <div className="ml-4">
                <div className="bg-white bg-opacity-30 rounded-full p-3">
                  <Headphones size={60} className="text-[#1e40af]" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <button
                className="w-full rounded-full px-4 py-3 bg-white bg-opacity-30 text-gray-900 font-semibold text-center hover:bg-opacity-50 transition border border-white"
                onClick={handleViewMyTickets}
              >
                View My Tickets
              </button>
              <button
                className="w-full rounded-full px-4 py-3 bg-white bg-opacity-30 text-gray-900 font-semibold text-center hover:bg-opacity-50 transition border border-white"
                onClick={() => setView('new')}
              >
                New Request
              </button>
            </div>
          </>
        )}

        {/* My Tickets view - Enhanced */}
        {view === 'myTickets' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getRoleWelcomeMessage()}<br /><span className="text-lg font-semibold">My Tickets</span></h2>
                <div className="text-lg mt-2">
                  {!showAllTickets ? (
                    null
                  ) : (
                    <span>All your tickets</span>
                  )}
                </div>
              </div>
              <div className="ml-4">
                <div className="bg-white bg-opacity-30 rounded-full p-3">
                  <Headphones size={48} className="text-[#1e40af]" />
                </div>
              </div>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex space-x-2 mb-4">
              {[
                { key: 'all', label: `All (${ticketCounts.all})` },
                { key: 'new', label: `New (${ticketCounts.new})` },
                { key: 'opened', label: `Opened (${ticketCounts.opened})` },
                { key: 'closed', label: `Closed (${ticketCounts.closed})` }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                    activeFilter === filter.key
                      ? 'bg-[#1e40af] text-white'
                      : 'bg-white bg-opacity-30 text-gray-700 hover:bg-opacity-50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search tickets by title or number..."
                className="w-full pl-10 pr-4 py-3 rounded-full bg-white bg-opacity-30 text-gray-900 placeholder-gray-500 border border-white focus:outline-none focus:border-[#1e40af]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Sort Controls - Only show when viewing all tickets */}
            {showAllTickets && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm bg-white bg-opacity-30"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowAllTickets(false)}
                  className="text-sm text-[#1e40af] hover:text-[#0f2a6b] underline"
                >
                  Show Summary
                </button>
              </div>
            )}

            {/* Tickets List */}
            <div className="flex-1 overflow-y-auto">
              {ticketsLoading ? (
                <div className="text-center text-gray-500 py-4">Loading your tickets...</div>
              ) : ticketsError ? (
                <div className="text-center text-red-500 py-4">{ticketsError}</div>
              ) : !showAllTickets && mostRecentTicket ? (
                // Show most recent ticket with option to view all
                <div className="space-y-3">
                  <div className="text-center mb-3">
                    <div className="text-sm text-gray-600 mb-2">Your most recent ticket:</div>
                  </div>
                  {(() => {
                    const statusInfo = getStatusInfo(mostRecentTicket.status);
                    return (
                      <div
                        className={`p-4 rounded-lg cursor-pointer border border-transparent hover:border-[#1e40af] hover:bg-white hover:bg-opacity-20 transition-all ${
                          selectedUserTicket === mostRecentTicket._id ? 'bg-white bg-opacity-30 border-[#1e40af]' : 'bg-white bg-opacity-10'
                        }`}
                        onClick={() => setSelectedUserTicket(selectedUserTicket === mostRecentTicket._id ? null : mostRecentTicket._id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{mostRecentTicket.subject}</h3>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                            {statusInfo.icon}
                            <span className="capitalize">{mostRecentTicket.status}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">#{mostRecentTicket.number}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(mostRecentTicket.createdAt).toLocaleDateString()}
                        </div>
                        
                        {/* Expanded ticket details */}
                        {selectedUserTicket === mostRecentTicket._id && (
                          <div className="mt-3 pt-3 border-t border-white border-opacity-20">
                            <p className="text-sm text-gray-700 mb-3">{mostRecentTicket.description}</p>
                            {mostRecentTicket.file && (
                              <div className="mb-3">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAttachment(mostRecentTicket._id)}
                                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  {attachmentLoading ? 'Loading…' : 'View / Download Attachment'}
                                </button>
                              </div>
                            )}
                            {/* Conversation Thread */}
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {(mostRecentTicket.messages && mostRecentTicket.messages.length > 0) ? (
                                mostRecentTicket.messages.map((msg, idx) => (
                                  <div key={idx} className="bg-white bg-opacity-60 rounded-md p-2">
                                    <div className="text-xs text-gray-600 font-semibold">
                                      {msg.sender}
                                    </div>
                                    <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                      {msg.message}
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1">
                                      {new Date(msg.timestamp).toLocaleString()}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-gray-500">No messages yet</div>
                              )}
                            </div>
                            {mostRecentTicket.messages && mostRecentTicket.messages.length > 1 && (
                              <div className="text-xs text-gray-500 mt-2">
                                {mostRecentTicket.messages.length - 1} response{mostRecentTicket.messages.length > 2 ? 's' : ''} from support
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  {/* View All Tickets Button */}
                  <button
                    onClick={() => setShowAllTickets(true)}
                    className="w-full py-2 px-4 bg-white bg-opacity-20 text-gray-700 rounded-lg hover:bg-opacity-30 transition-colors text-sm font-medium"
                  >
                    View All Tickets ({userTickets.length})
                  </button>
                </div>
              ) : (
                // Show all tickets
                <div className="space-y-3">
                  {sortedTickets.length === 0 ? (
                    <div className="text-center text-red-500 py-6">Ticket is not found</div>
                  ) : (
                    <>
                      {sortedTickets.map(ticket => {
                        const statusInfo = getStatusInfo(ticket.status);
                        return (
                          <div
                            key={ticket._id}
                            className={`p-4 rounded-lg cursor-pointer border border-transparent hover:border-[#1e40af] hover:bg-white hover:bg-opacity-20 transition-all ${
                              selectedUserTicket === ticket._id ? 'bg-white bg-opacity-30 border-[#1e40af]' : 'bg-white bg-opacity-10'
                            }`}
                            onClick={() => setSelectedUserTicket(selectedUserTicket === ticket._id ? null : ticket._id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{ticket.subject}</h3>
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                                {statusInfo.icon}
                                <span className="capitalize">{ticket.status}</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 mb-2">#{ticket.number}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </div>
                            
                            {/* Expanded ticket details */}
                            {selectedUserTicket === ticket._id && (
                              <div className="mt-3 pt-3 border-t border-white border-opacity-20">
                                <p className="text-sm text-gray-700 mb-3">{ticket.description}</p>
                                {ticket.file && (
                                  <div className="mb-3">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAttachment(ticket._id)}
                                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                    >
                                      {attachmentLoading ? 'Loading…' : 'View / Download Attachment'}
                                    </button>
                                  </div>
                                )}
                                {/* Conversation Thread */}
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {(ticket.messages && ticket.messages.length > 0) ? (
                                    ticket.messages.map((msg, idx) => (
                                      <div key={idx} className="bg-white bg-opacity-60 rounded-md p-2">
                                        <div className="text-xs text-gray-600 font-semibold">
                                          {msg.sender}
                                        </div>
                                        <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                          {msg.message}
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">
                                          {new Date(msg.timestamp).toLocaleString()}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-gray-500">No messages yet</div>
                                  )}
                                </div>
                                {ticket.messages && ticket.messages.length > 1 && (
                                  <div className="text-xs text-gray-500 mt-2">
                                    {ticket.messages.length - 1} response{ticket.messages.length > 2 ? 's' : ''} from support
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Back to Summary Button */}
                      <button
                        onClick={() => setShowAllTickets(false)}
                        className="w-full py-2 px-4 bg-white bg-opacity-20 text-gray-700 rounded-lg hover:bg-opacity-30 transition-colors text-sm font-medium"
                      >
                        Back to Summary
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Ticket Form */}
        {view === 'new' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getRoleWelcomeMessage()}<br /><span className="text-lg font-semibold">New Support Request</span></h2>
                <p className="text-sm text-gray-600">Submit a new support ticket</p>
              </div>
              <div className="ml-4">
                <div className="bg-white bg-opacity-30 rounded-full p-3">
                  <Plus size={48} className="text-[#1e40af]" />
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ticket Number</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newTicket.number}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                  <button
                    type="button"
                    id="copy-ticket-number"
                    onClick={copyTicketNumber}
                    className="px-3 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#0f2a6b] transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div className="mb-4 flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={newTicket.content}
                  onChange={(e) => setNewTicket({ ...newTicket, content: e.target.value })}
                  className="w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent resize-none"
                  placeholder="Please provide detailed information about your issue..."
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setNewTicket({ ...newTicket, file: e.target.files[0] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG</p>
              </div>

              {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="flex-1 py-3 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-[#1e40af] text-white rounded-lg hover:bg-[#0f2a6b] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Submitted Success View */}
        {view === 'submitted' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Submitted Successfully!</h2>
              <p className="text-gray-600 mb-4">Your support request has been submitted. We'll get back to you soon.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Ticket Number:</p>
                <p className="text-lg font-mono font-semibold text-[#1e40af]">{newTicket.number}</p>
                <p className="text-xs text-gray-500 mt-2">Please save this number for future reference</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-[#1e40af] text-white rounded-lg hover:bg-[#0f2a6b] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Attachment Preview Overlay (fallback if popup blocked) */}
      {showAttachment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="font-semibold text-gray-800 truncate pr-2">{attachmentName}</div>
              <div className="flex items-center gap-2">
                {attachmentUrl && (
                  <a
                    href={attachmentUrl}
                    download={attachmentName}
                    className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Download
                  </a>
                )}
                <button
                  className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => {
                    if (attachmentUrl) URL.revokeObjectURL(attachmentUrl);
                    setAttachmentUrl("");
                    setShowAttachment(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1">
              {attachmentLoading ? (
                <div className="p-6 text-center text-gray-600">Loading attachment...</div>
              ) : attachmentUrl ? (
                (() => {
                  const isImage = (attachmentType || "").startsWith("image/");
                  const isPdf = (attachmentType || "") === "application/pdf";
                  if (isImage) {
                    return (
                      <div className="w-full h-[70vh] flex items-center justify-center bg-gray-50">
                        <img src={attachmentUrl} alt={attachmentName} className="max-h-[68vh] max-w-full object-contain" />
                      </div>
                    );
                  }
                  if (isPdf) {
                    return (
                      <iframe title="Attachment Preview" src={attachmentUrl} className="w-full h-[70vh]" />
                    );
                  }
                  return (
                    <div className="p-6 text-center text-gray-700 text-sm">
                      Preview is not available for this file type. Use the Download button to view it locally.
                    </div>
                  );
                })()
              ) : (
                <div className="p-6 text-center text-red-600 text-sm">{attachmentError || "Unable to preview this file."}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 