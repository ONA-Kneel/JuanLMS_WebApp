import React, { useState, useEffect } from "react";
import { Headphones, Search, FileText, Clock, CheckCircle, XCircle, ArrowLeft, MessageCircle } from 'lucide-react';
import { getUserTickets } from '../../services/ticketService';
import ProfileMenu from '../ProfileMenu';

export default function SupportCenter() {
  const [userTickets, setUserTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all, new, opened, closed
  const [userRole, setUserRole] = useState('');
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  // Get user role and info on component mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || localStorage.getItem('role') || '';
    setUserRole(role);
    fetchUserTickets();
    fetchAcademicInfo();
  }, []);

  // Fetch academic year and term info
  const fetchAcademicInfo = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com"}/api/school-year/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAcademicYear(data);
        if (data._id) {
          const termResponse = await fetch(`${import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com"}/api/term/active/${data._id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (termResponse.ok) {
            const termData = await termResponse.json();
            setCurrentTerm(termData);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching academic info:', err);
    }
  };

  // Fetch user tickets
  const fetchUserTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id;
      
      if (!userId) {
        setError('User ID not found. Please log in again.');
        return;
      }

      const tickets = await getUserTickets(userId);
      setUserTickets(tickets || []);
    } catch (err) {
      console.error('Error fetching user tickets:', err);
      setUserTickets([]);
      if (err.response) {
        setError(err.response.data?.error || 'Failed to fetch tickets');
      } else if (err.request) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to fetch tickets. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter tickets based on search term and status
  const filteredTickets = userTickets.filter(ticket => {
    const matchesSearch = ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || ticket.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

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
          bgColor: 'bg-green-100',
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

  // Get role-specific welcome message
  const getRoleWelcomeMessage = () => {
    switch (userRole) {
      case 'faculty':
        return 'Faculty Support Center';
      case 'students':
        return 'Student Support Center';
      case 'principal':
        return 'Principal Support Center';
      case 'vpe':
        return 'VPE Support Center';
      default:
        return 'Support Center';
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden font-poppinsr">
      {/* Navigation placeholder - will be replaced by actual navbar */}
      <div className="w-64 bg-[#010a51] text-white p-4 hidden md:block">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Support Center</h3>
        </div>
      </div>
      
      <div className="flex-1 bg-gray-100 p-4 sm:p-6 md:p-10 overflow-auto font-poppinsr md:ml-64">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">{getRoleWelcomeMessage()}</h2>
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

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6">
          {[
            { key: 'all', label: `All (${ticketCounts.all})` },
            { key: 'new', label: `New (${ticketCounts.new})` },
            { key: 'opened', label: `Opened (${ticketCounts.opened})` },
            { key: 'closed', label: `Closed (${ticketCounts.closed})` }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeFilter === filter.key
                  ? 'bg-[#9575cd] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search tickets by title or number..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#9575cd] focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex h-[70vh] bg-white rounded-2xl shadow-md">
          {/* Tickets List */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto bg-white p-2" style={{ maxHeight: '100%' }}>
            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading your tickets...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">{error}</div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {searchTerm ? 'No tickets match your search' : 'No tickets found'}
              </div>
            ) : (
              filteredTickets.map(ticket => {
                const statusInfo = getStatusInfo(ticket.status);
                return (
                  <div
                    key={ticket._id}
                    className={`p-4 mb-2 rounded-lg cursor-pointer border border-transparent hover:border-[#9575cd] hover:bg-[#ede7f6] transition-all ${
                      selectedTicket === ticket._id ? 'bg-[#d1c4e9] border-[#9575cd] shadow' : ''
                    }`}
                    onClick={() => setSelectedTicket(ticket._id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{ticket.subject}</h3>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                        {statusInfo.icon}
                        <span>{statusInfo.label}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">#{ticket.number}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                    {ticket.messages && ticket.messages.length > 1 && (
                      <div className="text-xs text-blue-600 mt-1">
                        {ticket.messages.length - 1} response{ticket.messages.length > 2 ? 's' : ''} from support
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Ticket Details */}
          <div className="flex-1 p-8 bg-white rounded-r-2xl shadow-inner">
            {selectedTicket ? (
              (() => {
                const ticket = filteredTickets.find(t => t._id === selectedTicket);
                if (!ticket) return <div className="text-gray-500">Ticket not found</div>;
                
                const statusInfo = getStatusInfo(ticket.status);
                
                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold">{ticket.subject}</h3>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                        {statusInfo.icon}
                        <span>{statusInfo.label}</span>
                      </div>
                    </div>
                    
                    <div className="mb-4 text-sm text-[#7e57c2] font-semibold">
                      Ticket No: {ticket.number} | Created: {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-2">Description:</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{ticket.description}</p>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-3">Conversation:</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {ticket.messages && ticket.messages.length > 0 ? (
                          ticket.messages.map((msg, idx) => (
                            <div key={idx} className={`p-3 rounded-lg ${
                              msg.sender === 'user' ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-semibold text-sm ${
                                  msg.sender === 'user' ? 'text-blue-700' : 'text-gray-700'
                                }`}>
                                  {msg.sender === 'user' ? 'You' : 'Support Team'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(msg.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{msg.message}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-center py-4">No messages yet</div>
                        )}
                      </div>
                    </div>

                    {ticket.file && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Attached File:</h4>
                        <a 
                          href={`${import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com"}/api/tickets/${ticket._id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          <FileText size={16} />
                          View Attachment
                        </a>
                      </div>
                    )}

                    {ticket.status === 'new' && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                        💡 <strong>Note:</strong> Your ticket is being reviewed by our support team. You'll receive a response soon.
                      </div>
                    )}

                    {ticket.status === 'opened' && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                        🔄 <strong>Status:</strong> Your ticket is currently being worked on by our support team.
                      </div>
                    )}

                    {ticket.status === 'closed' && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        ✅ <strong>Status:</strong> This ticket has been resolved and closed.
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Headphones size={64} className="text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a ticket to view details</h3>
                <p className="text-center">Choose a ticket from the list to see its details and conversation history.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
