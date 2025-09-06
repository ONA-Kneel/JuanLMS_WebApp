// Authentication utility functions

/**
 * Logs out the user and clears all authentication data with validation
 * @param {boolean} clearRemembered - Whether to clear remembered credentials (default: false)
 * @param {boolean} validate - Whether to validate the logout (default: true)
 */
export const logout = (clearRemembered = false, validate = true) => {
  console.log('Starting logout process...');
  
  // Clear all authentication-related data
  const keysToRemove = [
    'user',
    'token', 
    'userID',
    'role',
    'shouldLogoutOnReturn',
    'schoolID',
    'globalQuarter',
    'globalTerm',
    'globalAcademicYear'
  ];
  
  // Optionally clear remembered credentials
  if (clearRemembered) {
    keysToRemove.push('rememberedEmail', 'rememberedPassword');
  }
  
  // Remove all keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('✅ Local storage cleared');
  
  // Validate logout if requested
  if (validate) {
    const remainingAuthData = keysToRemove.filter(key => localStorage.getItem(key));
    if (remainingAuthData.length > 0) {
      console.error('❌ Logout validation failed. Remaining data:', remainingAuthData);
      // Force clear any remaining data
      remainingAuthData.forEach(key => localStorage.removeItem(key));
      console.log('✅ Force cleared remaining data');
    } else {
      console.log('✅ Logout validation successful - all auth data cleared');
    }
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