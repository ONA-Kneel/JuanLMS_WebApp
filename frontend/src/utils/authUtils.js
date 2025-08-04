// Authentication utility functions

/**
 * Logs out the user and clears all authentication data
 * @param {boolean} clearRemembered - Whether to clear remembered credentials (default: false)
 */
export const logout = (clearRemembered = false) => {
  // Clear all user data
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('userID');
  localStorage.removeItem('role');
  localStorage.removeItem('shouldLogoutOnReturn');
  
  // Optionally clear remembered credentials
  if (clearRemembered) {
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberedPassword');
  }
  
  console.log('User logged out successfully');
};

/**
 * Checks if user is currently authenticated
 * @returns {boolean} True if user is authenticated
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

/**
 * Gets the current user data from localStorage
 * @returns {Object|null} User data or null if not authenticated
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Gets the current user role
 * @returns {string|null} User role or null if not authenticated
 */
export const getUserRole = () => {
  return localStorage.getItem('role');
}; 