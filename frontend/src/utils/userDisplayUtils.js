// userDisplayUtils.js
// Utility functions for handling user display names with nicknames

/**
 * Get the display name for a user, prioritizing nickname over real name
 * @param {Object} user - User object with firstname, lastname, and nickname properties
 * @param {string} contactNickname - Optional per-contact nickname for this user
 * @returns {string} Display name
 */
export const getUserDisplayName = (user, contactNickname = null) => {
  if (!user) return 'Unknown User';
  
  // If a per-contact nickname is provided, use it first
  if (contactNickname && contactNickname.trim()) {
    return contactNickname.trim();
  }
  
  // If user has a global nickname, use it
  if (user.nickname && user.nickname.trim()) {
    return user.nickname.trim();
  }
  
  // Otherwise use firstname and lastname
  const firstName = user.firstname || '';
  const lastName = user.lastname || '';
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  }
  
  return 'Unknown User';
};

/**
 * Get the display name for a user in chat context (for "You: " prefix)
 * @param {Object} user - User object
 * @param {string} currentUserId - Current user's ID
 * @param {string} contactNickname - Optional per-contact nickname for this user
 * @returns {string} Display name
 */
export const getChatDisplayName = (user, currentUserId, contactNickname = null) => {
  if (!user) return 'Unknown User';
  
  // If this is the current user, return "You"
  if (user._id === currentUserId) {
    return 'You';
  }
  
  return getUserDisplayName(user, contactNickname);
};

/**
 * Get the full display name including nickname and real name
 * @param {Object} user - User object
 * @param {string} contactNickname - Optional per-contact nickname for this user
 * @returns {string} Full display name
 */
export const getFullDisplayName = (user, contactNickname = null) => {
  if (!user) return 'Unknown User';
  
  const nickname = contactNickname && contactNickname.trim() 
    ? contactNickname.trim() 
    : (user.nickname && user.nickname.trim() ? user.nickname.trim() : null);
  const firstName = user.firstname || '';
  const lastName = user.lastname || '';
  
  if (nickname && (firstName || lastName)) {
    return `${nickname} (${firstName} ${lastName})`.trim();
  } else if (nickname) {
    return nickname;
  } else if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  }
  
  return 'Unknown User';
};
