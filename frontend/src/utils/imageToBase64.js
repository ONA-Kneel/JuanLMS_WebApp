// Import logo images properly for Vite processing
import logoImage from '../assets/logo/San_Juan_De_Dios_Hospital_seal.png';
import footerLogoImage from '../assets/logo/images.png';

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
  // Use the imported logo image which Vite will process correctly
  return await imageToBase64(logoImage);
};

/**
 * Get base64 encoded footer logo for reports
 * @returns {Promise<string>} Base64 data URL of the footer logo
 */
export const getFooterLogoBase64 = async () => {
  // Use the imported footer logo image which Vite will process correctly
  return await imageToBase64(footerLogoImage);
};
