/**
 * Get the correct profile image URL
 * Handles both Cloudinary URLs (full HTTP URLs) and local file names
 * @param {string} profilePic - The profile picture value from the database
 * @param {string} API_BASE - The API base URL for local files
 * @param {string} defaultImage - The default image to use if no profile pic
 * @returns {string} The correct image URL
 */
export const getProfileImageUrl = (profilePic, API_BASE, defaultImage) => {
  if (!profilePic) return defaultImage;
  
  // If it's already a full URL (Cloudinary), use it directly
  if (profilePic.startsWith('http')) {
    return profilePic;
  }
  
  // Otherwise, construct local server URL
  return `${API_BASE}/uploads/${profilePic}`;
};

/**
 * Get the correct file URL for any file (lessons, attachments, etc.)
 * Handles both Cloudinary URLs (full HTTP URLs) and local file paths
 * @param {string} fileUrl - The file URL/path from the database
 * @param {string} API_BASE - The API base URL for local files
 * @returns {string} The correct file URL
 */
export const getFileUrl = (fileUrl, API_BASE) => {
  if (!fileUrl) return null;
  
  // If it's already a full URL (Cloudinary), use it directly
  if (fileUrl.startsWith('http')) {
    return fileUrl;
  }
  
  // Otherwise, construct local server URL, removing leading slashes to avoid double slashes
  return `${API_BASE}/${fileUrl.replace(/^\/+/, '')}`;
};
