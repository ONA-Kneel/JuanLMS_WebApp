// Push Notification Service
class PushNotificationService {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.registration = null;
    this.subscription = null;
    this.vapidPublicKey = null;
    this.isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.protocol === 'http:';
  }

  // Initialize the push notification service
  async initialize() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    // In development mode with HTTP, skip push notification initialization
    if (this.isDevelopment && window.location.protocol !== 'https:') {
      console.log('Push notifications disabled in development mode (HTTP)');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');

      // Get VAPID public key from environment or use a default
      this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 
        'BK32H_uCiym7qRQl36JfVI4FRu6ZuazrdYohqZ5-rm5Ff2sfX0YHw_ubekDj9vVBwWiTSnq1pWoldWQJ1yw3c4Y';

      return true;
    } catch (error) {
      console.error('Failed to register service worker:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      return 'denied';
    }

    // In development mode with HTTP, return denied
    if (this.isDevelopment && window.location.protocol !== 'https:') {
      console.log('Push notifications not available in development mode (HTTP)');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  // Check if notifications are supported and permitted
  isNotificationSupported() {
    return this.isSupported && Notification.permission === 'granted';
  }

  // Subscribe to push notifications
  async subscribe() {
    if (!this.isSupported || !this.registration) {
      throw new Error('Push notifications not supported or service worker not registered');
    }

    try {
      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      // Subscribe to push notifications
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('Push subscription successful:', this.subscription);

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (!this.subscription) {
      return;
    }

    try {
      const result = await this.subscription.unsubscribe();
      console.log('Unsubscribed from push notifications:', result);
      
      // Remove subscription from server
      await this.removeSubscriptionFromServer();
      
      this.subscription = null;
      return result;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!token || !user) {
        throw new Error('User not authenticated');
      }

      const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
      
      const response = await fetch(`${API_BASE}/api/push-subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user._id,
          subscription: subscription,
          userAgent: navigator.userAgent,
          endpoint: subscription.endpoint
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }

      console.log('Subscription saved to server successfully');
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      throw error;
    }
  }

  // Remove subscription from server
  async removeSubscriptionFromServer() {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!token || !user) {
        return;
      }

      const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";
      
      await fetch(`${API_BASE}/api/push-subscriptions/${user._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Subscription removed from server successfully');
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  }

  // Show a local notification (for testing)
  showLocalNotification(title, options = {}) {
    if (!this.isNotificationSupported()) {
      console.warn('Notifications not supported or permission not granted');
      return;
    }

    const notificationOptions = {
      body: options.body || 'You have a new notification',
      icon: options.icon || '/juanlms.svg',
      badge: options.badge || '/juanlms.svg',
      tag: options.tag || 'juanlms-notification',
      requireInteraction: options.requireInteraction || false,
      data: options.data || {},
      actions: options.actions || [
        {
          action: 'view',
          title: 'View',
          icon: '/juanlms.svg'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/juanlms.svg'
        }
      ]
    };

    if (this.registration) {
      this.registration.showNotification(title, notificationOptions);
    } else {
      new Notification(title, notificationOptions);
    }
  }

  // Convert VAPID key to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Get current subscription
  async getCurrentSubscription() {
    if (!this.registration) {
      return null;
    }

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      return this.subscription;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return null;
    }
  }

  // Check if user is subscribed
  async isSubscribed() {
    const subscription = await this.getCurrentSubscription();
    return subscription !== null;
  }
}

// Create and export a singleton instance
const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
