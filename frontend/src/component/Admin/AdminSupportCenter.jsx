import React, { useState, useEffect } from "react";
import Admin_Navbar from "./Admin_Navbar";
import ProfileMenu from "../ProfileMenu";
import { getAllTickets, replyToTicket } from '../../services/ticketService';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

export default function AdminSupportCenter() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError('');
      try {
        console.log('Fetching tickets...');
        const data = await getAllTickets();
        console.log('Tickets fetched:', data);
        setTickets(data || []);
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
  }, []);

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
    try {
      const adminId = localStorage.getItem('userID');
      if (!adminId) {
        setReplyError('Admin ID not found. Please log in again.');
        setReplyLoading(false);
        return;
      }

      await replyToTicket(ticketId, {
        sender: 'admin',
        senderId: adminId,
        message: reply
      });
      setReply('');
      
      // Refetch tickets to get updated data
      const updatedTickets = await getAllTickets();
      setTickets(updatedTickets);
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
      const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
      
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
      const updatedTickets = await getAllTickets();
      setTickets(updatedTickets);
    } catch (err) {
      console.error('Status change error:', err);
      setReplyError('Failed to update ticket status. Please try again.');
    }
  }

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
                  onClick={() => setSelected(ticket._id)}
                >
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
                    <textarea
                      placeholder="Respond to this ticket..."
                      className="w-full min-h-[100px] border rounded p-2 mb-4"
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                    />
                    {replyError && <div className="text-red-500 mb-2">{replyError}</div>}
                    <div className="flex gap-2">
                      <button
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        onClick={() => handleReply(ticket._id)}
                        disabled={replyLoading}
                      >
                        {replyLoading ? 'Sending...' : 'Send Response'}
                      </button>
                      {ticket.status === 'new' && (
                        <button
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                          onClick={() => handleStatusChange(ticket._id, 'opened')}
                        >
                          Mark as Opened
                        </button>
                      )}
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