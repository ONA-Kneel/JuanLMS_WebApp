import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Get user details by ID
export const getUserById = (userId) => axios.get(`${API_BASE}/api/users/${userId}`, { headers: getAuthHeaders() }).then(res => res.data);
