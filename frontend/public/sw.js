// Service Worker for Push Notifications (Development-friendly)
const CACHE_NAME = 'juanlms-v3'; // Increment version to force cache refresh
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Check if we're in development mode (localhost)
const isDevelopment = self.location.hostname === 'localhost' || 
                     self.location.hostname === '127.0.0.1' || 
                     self.location.protocol === 'http:';

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip caching for API calls and authentication-related requests
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/login') ||
      event.request.url.includes('/users/') ||
      event.request.url.includes('juanlms-webapp-server.onrender.com')) {
    
    // For cross-origin requests, ensure proper headers
    const request = new Request(event.request.url, {
      method: event.request.method,
      headers: event.request.headers,
      body: event.request.body,
      mode: 'cors',
      credentials: 'include'
    });
    
    return fetch(request).catch(error => {
      console.error('Service Worker fetch error:', error);
      // Don't throw the error, just log it to prevent uncaught promise rejections
      return new Response(JSON.stringify({ error: 'Network error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event - Handle incoming push notifications (with development support)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  // Skip push notifications in development mode if not HTTPS
  if (isDevelopment && self.location.protocol !== 'https:') {
    console.log('Skipping push notification in development mode (non-HTTPS)');
    return;
  }
  
  let notificationData = {
    title: 'JuanLMS Notification',
    body: 'You have a new notification',
    icon: '/juanlms.svg',
    badge: '/juanlms.svg',
    tag: 'juanlms-notification',
    requireInteraction: true,
    actions: [
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

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || `juanlms-${data.type || 'notification'}`,
        data: data
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationData
  );

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Default action or 'view' action
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no existing window, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync (optional - for offline functionality)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Implement background sync logic here if needed
  return Promise.resolve();
}


