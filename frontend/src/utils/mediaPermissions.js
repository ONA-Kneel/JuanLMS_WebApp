/**
 * Media Permissions Utility
 * Handles camera and microphone permission requests and management
 */

export class MediaPermissionsManager {
  constructor() {
    this.permissionStates = {
      camera: 'prompt',
      microphone: 'prompt'
    };
    this.checkPermissions();
  }

  /**
   * Check current permission states
   */
  async checkPermissions() {
    try {
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' });
        const micPermission = await navigator.permissions.query({ name: 'microphone' });
        
        this.permissionStates.camera = cameraPermission.state;
        this.permissionStates.microphone = micPermission.state;
      }
    } catch (error) {
      console.warn('Could not check permissions:', error);
    }
  }

  /**
   * Request camera permission
   */
  async requestCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Stop the stream immediately as we only needed it for permission
      stream.getTracks().forEach(track => track.stop());
      
      this.permissionStates.camera = 'granted';
      return { success: true, permission: 'granted' };
    } catch (error) {
      console.error('Camera permission error:', error);
      this.permissionStates.camera = 'denied';
      
      if (error.name === 'NotAllowedError') {
        return { 
          success: false, 
          permission: 'denied', 
          error: 'Camera access was denied. Please enable camera permissions in your browser settings.' 
        };
      } else if (error.name === 'NotFoundError') {
        return { 
          success: false, 
          permission: 'denied', 
          error: 'No camera found on this device.' 
        };
      } else {
        return { 
          success: false, 
          permission: 'denied', 
          error: 'Failed to access camera. Please check your browser settings.' 
        };
      }
    }
  }

  /**
   * Request microphone permission
   */
  async requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: false, 
        audio: true 
      });
      
      // Stop the stream immediately as we only needed it for permission
      stream.getTracks().forEach(track => track.stop());
      
      this.permissionStates.microphone = 'granted';
      return { success: true, permission: 'granted' };
    } catch (error) {
      console.error('Microphone permission error:', error);
      this.permissionStates.microphone = 'denied';
      
      if (error.name === 'NotAllowedError') {
        return { 
          success: false, 
          permission: 'denied', 
          error: 'Microphone access was denied. Please enable microphone permissions in your browser settings.' 
        };
      } else if (error.name === 'NotFoundError') {
        return { 
          success: false, 
          permission: 'denied', 
          error: 'No microphone found on this device.' 
        };
      } else {
        return { 
          success: false, 
          permission: 'denied', 
          error: 'Failed to access microphone. Please check your browser settings.' 
        };
      }
    }
  }

  /**
   * Request both camera and microphone permissions
   */
  async requestBothPermissions() {
    const results = {
      camera: await this.requestCameraPermission(),
      microphone: await this.requestMicrophonePermission()
    };
    
    return results;
  }

  /**
   * Get current permission states
   */
  getPermissionStates() {
    return { ...this.permissionStates };
  }

  /**
   * Check if permissions are granted
   */
  arePermissionsGranted() {
    return this.permissionStates.camera === 'granted' && 
           this.permissionStates.microphone === 'granted';
  }

  /**
   * Check if any permissions are denied
   */
  arePermissionsDenied() {
    return this.permissionStates.camera === 'denied' || 
           this.permissionStates.microphone === 'denied';
  }

  /**
   * Get instructions for enabling permissions in browser
   */
  getBrowserInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome')) {
      return {
        browser: 'Chrome',
        steps: [
          'Click the lock icon in the address bar',
          'Set Camera and Microphone to "Allow"',
          'Refresh the page'
        ]
      };
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          'Click the shield icon in the address bar',
          'Set Camera and Microphone to "Allow"',
          'Refresh the page'
        ]
      };
    } else if (userAgent.includes('safari')) {
      return {
        browser: 'Safari',
        steps: [
          'Go to Safari menu > Settings for This Website',
          'Set Camera and Microphone to "Allow"',
          'Refresh the page'
        ]
      };
    } else if (userAgent.includes('edge')) {
      return {
        browser: 'Edge',
        steps: [
          'Click the lock icon in the address bar',
          'Set Camera and Microphone to "Allow"',
          'Refresh the page'
        ]
      };
    } else {
      return {
        browser: 'Unknown',
        steps: [
          'Look for a camera/microphone icon in the address bar',
          'Click it and set permissions to "Allow"',
          'Refresh the page'
        ]
      };
    }
  }
}

// Create a singleton instance
export const mediaPermissions = new MediaPermissionsManager();
