// Logout validation utility functions

/**
 * Validates that all authentication data has been cleared from localStorage
 * @returns {Object} Validation result with success status and details
 */
export const validateLogout = () => {
  const authKeys = [
    'token',
    'user',
    'userID',
    'role',
    'rememberedEmail',
    'rememberedPassword',
    'shouldLogoutOnReturn',
    'schoolID',
    'globalQuarter',
    'globalTerm',
    'globalAcademicYear'
  ];

  const remainingData = authKeys.filter(key => {
    const value = localStorage.getItem(key);
    return value !== null && value !== undefined && value !== '';
  });

  const isValid = remainingData.length === 0;

  return {
    success: isValid,
    remainingData: remainingData,
    message: isValid 
      ? 'Logout validation successful - all auth data cleared'
      : `Logout validation failed - ${remainingData.length} items remaining: ${remainingData.join(', ')}`
  };
};

/**
 * Forces logout by clearing all authentication data
 * @param {boolean} clearRemembered - Whether to clear remembered credentials
 * @returns {Object} Result of the forced logout
 */
export const forceLogout = (clearRemembered = false) => {
  console.log('Force logout initiated...');
  
  const keysToRemove = [
    'token',
    'user',
    'userID',
    'role',
    'shouldLogoutOnReturn',
    'schoolID',
    'globalQuarter',
    'globalTerm',
    'globalAcademicYear'
  ];

  if (clearRemembered) {
    keysToRemove.push('rememberedEmail', 'rememberedPassword');
  }

  // Remove all keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  // Validate the logout
  const validation = validateLogout();
  
  if (!validation.success) {
    console.error('❌ Force logout validation failed:', validation.message);
    // Try one more time
    validation.remainingData.forEach(key => localStorage.removeItem(key));
    
    // Final validation
    const finalValidation = validateLogout();
    if (finalValidation.success) {
      console.log('✅ Force logout successful after retry');
      return { success: true, message: 'Force logout successful after retry' };
    } else {
      console.error('❌ Force logout failed even after retry');
      return { success: false, message: 'Force logout failed even after retry' };
    }
  } else {
    console.log('✅ Force logout successful');
    return { success: true, message: 'Force logout successful' };
  }
};

/**
 * Checks if user is properly logged out
 * @returns {boolean} True if user is logged out (no auth data present)
 */
export const isLoggedOut = () => {
  const validation = validateLogout();
  return validation.success;
};

/**
 * Gets logout status with detailed information
 * @returns {Object} Detailed logout status
 */
export const getLogoutStatus = () => {
  const validation = validateLogout();
  const hasToken = !!localStorage.getItem('token');
  const hasUser = !!localStorage.getItem('user');
  const hasRole = !!localStorage.getItem('role');

  return {
    isLoggedOut: validation.success,
    hasToken,
    hasUser,
    hasRole,
    validation,
    timestamp: new Date().toISOString()
  };
};
