// Base64url encoding function (JWT standard)
const base64urlEncode = (str) => {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// Simple HMAC-SHA256 implementation for JWT tokens
const createHMACSignature = async (data, secret) => {
  console.log('HMAC Input data:', data);
  console.log('HMAC Secret:', secret);
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  const result = base64urlEncode(binary);
  console.log('HMAC Result:', result);
  return result;
};

// Utility function to generate Stream credentials for each user
export const generateStreamCredentials = async (userInfo) => {
  // Extract user information from token or userInfo
  let userId, displayName, email;
  
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId || payload._id || payload.username;
      displayName = payload.firstName && payload.lastName 
        ? `${payload.firstName} ${payload.lastName}` 
        : payload.username || payload.name || 'User';
      email = payload.email || '';
    }
  } catch (error) {
    console.error('Error parsing token for Stream credentials:', error);
  }
  
  // Fallback to userInfo if token parsing fails
  if (!userId) {
    userId = userInfo?.userId || userInfo?._id || userInfo?.username || 'anonymous_user';
    displayName = userInfo?.name || userInfo?.displayName || 'User';
    email = userInfo?.email || '';
  }
  
  // Generate unique user ID for this session
  const uniqueUserId = `${userId}_${Date.now()}`;
  
  // Use Stream's API key
  const apiKey = 'veyeuctsfcqt';
  
  // Create token payload matching Stream's format
  const tokenPayload = {
    iss: 'veyeuctsfcqt', // Use API key as issuer
    sub: uniqueUserId,
    user_id: uniqueUserId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 604800 // 7 days
  };
  
  // Create JWT components
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64urlEncode(JSON.stringify(tokenPayload));
  
  // Create HMAC signature
  const secretKey = 'gz28qmg9emda57vfejtcmgd26yxeze4yeeqfqf2kvtue4vjwsss7pjy2btnrn286';
  const signature = await createHMACSignature(`${header}.${payload}`, secretKey);
  
  const token = `${header}.${payload}.${signature}`;
  
  // Debug logging
  console.log('Generated token:', token);
  console.log('Header:', header);
  console.log('Payload:', payload);
  console.log('Signature:', signature);
  console.log('Secret key:', secretKey);
  
  return {
    apiKey,
    token,
    userId: uniqueUserId,
    userInfo: {
      id: uniqueUserId,
      name: displayName, // Use the actual user's name
      email: email
    }
  };
};

// Function to generate a unique callId for each meeting
export const generateCallId = (meetingData) => {
  if (meetingData?.meetingId) return String(meetingData.meetingId);
  if (meetingData?._id) return String(meetingData._id);
  if (meetingData?.title) {
    // Create a callId from the meeting title
    return meetingData.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
  }
  return 'meeting_' + Date.now();
};