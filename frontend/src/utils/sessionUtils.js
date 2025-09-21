// Cross-tab session management utilities
export const getDashboardPathForRole = (role) => {
  if (!role) {
    console.log('[Session Utils] No role provided for dashboard path');
    return '/';
  }
  
  const normalizedRole = role.toLowerCase().trim();
  console.log(`[Session Utils] Getting dashboard path for role: "${role}" (normalized: "${normalizedRole}")`);
  
  // Debug: Log all possible role matches
  console.log('[Session Utils] Checking role matches:');
  console.log('[Session Utils] - students/student:', normalizedRole === 'students' || normalizedRole === 'student');
  console.log('[Session Utils] - faculty:', normalizedRole === 'faculty');
  console.log('[Session Utils] - vice president of education:', normalizedRole === 'vice president of education');
  console.log('[Session Utils] - vice president:', normalizedRole === 'vice president');
  console.log('[Session Utils] - admin:', normalizedRole === 'admin');
  console.log('[Session Utils] - principal:', normalizedRole === 'principal');
  
  switch (normalizedRole) {
    case 'students':
    case 'student':
      console.log('[Session Utils] Matched: students/student -> /student_dashboard');
      return '/student_dashboard';
    case 'faculty':
      console.log('[Session Utils] Matched: faculty -> /faculty_dashboard');
      return '/faculty_dashboard';
    case 'vice president of education':
      console.log('[Session Utils] Matched: vice president of education -> /VPE_dashboard');
      return '/VPE_dashboard';
    case 'vice president':
      console.log('[Session Utils] Matched: vice president -> /VPE_dashboard');
      return '/VPE_dashboard';
    case 'admin':
      console.log('[Session Utils] Matched: admin -> /admin_dashboard');
      return '/admin_dashboard';
    case 'principal':
      console.log('[Session Utils] Matched: principal -> /principal_dashboard');
      return '/principal_dashboard';
    default:
      console.warn(`[Session Utils] Unknown role: "${role}" (normalized: "${normalizedRole}")`);
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
    const currentPath = window.location.pathname;
    
    // Only redirect if:
    // 1. We have a valid target path (not '/')
    // 2. Current path is not already the target dashboard
    // 3. Current path is not a valid route for the user's role
    if (targetPath !== '/' && currentPath !== targetPath) {
      // Check if current path is a valid route for this role
      const isValidCurrentRoute = isRouteValidForRole(currentPath, role);
      
      if (!isValidCurrentRoute) {
        console.log(`[Session Utils] Redirecting to ${targetPath} for role: ${role} (current path ${currentPath} is invalid)`);
        window.location.href = targetPath;
        return true;
      } else {
        console.log(`[Session Utils] No redirect needed. Current path: ${currentPath} is valid for role: ${role}`);
      }
    } else {
      console.log(`[Session Utils] No redirect needed. Current path: ${currentPath}, Target path: ${targetPath}`);
    }
  } else {
    console.log('[Session Utils] No valid session found, no redirect needed');
  }
  return false;
};

// Helper function to check if a route is valid for a given role
const isRouteValidForRole = (path, role) => {
  if (!role || !path) return false;
  
  const normalizedRole = role.toLowerCase().trim();
  const validRoutes = {
    'students': [
      '/student_dashboard', '/student_classes', '/student_activities', '/student_chats',
      '/student_progress', '/student_grades', '/student_calendar', '/student_meeting',
      '/student_class'
    ],
    'faculty': [
      '/faculty_dashboard', '/faculty_classes', '/faculty_activities', '/faculty_chats',
      '/faculty_progress', '/faculty_grades', '/faculty_calendar', '/faculty_createclass',
      '/faculty_class', '/faculty_meeting', '/faculty_student_report'
    ],
    'principal': [
      '/principal_dashboard', '/principal_calendar', '/principal_faculty_report',
      '/principal_post_announcement', '/principal_grades', '/principal_audit_trail', '/principal_chats'
    ],
    'admin': [
      '/admin_dashboard', '/admin_accounts', '/admin_academic_settings', '/admin_activities',
      '/admin_chats', '/admin_grades', '/admin_calendar', '/admin_progress', '/admin_audit_trail',
      '/admin/support-center', '/admin/academic-settings/terms', '/admin_registrants'
    ],
    'vice president of education': [
      '/VPE_dashboard', '/VPE_chats', '/VPE_calendar', '/VPE_audit_trail',
      '/VPE_faculty_report', '/vpe_post_announcement'
    ]
  };
  
  const roleRoutes = validRoutes[normalizedRole] || [];
  
  // Check if current path matches any valid route for this role
  // Also handle dynamic routes like /student_class/:classId
  return roleRoutes.some(route => {
    if (route.includes(':')) {
      // Handle dynamic routes by checking the base path
      const baseRoute = route.split('/:')[0];
      return path.startsWith(baseRoute);
    }
    return path === route;
  });
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
  } catch {
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

// Enhanced fetch wrapper that uses token service for automatic refresh
export const fetchWithTokenRefresh = async (url, options = {}) => {
  try {
    // Import token service dynamically to avoid circular dependencies
    const { default: tokenService } = await import('../services/tokenService.js');
    return await tokenService.fetchWithTokenRefresh(url, options);
  } catch (error) {
    console.error('Fetch with token refresh failed:', error);
    throw error;
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

// Debounce function to prevent rapid redirect attempts
let redirectDebounceTimer = null;
const REDIRECT_DEBOUNCE_DELAY = 500; // 500ms delay

// Track user activity to prevent redirects during active use
let lastUserActivity = Date.now();
const USER_ACTIVITY_TIMEOUT = 30000; // 30 seconds

// Update user activity timestamp
export const updateUserActivity = () => {
  lastUserActivity = Date.now();
};

// Check if user has been active recently
const isUserRecentlyActive = () => {
  return (Date.now() - lastUserActivity) < USER_ACTIVITY_TIMEOUT;
};

export const debouncedRedirectToDashboard = () => {
  // Don't redirect if user has been active recently
  if (isUserRecentlyActive()) {
    console.log('[Session Utils] User recently active, skipping redirect');
    return;
  }
  
  if (redirectDebounceTimer) {
    clearTimeout(redirectDebounceTimer);
  }
  
  redirectDebounceTimer = setTimeout(() => {
    redirectToDashboardIfSessionExists();
    redirectDebounceTimer = null;
  }, REDIRECT_DEBOUNCE_DELAY);
};



