// Token management service for handling JWT token refresh and expiration
import { fetchWithSessionCheck } from '../utils/sessionUtils.js';

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

class TokenService {
  constructor() {
    this.refreshPromise = null;
    this.isRefreshing = false;
    this.setupTokenRefreshTimer();
  }

  // Check if token is expired or about to expire (within 5 minutes)
  isTokenExpired() {
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
  }

  // Get time until token expires (in seconds)
  getTimeUntilExpiry() {
    const token = localStorage.getItem('token');
    if (!token) return 0;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp) {
        return Math.max(0, payload.exp - currentTime);
      }
      
      return 0;
    } catch {
      return 0;
    }
  }

  // Refresh the token
  async refreshToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async _performTokenRefresh() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token to refresh');
    }

    try {
      console.log('[TOKEN SERVICE] Refreshing token...');
      
      const response = await fetch(`${API_BASE}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (data.success) {
        // Update stored token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userID', data.user.userID);
        localStorage.setItem('role', data.user.role);
        
        console.log('[TOKEN SERVICE] Token refreshed successfully');
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('tokenRefreshed', { 
          detail: { token: data.token, user: data.user } 
        }));
        
        return { success: true, token: data.token, user: data.user };
      } else {
        throw new Error(data.message || 'Token refresh failed');
      }
    } catch (error) {
      console.error('[TOKEN SERVICE] Token refresh failed:', error);
      
      // If refresh fails, trigger session expiration
      window.dispatchEvent(new CustomEvent('sessionExpired'));
      
      throw error;
    }
  }

  // Setup automatic token refresh timer
  setupTokenRefreshTimer() {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const timeUntilExpiry = this.getTimeUntilExpiry();
    
    if (timeUntilExpiry > 0) {
      // Refresh token 5 minutes before expiry
      const refreshTime = Math.max(0, timeUntilExpiry - 300) * 1000;
      
      console.log(`[TOKEN SERVICE] Token will be refreshed in ${Math.round(refreshTime / 1000)} seconds`);
      
      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshToken();
          // Setup next refresh
          this.setupTokenRefreshTimer();
        } catch (error) {
          console.error('[TOKEN SERVICE] Automatic token refresh failed:', error);
        }
      }, refreshTime);
    }
  }

  // Get a valid token (refresh if needed)
  async getValidToken() {
    if (this.isTokenExpired()) {
      console.log('[TOKEN SERVICE] Token expired, refreshing...');
      const result = await this.refreshToken();
      return result.token;
    }
    
    return localStorage.getItem('token');
  }

  // Enhanced fetch with automatic token refresh
  async fetchWithTokenRefresh(url, options = {}) {
    try {
      // Get valid token
      const token = await this.getValidToken();
      
      // Add authorization header
      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      // If we get a 401, try to refresh token once
      if (response.status === 401) {
        console.log('[TOKEN SERVICE] Got 401, attempting token refresh...');
        
        try {
          await this.refreshToken();
          
          // Retry with new token
          const newToken = localStorage.getItem('token');
          const newHeaders = {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`
          };

          return await fetch(url, {
            ...options,
            headers: newHeaders
          });
        } catch (refreshError) {
          console.error('[TOKEN SERVICE] Token refresh failed during retry:', refreshError);
          // Let the 401 response pass through
        }
      }

      return response;
    } catch (error) {
      console.error('[TOKEN SERVICE] Fetch with token refresh failed:', error);
      throw error;
    }
  }

  // Cleanup method
  cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Create singleton instance
const tokenService = new TokenService();

export default tokenService;
