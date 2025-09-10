import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const createTicket = (data) => axios.post(`${API_BASE}/api/tickets`, data, { headers: getAuthHeaders() }).then(res => res.data);
export const getUserTickets = (userId) => axios.get(`${API_BASE}/api/tickets/user/${userId}`, { headers: getAuthHeaders() }).then(res => res.data);
export const getTicketByNumber = (number) => axios.get(`${API_BASE}/api/tickets/number/${number}`, { headers: getAuthHeaders() }).then(res => res.data);
export const getAllTickets = (status) => axios.get(`${API_BASE}/api/tickets`, { 
  params: status ? { status } : {},
  headers: getAuthHeaders()
}).then(res => res.data);
export const replyToTicket = (ticketId, data) => axios.post(`${API_BASE}/api/tickets/${ticketId}/reply`, data, { headers: getAuthHeaders() }).then(res => res.data);
export const openTicket = (ticketId) => axios.post(`${API_BASE}/api/tickets/${ticketId}/open`, {}, { headers: getAuthHeaders() }).then(res => res.data); 