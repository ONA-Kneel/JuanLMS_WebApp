import React, { useState, useEffect } from "react";
import { Headphones } from 'lucide-react';
import axios from 'axios';
import { createTicket, getTicketByNumber } from '../../services/ticketService';

const sampleTicket = {
  number: 'SJDD1234567890',
  status: 'Sent',
  content: 'This is a sample ticket content.'
};

export default function SupportModal({ onClose }) {
  const [view, setView] = useState('main'); // main | active | new | submitted
  const [ticketInput, setTicketInput] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    number: generateTicketNumber(),
    subject: '',
    content: '',
    file: null
  });

  // Generate ticket number function
  function generateTicketNumber() {
    let num = '';
    for (let i = 0; i < 12; i++) {
      num += Math.floor(Math.random() * 10);
    }
    return `SJDD${num}`;
  }
  const [submitted, setSubmitted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [error, setError] = useState('');

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
    onClose();
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

      // Try to use _id first, then fallback to userID
      const userId = user._id || userID;
      
      console.log('[TICKET SUBMISSION] User data:', {
        userId,
        userFromStorage: user,
        token: token ? 'Present' : 'Missing'
      });

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('subject', newTicket.subject);
      formData.append('description', newTicket.content);
      formData.append('number', newTicket.number);
      if (newTicket.file) {
        formData.append('file', newTicket.file);
      }
      const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
      const response = await axios.post(`${API_BASE}/api/tickets`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setNewTicket(prev => ({ ...prev, number: response.data.number }));
      setSubmitted(true);
      setShowToast(true);
    } catch (err) {
      console.error('Ticket submission error:', err);
      if (err.response) {
        // Server responded with error status
        const errorMessage = err.response.data?.error || err.response.data?.message || 'Failed to submit ticket';
        setError(errorMessage);
      } else if (err.request) {
        // Network error
        setError('Network error. Please check your connection and try again.');
      } else {
        // Other error
        setError('Failed to submit ticket. Please try again.');
      }
    }
    setLoading(false);
  }

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
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Support<br />Center</h2>
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
                onClick={() => setView('active')}
              >
                Have an active ticket? enter here
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
        {/* Active Ticket view */}
        {view === 'active' && (
          <div className="transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Support Center<br /><span className="text-lg font-semibold">Active ticket</span></h2>
                <div className="text-lg mt-2">Short desc</div>
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
                <h2 className="text-2xl font-bold text-gray-900">Support Center<br /><span className="text-lg font-semibold">New Request</span></h2>
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