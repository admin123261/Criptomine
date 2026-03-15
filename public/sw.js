// CryptoMine Pro - Service Worker للإشعارات
const CACHE_NAME = 'cryptomine-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// استقبال الإشعارات
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'CryptoMine Pro';
  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    renotify: true,
    data: { url: self.location.origin }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// عند الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});
