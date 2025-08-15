// userDisplayUtils.js
// Utility functions for handling user display names

/**
 * Get the display name for a user
 * @param {Object} user - User object with firstname and lastname properties
 * @returns {string} Display name
 */
export const getUserDisplayName = (user) => {
  if (!user) return 'Unknown User';
  
  // Use firstname and lastname
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
 * @returns {string} Display name
 */
export const getChatDisplayName = (user, currentUserId) => {
  if (!user) return 'Unknown User';
  
  // If this is the current user, return "You"
  if (user._id === currentUserId) {
    return 'You';
  }
  
  return getUserDisplayName(user);
};

/**
 * Get the full display name
 * @param {Object} user - User object
 * @returns {string} Full display name
 */
export const getFullDisplayName = (user) => {
  if (!user) return 'Unknown User';
  
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
