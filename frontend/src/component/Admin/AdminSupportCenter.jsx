import React, { useState, useEffect } from "react";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import { getAllTickets, replyToTicket, openTicket } from '../../services/ticketService';
import axios from 'axios'; // Added axios import

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminSupportCenter() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all, new, opened, closed
  const [allTickets, setAllTickets] = useState([]); // Store all tickets for counting
  const [userDetails, setUserDetails] = useState({}); // Store user details for each ticket

  // Fetch user details for tickets
  const fetchUserDetails = async (tickets) => {
    try {
      // Fetch all users at once (like the chat system does)
      const response = await axios.get(`${API_BASE}/users`);
      console.log('Users API response:', response);
      const allUsers = Array.isArray(response.data) ? response.data : response.data.users || [];
      console.log('Processed users:', allUsers);
      
      // Create a map of userId to user details for quick lookup
      const userMap = {};
      allUsers.forEach(user => {
        if (user._id) {
          userMap[user._id] = {
            name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Unknown User',
            role: user.role || 'Unknown'
          };
        }
        // Also map by userID (string identifier) as fallback
        if (user.userID) {
          userMap[user.userID] = {
            name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Unknown User',
            role: user.role || 'Unknown'
          };
        }
      });
      console.log('User map created:', userMap);

      // Map user details to tickets
      const userDetailsMap = {};
      tickets.forEach(ticket => {
        if (!ticket.userId) {
          userDetailsMap[ticket._id] = {
            name: 'Unknown User',
            role: 'Unknown'
          };
          return;
        }

        // Try to find user by userId (MongoDB ObjectId)
        let userDetails = userMap[ticket.userId];
        
        // If not found by ObjectId, try by userID (string identifier)
        if (!userDetails) {
          userDetails = userMap[ticket.userId];
        }

        if (userDetails) {
          userDetailsMap[ticket._id] = userDetails;
        } else {
          userDetailsMap[ticket._id] = {
            name: 'User Not Found',
            role: 'Unknown'
          };
        }
      });

      setUserDetails(userDetailsMap);
    } catch (err) {
      console.error('Error fetching user details:', err);
      // Set default values if fetch fails
      const userDetailsMap = {};
      tickets.forEach(ticket => {
        userDetailsMap[ticket._id] = {
          name: 'Error Loading User',
          role: 'Unknown'
        };
      });
      setUserDetails(userDetailsMap);
    }
  };

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError('');
      try {
        console.log('Fetching tickets with filter:', activeFilter);
        const data = await getAllTickets(activeFilter === 'all' ? null : activeFilter);
        console.log('Tickets fetched:', data);
        setTickets(data || []);
        
        // Also fetch all tickets for counting if we're not already showing all
        if (activeFilter !== 'all') {
          const allData = await getAllTickets();
          setAllTickets(allData || []);
        } else {
          setAllTickets(data || []);
        }

        // Fetch user details for the tickets
        if (data && data.length > 0) {
          await fetchUserDetails(data);
        }
      } catch (err) {
        console.error('Error fetching tickets:', err);
        let errorMessage = 'Failed to fetch tickets. Please try again.';
        
        if (err.response) {
          const status = err.response.status;
          const data = err.response.data;
          console.error('Response error:', { status, data });
          
          if (status === 401) {
            errorMessage = 'Your session has expired. Please log in again.';
          } else if (status === 403) {
            errorMessage = 'You do not have permission to view support tickets.';
          } else if (status === 404) {
            errorMessage = 'Support tickets not found.';
          } else if (status >= 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else {
            errorMessage = data.message || data.error || `Failed to fetch tickets (${status}).`;
          }
        } else if (err.request) {
          console.error('Network error:', err.request);
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          console.error('Other error:', err);
          errorMessage = err.message || 'An unexpected error occurred.';
        }
        
        setError(errorMessage);
      }
      setLoading(false);
    }
    fetchTickets();
  }, [activeFilter]);

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

  async function handleReply(ticketId) {
    setReplyLoading(true);
    setReplyError('');
    setReplySuccess('');
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userID = localStorage.getItem('userID');
      const adminId = user._id || userID;
      if (!adminId) {
        setReplyError('Admin ID not found. Please log in again.');
        setReplyLoading(false);
        return;
      }

      const replyResponse = await replyToTicket(ticketId, {
        sender: 'admin',
        senderId: adminId,
        message: reply
      });
      console.log('[FRONTEND REPLY] Response from API:', replyResponse);
      setReply('');
      
      // Refetch tickets to get updated data
      const updatedTickets = await getAllTickets(activeFilter === 'all' ? null : activeFilter);
      setTickets(updatedTickets);
      
      // Also refetch all tickets for accurate tab counts
      const allData = await getAllTickets();
      setAllTickets(allData || []);
      
      // Refetch user details for updated tickets
      if (updatedTickets && updatedTickets.length > 0) {
        await fetchUserDetails(updatedTickets);
      }
      
      // If the current ticket is no longer in the updated tickets list (e.g., status changed),
      // clear the selection to avoid showing a "not found" state
      if (selected && !updatedTickets.find(t => t._id === selected)) {
        console.log('[FRONTEND REPLY] Selected ticket no longer in current view, clearing selection');
        setSelected(null);
      }
      
      // Show success message
      setReplySuccess('Reply sent successfully');
      // Clear success message after 3 seconds
      setTimeout(() => setReplySuccess(''), 3000);
    } catch (err) {
      console.error('Reply error:', err);
      if (err.response) {
        const errorMessage = err.response.data?.error || err.response.data?.message || 'Failed to send reply';
        setReplyError(errorMessage);
      } else if (err.request) {
        setReplyError('Network error. Please check your connection and try again.');
      } else {
        setReplyError('Failed to send reply. Please try again.');
      }
    }
    setReplyLoading(false);
  }

  async function handleStatusChange(ticketId, newStatus) {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
      const endpoint = newStatus === 'opened' ? 'open' : 'close';
      const response = await fetch(`${API_BASE}/api/tickets/${ticketId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to update ticket status: ${response.status}`);
      }

      // Refetch tickets to get updated data
      const updatedTickets = await getAllTickets(activeFilter === 'all' ? null : activeFilter);
      setTickets(updatedTickets);
      
      // Refetch user details for updated tickets
      if (updatedTickets && updatedTickets.length > 0) {
        await fetchUserDetails(updatedTickets);
      }
    } catch (err) {
      console.error('Status change error:', err);
      setReplyError('Failed to update ticket status. Please try again.');
    }
  }

  // Handle opening a ticket (changes status from 'new' to 'opened')
  const handleOpenTicket = async (ticketId) => {
    try {
      console.log('[FRONTEND OPEN TICKET] Opening ticket:', ticketId);
      const openedTicket = await openTicket(ticketId);
      console.log('[FRONTEND OPEN TICKET] Ticket opened successfully:', openedTicket);
      
      // Refetch tickets to get updated data
      const updatedTickets = await getAllTickets(activeFilter === 'all' ? null : activeFilter);
      setTickets(updatedTickets);
      
      // Also refetch all tickets for accurate tab counts
      const allData = await getAllTickets();
      setAllTickets(allData || []);
      
      // Refetch user details for updated tickets
      if (updatedTickets && updatedTickets.length > 0) {
        await fetchUserDetails(updatedTickets);
      }
      
      // If we're currently on the 'new' tab and the ticket moved to 'opened', 
      // automatically switch to the 'opened' tab to show the user where the ticket went
      if (activeFilter === 'new') {
        setTimeout(() => {
          handleFilterChange('opened');
        }, 1000);
      }
      
    } catch (err) {
      console.error('[FRONTEND OPEN TICKET ERROR]', err);
      // Don't show error to user for this automatic action
    }
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setSelected(null); // Clear selection when changing filters
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr ">
      <Admin_Navbar />
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Support Center</h2>
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
          <ProfileMenu isAdmin={true} />
        </div>
        

        {/* Filter Tabs */}
        <div className="mb-4 flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => handleFilterChange('all')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#9575cd] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            All ({allTickets.length})
          </button>
          <button
            onClick={() => handleFilterChange('new')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeFilter === 'new'
                ? 'bg-[#9575cd] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            New ({allTickets.filter(t => t.status === 'new').length})
          </button>
          <button
            onClick={() => handleFilterChange('opened')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeFilter === 'opened'
                ? 'bg-[#9575cd] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Opened ({allTickets.filter(t => t.status === 'opened').length})
          </button>
          <button
            onClick={() => handleFilterChange('closed')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeFilter === 'closed'
                ? 'bg-[#9575cd] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Closed ({allTickets.filter(t => t.status === 'closed').length})
          </button>
        </div>

        <div className="flex h-[70vh] bg-white rounded-2xl shadow-md">
          <div className="w-80 border-r border-gray-200 overflow-y-auto bg-white p-2" style={{ maxHeight: '100%' }}>
            {loading ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : error ? (
              <div className="text-center text-red-500">{error}</div>
            ) : tickets.length === 0 ? (
              <div className="text-center text-gray-500">No tickets found</div>
            ) : (
              tickets.map(ticket => (
                <div
                  key={ticket._id}
                  className={`p-4 mb-2 rounded-lg cursor-pointer border border-transparent hover:border-[#9575cd] hover:bg-[#ede7f6] transition-all ${selected === ticket._id ? 'bg-[#d1c4e9] border-[#9575cd] shadow' : ''}`}
                  onClick={() => {
                    setSelected(ticket._id);
                    // If this is a new ticket, automatically open it
                    if (ticket.status === 'new') {
                      handleOpenTicket(ticket._id);
                    }
                  }}
                >
                  <div className="text-xs text-gray-600 mb-1">
                    {userDetails[ticket._id]?.name || 'Loading...'} ({userDetails[ticket._id]?.role || 'Unknown'})
                  </div>
                  <b className="block text-base">{ticket.subject}</b>
                  <span className="block text-xs text-gray-500">{ticket.number}</span>
                  <span className="block text-xs mt-1 font-semibold text-[#7e57c2]">{ticket.status}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex-1 p-8 bg-white rounded-r-2xl shadow-inner">
            {selected ? (
              (() => {
                const ticket = tickets.find(t => t._id === selected);
                if (!ticket) return <div className="text-gray-500">Ticket not found</div>;
                return (
                  <>
                    <h3 className="text-xl font-semibold mb-2">{ticket.subject}</h3>
                    <div className="mb-2 text-sm text-[#7e57c2] font-semibold">Ticket No: {ticket.number} | Status: {ticket.status}</div>
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                      <div className="text-sm font-medium text-gray-700">
                        Submitted by: <span className="font-semibold text-blue-600">{userDetails[ticket._id]?.name || 'Loading...'}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Role: {userDetails[ticket._id]?.role || 'Unknown'}
                      </div>
                    </div>
                    <p className="mb-4 text-gray-700">{ticket.description}</p>
                    <div className="mb-4">
                      <b>Messages:</b>
                      <ul className="mt-2 space-y-2">
                        {ticket.messages && ticket.messages.length > 0 ? (
                          ticket.messages.map((msg, idx) => (
                            <li key={idx} className="bg-gray-100 rounded p-2 text-sm">
                              <span className="font-semibold">{msg.sender}:</span> {msg.message}
                              <span className="block text-xs text-gray-400">{new Date(msg.timestamp).toLocaleString()}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-400">No messages</li>
                        )}
                      </ul>
                    </div>
                    {ticket.status === 'new' && (
                      <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                        💡 <strong>Note:</strong> This ticket will automatically be moved to the "Opened" tab when you view it.
                      </div>
                    )}
                    <textarea
                      placeholder="Respond to this ticket..."
                      className="w-full min-h-[100px] border rounded p-2 mb-4"
                      value={reply}
                      onChange={e => {
                        setReply(e.target.value);
                        // Clear success/error messages when user starts typing
                        if (replySuccess) setReplySuccess('');
                        if (replyError) setReplyError('');
                      }}
                    />
                    {replyError && <div className="text-red-500 mb-2">{replyError}</div>}
                    {replySuccess && <div className="text-green-500 mb-2">{replySuccess}</div>}
                    <div className="flex gap-2">
                      <button
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        onClick={() => handleReply(ticket._id)}
                        disabled={replyLoading}
                      >
                        {replyLoading ? 'Sending...' : 'Send Response'}
                      </button>
                      {/* "Mark as Opened" button removed - status automatically changes when admin replies */}
                      {ticket.status === 'opened' && (
                        <button
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                          onClick={() => handleStatusChange(ticket._id, 'closed')}
                        >
                          Mark as Closed
                        </button>
                      )}
                    </div>
                  </>
                );
              })()
            ) : (
              <p className="text-gray-500">Select a ticket to view details</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}