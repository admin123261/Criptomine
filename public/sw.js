// service worker للتشغيل الخلفي للإشعارات
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'فتح التطبيق',
      },
      {
        action: 'close',
        title: 'إغلاق',
      },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

self.addEventListener('message', function(event) {
  if (event.data.type === 'RESET_COUNTERS') {
    // إعادة تعيين العدادات
    console.log('Resetting notification counters');
  }
});