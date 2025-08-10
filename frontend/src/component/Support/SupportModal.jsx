import React, { useState, useEffect } from "react";
import { Headphones, Search, FileText, Clock, CheckCircle, XCircle, Copy, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { getTicketByNumber, getUserTickets } from '../../services/ticketService';

export default function SupportModal({ onClose }) {
  const [view, setView] = useState('main'); // main | active | new | submitted | myTickets
  const [ticketInput, setTicketInput] = useState('');
  const [showTicket, setShowTicket] = useState(false);
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

  // New state for user tickets
  const [userTickets, setUserTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserTicket, setSelectedUserTicket] = useState(null);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [userRole, setUserRole] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [error, setError] = useState('');

  // Get user role on component mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || localStorage.getItem('role') || '';
    setUserRole(role);
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
    setTicketInput('');
    setShowTicket(false);
    setNewTicket({ number: generateTicketNumber(), subject: '', content: '', file: null });
    setSubmitted(false);
    setUserTickets([]);
    setSearchTerm('');
    setSelectedUserTicket(null);
    setTicketsError('');
    setShowAllTickets(false);
    setSortOrder('newest');
    onClose();
  };

  // Fetch user tickets
  const fetchUserTickets = async () => {
    setTicketsLoading(true);
    setTicketsError('');
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userID = localStorage.getItem('userID');
      
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

  // Filter tickets based on search term
  const filteredTickets = userTickets.filter(ticket => 
    ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort tickets based on sort order
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  // Get most recent ticket for quick view
  const mostRecentTicket = userTickets.length > 0 ? userTickets[0] : null;

  // Get status info for display
  const getStatusInfo = (status) => {
    switch (status) {
      case 'new':
        return { icon: <Clock size={12} />, color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'opened':
        return { icon: <FileText size={12} />, color: 'text-orange-600', bgColor: 'bg-orange-100' };
      case 'closed':
        return { icon: <CheckCircle size={12} />, color: 'text-green-600', bgColor: 'bg-green-100' };
      default:
        return { icon: <Clock size={12} />, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  // Active Ticket view: handle fetch by number
  async function handleViewTicket(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowTicket(false);
    setTicketData(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }
      
      const ticket = await getTicketByNumber(ticketInput);
      setTicketData(ticket);
      setShowTicket(true);
    } catch (err) {
      console.error('Ticket fetch error:', err);
      if (err.response) {
        // Server responded with error status
        const errorMessage = err.response.data?.error || err.response.data?.message || 'Ticket not found';
        setError(errorMessage);
      } else if (err.request) {
        // Network error
        setError('Network error. Please check your connection and try again.');
      } else {
        // Other error
        setError('Ticket not found');
      }
    }
    setLoading(false);
  }

  // New Request view: handle submit
  async function handleSubmitNewTicket(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userID = localStorage.getItem('userID');
      
      if (!token || (!user._id && !userID)) {
        setError('User not authenticated. Please log in again.');
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
        setSubmitted(true);
        setShowToast(true);
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
        className="animate-support-modal w-[400px] p-8 rounded-2xl shadow-2xl relative"
        style={{
          background: 'linear-gradient(90deg, #ede7f6 0%, #9575cd 100%)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 text-gray-500 text-2xl font-bold hover:text-gray-700"
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
                  <Headphones size={60} className="text-[#9575cd]" />
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
        {/* My Tickets view */}
        {view === 'myTickets' && (
          <div className="transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getRoleWelcomeMessage()}<br /><span className="text-lg font-semibold">My Tickets</span></h2>
                <div className="text-lg mt-2">
                  {!showAllTickets ? (
                    <span>View all your tickets</span>
                  ) : (
                    <span>All your tickets</span>
                  )}
                </div>
              </div>
              <div className="ml-4">
                <div className="bg-white bg-opacity-30 rounded-full p-3">
                  <Headphones size={48} className="text-[#9575cd]" />
                </div>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search tickets by title or number..."
                className="w-full pl-10 pr-4 py-3 rounded-full bg-white bg-opacity-30 text-gray-900 placeholder-gray-500 border border-white focus:outline-none focus:border-[#9575cd]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Sort Controls - Only show when viewing all tickets */}
            {showAllTickets && sortedTickets.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  {sortedTickets.length} ticket{sortedTickets.length !== 1 ? 's' : ''} found
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="text-xs bg-white bg-opacity-30 text-gray-900 px-2 py-1 rounded border border-white focus:outline-none focus:border-[#9575cd]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            )}

            {/* Tickets List */}
            <div className="max-h-96 overflow-y-auto">
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
                        className={`p-4 rounded-lg cursor-pointer border border-transparent hover:border-[#9575cd] hover:bg-white hover:bg-opacity-20 transition-all ${
                          selectedUserTicket === mostRecentTicket._id ? 'bg-white bg-opacity-30 border-[#9575cd]' : 'bg-white bg-opacity-10'
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
                            {mostRecentTicket.messages && mostRecentTicket.messages.length > 1 && (
                              <div className="text-xs text-gray-500">
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
                    className="w-full mt-4 rounded-full px-4 py-3 bg-[#9575cd] text-white font-semibold text-center hover:bg-[#7e57c2] transition border border-white"
                  >
                    View All Tickets ({userTickets.length})
                  </button>
                </div>
              ) : sortedTickets.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  {searchTerm ? 'No tickets match your search' : 'You haven\'t submitted any tickets yet'}
                </div>
              ) : (
                // Show all tickets with sorting
                <div className="space-y-3">
                  {sortedTickets.map((ticket) => {
                    const statusInfo = getStatusInfo(ticket.status);
                    return (
                      <div
                        key={ticket._id}
                        className={`p-4 rounded-lg cursor-pointer border border-transparent hover:border-[#9575cd] hover:bg-white hover:bg-opacity-20 transition-all ${
                          selectedUserTicket === ticket._id ? 'bg-white bg-opacity-30 border-[#9575cd]' : 'bg-white bg-opacity-10'
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
                            {ticket.messages && ticket.messages.length > 1 && (
                              <div className="text-xs text-gray-500">
                                {ticket.messages.length - 1} response{ticket.messages.length > 2 ? 's' : ''} from support
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Back button */}
            <button
              className="w-full mt-4 rounded-full px-4 py-3 bg-white bg-opacity-30 text-gray-900 font-semibold text-center hover:bg-opacity-50 transition border border-white"
              onClick={() => {
                if (showAllTickets) {
                  setShowAllTickets(false);
                } else {
                  setView('main');
                }
              }}
            >
              {showAllTickets ? 'Back to Recent Ticket' : 'Back to Main Menu'}
            </button>
          </div>
        )}
        {/* Active Ticket view */}
        {view === 'active' && (
          <div className="transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getRoleWelcomeMessage()}<br /><span className="text-lg font-semibold">Active ticket</span></h2>
                <div className="text-lg mt-2">Enter your ticket number to check status</div>
              </div>
              <div className="ml-4">
                <div className="bg-white bg-opacity-30 rounded-full p-3">
                  <Headphones size={48} className="text-[#9575cd]" />
                </div>
              </div>
            </div>
            <form
              className="flex flex-col gap-4"
              onSubmit={handleViewTicket}
            >
              <input
                className="w-full rounded-full px-4 py-3 bg-[#9575cd] bg-opacity-80 text-white placeholder-white text-center border border-white focus:outline-none"
                placeholder="enter ticket here"
                value={ticketInput}
                onChange={e => setTicketInput(e.target.value)}
              />
              {loading && <div className="text-center text-gray-500">Loading...</div>}
              {error && <div className="text-center text-red-500">{error}</div>}
              {showTicket && ticketData && (
                <div className="w-full rounded-2xl bg-white bg-opacity-60 p-6 text-gray-900 border border-[#9575cd] mt-2">
                  <div className="mb-2 font-semibold">Ticket Number: {ticketData.number}</div>
                  <div className="mb-2">Status: {ticketData.status}</div>
                  <div className="text-center text-lg mt-4">{ticketData.description}</div>
                </div>
              )}
              {!showTicket && !loading && (
                <button
                  type="submit"
                  className="w-full rounded-full px-4 py-3 bg-[#9575cd] text-white font-semibold text-center hover:bg-[#7e57c2] transition border border-white"
                >
                  View Ticket
                </button>
              )}
            </form>
          </div>
        )}
        {/* New Request view */}
        {view === 'new' && (
          <div className="transition-all">
            {/* Toast message */}
            {showToast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-2 animate-fade-in">
                <span className="font-semibold">Report submitted</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getRoleWelcomeMessage()}<br /><span className="text-lg font-semibold">New Request</span></h2>
              </div>
              <div className="ml-4">
                <div className="bg-white bg-opacity-30 rounded-full p-3">
                  <Headphones size={48} className="text-[#9575cd]" />
                </div>
              </div>
            </div>
            {!submitted ? (
              <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmitNewTicket}
              >
                <div className="text-sm text-gray-700 mb-1 flex items-center gap-2">
                  <span>Ticket Number: <span className="font-mono">{newTicket.number}</span></span>
                  <button
                    type="button"
                    onClick={() => setNewTicket(prev => ({ ...prev, number: generateTicketNumber() }))}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Regenerate
                  </button>
                  <button
                    id="copy-ticket-number"
                    type="button"
                    onClick={copyTicketNumber}
                    className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 flex items-center gap-1 transition-colors"
                    title="Copy ticket number"
                  >
                    <Copy size={12} />
                    Copy
                  </button>
                </div>
                <input
                  className="w-full rounded-full px-4 py-2 bg-white bg-opacity-30 text-gray-900 placeholder-gray-500 text-center border border-white focus:outline-none"
                  placeholder="Enter subject"
                  value={newTicket.subject}
                  onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                  required
                />
                <textarea
                  className="w-full rounded-2xl px-4 py-4 bg-white bg-opacity-30 text-gray-900 placeholder-gray-500 text-center border border-white focus:outline-none min-h-[100px]"
                  placeholder="Enter content"
                  value={newTicket.content}
                  onChange={e => setNewTicket({ ...newTicket, content: e.target.value })}
                  required
                />
                <input
                  type="file"
                  className="w-full rounded-full px-4 py-2 bg-white bg-opacity-30 text-gray-900 border border-white focus:outline-none"
                  onChange={e => setNewTicket({ ...newTicket, file: e.target.files[0] })}
                />
                {loading && <div className="text-center text-gray-500">Submitting...</div>}
                {error && <div className="text-center text-red-500">{error}</div>}
                <button
                  type="submit"
                  className="w-full rounded-full px-4 py-3 bg-[#9575cd] text-white font-semibold text-center hover:bg-[#7e57c2] transition border border-white mt-2"
                  disabled={loading}
                >
                  Submit
                </button>
              </form>
            ) : null}
          </div>
        )}
      <style>{`
        .animate-support-modal {
          animation: supportModalPop 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-fade-in {
          animation: fadeIn 0.3s;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes supportModalPop {
          0% { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      </div>
    </div>
  );
} 