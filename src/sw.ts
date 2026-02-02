/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Take control immediately when a new version is available
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

// ─── Push Notifications ──────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; tag?: string };
  try {
    data = event.data.json();
  } catch {
    return;
  }

  const { title = 'obicei', body, tag } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/icons/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return (client as WindowClient).focus();
        }
      }
      return self.clients.openWindow('/');
    }),
  );
});
