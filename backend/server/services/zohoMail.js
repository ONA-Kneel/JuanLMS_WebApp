import axios from 'axios';
import { getValidAccessToken } from './zohoAuth.js';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

/**
 * Creates a new Zoho Mail mailbox for a user
 * @param {string} userEmail - The email address for the mailbox (e.g., john.doe@faculty.sjdefilms.com)
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {string} password - Password for the mailbox
 * @param {string} orgId - Zoho organization ID (optional, will use env var if not provided)
 * @returns {Promise<Object>} The created mailbox data
 */
async function createZohoMailbox(userEmail, firstName, lastName, password, orgId = null) {
  try {
    // Get a valid access token
    const accessToken = await getValidAccessToken();
    
    // Use provided orgId or get from environment
    const organizationId = orgId || process.env.ZOHO_ORG_ID;
    
    console.log('[ZOHO MAIL] Environment check:', {
      ZOHO_ORG_ID: process.env.ZOHO_ORG_ID,
      organizationId: organizationId,
      orgId: orgId
    });
    
    if (!organizationId) {
      throw new Error('Zoho organization ID is required. Set ZOHO_ORG_ID in your environment variables.');
    }

    // Try different request body formats
    const mailboxDataFormats = [
      {
        primaryEmailAddress: userEmail,
        displayName: `${firstName} ${lastName}`,
        password: password,
        firstName: firstName,
        lastName: lastName
      },
      {
        email: userEmail,
        displayName: `${firstName} ${lastName}`,
        password: password,
        firstName: firstName,
        lastName: lastName
      },
      {
        accountName: userEmail,
        displayName: `${firstName} ${lastName}`,
        password: password,
        firstName: firstName,
        lastName: lastName
      },
      {
        userEmail: userEmail,
        displayName: `${firstName} ${lastName}`,
        password: password,
        firstName: firstName,
        lastName: lastName
      }
    ];

    console.log(`[ZOHO MAIL] Creating mailbox for: ${userEmail}`);

    // Try different Zoho Mail API endpoints
    const endpoints = [
      `https://mail.zoho.com/api/organization/${organizationId}/accounts`,
      `https://mail.zoho.com/api/accounts`,
      `https://www.zohoapis.com/mail/v1/organization/${organizationId}/accounts`,
      `https://www.zohoapis.com/mail/v1/accounts`,
      `https://mail.zoho.com/api/accounts/${organizationId}`,
      `https://www.zohoapis.com/mail/v1/accounts/${organizationId}`
    ];

    let response = null;
    let lastError = null;

    // Try different combinations of endpoints and request body formats
    for (const endpoint of endpoints) {
      for (const mailboxData of mailboxDataFormats) {
        try {
          console.log(`[ZOHO MAIL] Trying endpoint: ${endpoint} with data:`, mailboxData);
          response = await axios.post(endpoint, mailboxData, {
            headers: {
              'Authorization': `Zoho-oauthtoken ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
          });
          console.log(`[ZOHO MAIL] Success with endpoint: ${endpoint} and data format:`, Object.keys(mailboxData));
          break;
        } catch (error) {
          console.log(`[ZOHO MAIL] Failed with endpoint ${endpoint} and data format ${Object.keys(mailboxData)}:`, error.response?.status, error.message);
          lastError = error;
          continue;
        }
      }
      if (response) break; // If we got a successful response, break out of the endpoint loop too
    }

    if (!response) {
      throw lastError || new Error('All API endpoints and data formats failed');
    }

    console.log(`[ZOHO MAIL] Mailbox created successfully for: ${userEmail}`);
    
    return {
      success: true,
      data: response.data,
      message: `Zoho mailbox created successfully for ${userEmail}`
    };

  } catch (error) {
    console.error(`[ZOHO MAIL] Error creating mailbox for ${userEmail}:`, error.response?.data || error.message);
    console.error(`[ZOHO MAIL] Full error details:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    
    // Handle specific Zoho API errors
    if (error.response?.data?.error) {
      const zohoError = error.response.data.error;
      if (zohoError.code === 'DUPLICATE_EMAIL') {
        throw new Error(`Email address ${userEmail} already exists in Zoho Mail`);
      } else if (zohoError.code === 'INVALID_EMAIL') {
        throw new Error(`Invalid email address format: ${userEmail}`);
      } else if (zohoError.code === 'INSUFFICIENT_PERMISSIONS') {
        throw new Error('Insufficient permissions to create mailbox. Check your Zoho app permissions.');
      }
    }
    
    // Provide more detailed error information
    const errorMessage = error.response?.status === 401 
      ? `Authentication failed (401). This could be due to: 1) Invalid organization ID (${organizationId}), 2) Insufficient API permissions, 3) Expired access token. Full error: ${JSON.stringify(error.response?.data)}`
      : `Failed to create Zoho mailbox: ${error.response?.data?.error?.message || error.message}`;
    
    throw new Error(errorMessage);
  }
}

/**
 * Gets information about a Zoho Mail account
 * @param {string} userEmail - The email address to look up
 * @param {string} orgId - Zoho organization ID (optional)
 * @returns {Promise<Object>} The account information
 */
async function getZohoMailboxInfo(userEmail, orgId = null) {
  try {
    const accessToken = await getValidAccessToken();
    const organizationId = orgId || process.env.ZOHO_ORG_ID;
    
    if (!organizationId) {
      throw new Error('Zoho organization ID is required. Set ZOHO_ORG_ID in your environment variables.');
    }

    const response = await axios.get(
      `https://mail.zoho.com/api/organization/${organizationId}/accounts/${encodeURIComponent(userEmail)}`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`
        }
      }
    );

    return {
      success: true,
      data: response.data,
      message: `Mailbox information retrieved for ${userEmail}`
    };

  } catch (error) {
    console.error(`[ZOHO MAIL] Error getting mailbox info for ${userEmail}:`, error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      throw new Error(`Mailbox not found: ${userEmail}`);
    }
    
    throw new Error(`Failed to get mailbox information: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Updates a Zoho Mail account
 * @param {string} userEmail - The email address to update
 * @param {Object} updateData - Data to update (displayName, firstName, lastName, etc.)
 * @param {string} orgId - Zoho organization ID (optional)
 * @returns {Promise<Object>} The updated account data
 */
async function updateZohoMailbox(userEmail, updateData, orgId = null) {
  try {
    const accessToken = await getValidAccessToken();
    const organizationId = orgId || process.env.ZOHO_ORG_ID;
    
    if (!organizationId) {
      throw new Error('Zoho organization ID is required. Set ZOHO_ORG_ID in your environment variables.');
    }

    const response = await axios.put(
      `https://mail.zoho.com/api/organization/${organizationId}/accounts/${encodeURIComponent(userEmail)}`,
      updateData,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[ZOHO MAIL] Mailbox updated successfully for: ${userEmail}`);
    
    return {
      success: true,
      data: response.data,
      message: `Mailbox updated successfully for ${userEmail}`
    };

  } catch (error) {
    console.error(`[ZOHO MAIL] Error updating mailbox for ${userEmail}:`, error.response?.data || error.message);
    throw new Error(`Failed to update mailbox: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Deletes a Zoho Mail account
 * @param {string} userEmail - The email address to delete
 * @param {string} orgId - Zoho organization ID (optional)
 * @returns {Promise<Object>} Deletion confirmation
 */
async function deleteZohoMailbox(userEmail, orgId = null) {
  try {
    const accessToken = await getValidAccessToken();
    const organizationId = orgId || process.env.ZOHO_ORG_ID;
    
    if (!organizationId) {
      throw new Error('Zoho organization ID is required. Set ZOHO_ORG_ID in your environment variables.');
    }

    const response = await axios.delete(
      `https://mail.zoho.com/api/organization/${organizationId}/accounts/${encodeURIComponent(userEmail)}`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`
        }
      }
    );

    console.log(`[ZOHO MAIL] Mailbox deleted successfully for: ${userEmail}`);
    
    return {
      success: true,
      message: `Mailbox deleted successfully for ${userEmail}`
    };

  } catch (error) {
    console.error(`[ZOHO MAIL] Error deleting mailbox for ${userEmail}:`, error.response?.data || error.message);
    throw new Error(`Failed to delete mailbox: ${error.response?.data?.error?.message || error.message}`);
  }
}

export { 
  createZohoMailbox, 
  getZohoMailboxInfo, 
  updateZohoMailbox, 
  deleteZohoMailbox 
};
