/* eslint-disable no-undef */
// Firebase Cloud Messaging Background Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase App in Service Worker context with environment defaults
firebase.initializeApp({
  apiKey: 'AIzaSyCWBjAwqprRQkcyrsrfCfhcw8VowXS6O_A',
  authDomain: 'fx-od-app.firebaseapp.com',
  projectId: 'fx-od-app',
  storageBucket: 'fx-od-app.firebasestorage.app',
  messagingSenderId: '11765276611',
  appId: '1:11765276611:web:011386f866f2adf3d82776',
});

const messaging = firebase.messaging();

// Handle Background Push Notifications when web app tab is inactive / closed
messaging.onBackgroundMessage((payload) => {
  console.groupCollapsed(
    '%c[FCM_SERVICE_WORKER] Background Message Received',
    'color: #06b6d4; font-weight: bold;'
  );
  console.log('Payload:', payload);
  console.groupEnd();

  const title = payload.notification?.title || payload.data?.title || 'FX OD Portal Notification';
  const body = payload.notification?.body || payload.data?.message || payload.data?.body || 'You have a new institutional update.';
  const targetUrl = payload.data?.navigationTarget || payload.data?.route || payload.data?.url || '/dashboard';
  const icon = payload.notification?.icon || payload.data?.icon || '/favicon.svg';
  const tag = payload.data?.notificationId || payload.data?.type || `fcm-notif-${Date.now()}`;

  const notificationOptions = {
    body,
    icon,
    badge: '/favicon.svg',
    data: {
      url: targetUrl,
      navigationTarget: targetUrl,
      notificationId: payload.data?.notificationId,
      type: payload.data?.type,
      referenceId: payload.data?.referenceId,
    },
    tag,
    renotify: true,
    actions: [
      {
        action: 'open',
        title: 'View Details',
      },
    ],
  };

  self.registration.showNotification(title, notificationOptions);
});

// Handle Notification Click & Deep-linking
self.addEventListener('notificationclick', (event) => {
  console.groupCollapsed(
    '%c[FCM_SERVICE_WORKER] Notification Clicked',
    'color: #22c55e; font-weight: bold;'
  );
  console.log('Target URL:', event.notification.data?.url);
  console.groupEnd();

  event.notification.close();

  const targetUrl = event.notification.data?.url || event.notification.data?.navigationTarget || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// PWA Lifecycle Event Listeners for Offline Readiness and Installation
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let browser handle normal requests; supports PWA installation criteria
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
