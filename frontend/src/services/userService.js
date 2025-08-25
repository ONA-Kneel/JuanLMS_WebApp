import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Get user details by ID
export const getUserById = (userId) => axios.get(`${API_BASE}/api/users/${userId}`, { headers: getAuthHeaders() }).then(res => res.data);

// Get user details by userID (string identifier like F001, A001)
export const getUserByUserID = (userID) => axios.get(`${API_BASE}/api/users/by-userid/${userID}`, { headers: getAuthHeaders() }).then(res => res.data);
