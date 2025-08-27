// Cross-tab session management utilities
export const getDashboardPathForRole = (role) => {
  if (!role) {
    console.log('[Session Utils] No role provided for dashboard path');
    return '/';
  }
  
  const normalizedRole = role.toLowerCase().trim();
  console.log(`[Session Utils] Getting dashboard path for role: "${role}" (normalized: "${normalizedRole}")`);
  
  switch (normalizedRole) {
    case 'students':
    case 'student':
      return '/student_dashboard';
    case 'faculty':
      return '/faculty_dashboard';
    case 'vice president of education':
    case 'vice president':
      return '/VPE_dashboard';
    case 'admin':
      return '/admin_dashboard';
    case 'principal':
      return '/principal_dashboard';
    default:
      console.warn(`[Session Utils] Unknown role: "${role}"`);
      return '/';
  }
};

export const hasValidSession = () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = localStorage.getItem('role');
  
  const isValid = !!(token && role && user._id);
  console.log(`[Session Utils] Session validation:`, {
    hasToken: !!token,
    hasRole: !!role,
    hasUserId: !!user._id,
    isValid
  });
  
  return isValid;
};

export const redirectToDashboardIfSessionExists = () => {
  console.log('[Session Utils] Checking if redirect is needed...');
  
  if (hasValidSession()) {
    const role = localStorage.getItem('role');
    const targetPath = getDashboardPathForRole(role);
    
    if (targetPath !== '/' && window.location.pathname !== targetPath) {
      console.log(`[Session Utils] Redirecting to ${targetPath} for role: ${role}`);
      window.location.href = targetPath;
      return true;
    } else {
      console.log(`[Session Utils] No redirect needed. Current path: ${window.location.pathname}, Target path: ${targetPath}`);
    }
  } else {
    console.log('[Session Utils] No valid session found, no redirect needed');
  }
  return false;
};

export const setupCrossTabSessionListener = (callback) => {
  console.log('[Session Utils] Setting up cross-tab session listener');
  
  const handleStorageChange = (e) => {
    console.log(`[Session Utils] Storage change detected:`, {
      key: e.key,
      oldValue: e.oldValue,
      newValue: e.newValue,
      url: e.url
    });
    
    // Only handle authentication-related changes
    if (e.key === 'token' || e.key === 'user' || e.key === 'role') {
      console.log(`[Session Utils] Authentication change detected for key: ${e.key}`);
      
      if (callback) {
        console.log('[Session Utils] Using custom callback for storage change');
        callback(e);
      } else {
        console.log('[Session Utils] Using default behavior: redirect if session exists');
        // Default behavior: redirect if session exists
        redirectToDashboardIfSessionExists();
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  
  // Return cleanup function
  return () => {
    console.log('[Session Utils] Cleaning up cross-tab session listener');
    window.removeEventListener('storage', handleStorageChange);
  };
};

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
  } catch {
    console.error('Error parsing token');
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



