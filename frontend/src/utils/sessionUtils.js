// Utility functions for handling session expiration

// Check if a response indicates an expired token
export const isTokenExpiredResponse = (response) => {
  // Check HTTP status codes that typically indicate authentication issues
  if (response.status === 401 || response.status === 403) {
    return true;
  }
  
  // Check response body for specific error messages
  try {
    const errorText = response.text ? response.text() : '';
    if (typeof errorText === 'string' && errorText.includes('token')) {
      return true;
    }
  } catch (error) {
    // If we can't read the response, assume it might be expired
    return response.status === 401 || response.status === 403;
  }
  
  return false;
};

// Enhanced fetch wrapper that handles expired tokens
export const fetchWithSessionCheck = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
    // Check if token is expired
    if (isTokenExpiredResponse(response)) {
      // Dispatch custom event to trigger session expiration modal
      window.dispatchEvent(new CustomEvent('sessionExpired'));
      return response;
    }
    
    return response;
  } catch (error) {
    // Network errors might also indicate session issues
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Check if it's an authentication-related network error
      const token = localStorage.getItem('token');
      if (!token) {
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      }
    }
    throw error;
  }
};

// Check if current token is expired
export const isCurrentTokenExpired = () => {
  const token = localStorage.getItem('token');
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired or about to expire (within 5 minutes)
    if (payload.exp && (payload.exp < currentTime || (payload.exp - currentTime) < 300)) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
};

// Force session expiration (useful for testing or manual logout)
export const forceSessionExpiration = () => {
  window.dispatchEvent(new CustomEvent('sessionExpired'));
};

// Clear all session data
export const clearSessionData = () => {
  localStorage.clear();
  sessionStorage.clear();
  // Clear any other stored data
  if (window.location.hostname === 'localhost') {
    // Clear cookies for localhost
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
  }
};



