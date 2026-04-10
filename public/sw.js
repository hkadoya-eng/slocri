self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'SLOKEY';
  const options = {
    body: data.body || '新しい投稿があります',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'slokey-post',
    renotify: true,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
