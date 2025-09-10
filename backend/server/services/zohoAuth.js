import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

/**
 * Refreshes the Zoho access token using the refresh token
 * @returns {Promise<string>} The new access token
 */
async function refreshAccessToken() {
  try {
    if (!process.env.ZOHO_REFRESH_TOKEN) {
      throw new Error('ZOHO_REFRESH_TOKEN not found in environment variables');
    }

    const params = new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token'
    });

    const response = await axios.post(
      'https://accounts.zoho.com/oauth/v2/token',
      params,
      { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
      }
    );

    const { access_token, expires_in } = response.data;
    
    console.log(`[ZOHO AUTH] Access token refreshed successfully. Expires in: ${expires_in} seconds`);
    
    return access_token;
  } catch (error) {
    console.error('[ZOHO AUTH] Error refreshing access token:', error.response?.data || error.message);
    throw new Error(`Failed to refresh Zoho access token: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Gets a valid access token (refreshes if needed)
 * @returns {Promise<string>} A valid access token
 */
async function getValidAccessToken() {
  try {
    // Always refresh to ensure we have a valid token
    return await refreshAccessToken();
  } catch (error) {
    console.error('[ZOHO AUTH] Failed to get valid access token:', error.message);
    throw error;
  }
}

/**
 * Validates if the current access token is still valid
 * @param {string} accessToken - The access token to validate
 * @returns {Promise<boolean>} True if token is valid, false otherwise
 */
async function validateAccessToken(accessToken) {
  try {
    const response = await axios.get('https://mail.zoho.com/api/organization', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    });
    
    return response.status === 200;
  } catch (error) {
    console.log('[ZOHO AUTH] Access token validation failed:', error.response?.status);
    return false;
  }
}

export { refreshAccessToken, getValidAccessToken, validateAccessToken };


