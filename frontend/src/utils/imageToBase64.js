/**
 * Convert image file to base64 data URL
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} Base64 data URL
 */
export const imageToBase64 = async (imagePath) => {
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};

/**
 * Get base64 encoded logo for reports
 * @returns {Promise<string>} Base64 data URL of the logo
 */
export const getLogoBase64 = async () => {
  // Try to get the logo from the public assets
  const logoPath = '/src/assets/logo/San_Juan_De_Dios_Hospital_seal.png';
  return await imageToBase64(logoPath);
};

/**
 * Get base64 encoded footer logo for reports
 * @returns {Promise<string>} Base64 data URL of the footer logo
 */
export const getFooterLogoBase64 = async () => {
  // Try to get the footer logo from the public assets
  const logoPath = '/src/assets/logo/images.png';
  return await imageToBase64(logoPath);
};
