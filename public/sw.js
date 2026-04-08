// Sylvia Health - Service Worker for Push Notifications
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Sylvia', {
      body: data.body || 'You have questions waiting.',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'sylvia-session',
      renotify: true,
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'OPEN_SESSION' });
          return;
        }
      }
      self.clients.openWindow(url);
    })
  );
});

// Schedule alarm via setTimeout (fires while app is open / SW active)
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATIONS') {
    scheduleDaily(e.data.times);
  }
});

function scheduleDaily(times) {
  // times = ['09:00','12:00','15:00','18:00','21:00']
  const now = new Date();
  times.forEach(t => {
    const [h, m] = t.split(':').map(Number);
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next - now;
    setTimeout(() => {
      self.registration.showNotification('Sylvia', {
        body: 'Your check-in is ready. Tap to answer your questions.',
        tag: 'sylvia-session',
        renotify: true,
        data: { url: '/?session=1' }
      });
      // Reschedule for next day
      setTimeout(() => scheduleDaily(times), 1000);
    }, ms);
  });
}
