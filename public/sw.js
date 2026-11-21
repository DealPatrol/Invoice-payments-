/* Minimal service worker for installability.
 * Network-only: never caches pages, API, auth, or Stripe responses.
 * Checkout is hosted on Stripe; authenticated and /api responses must stay fresh.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  try {
    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  } catch {
    return;
  }
  event.respondWith(fetch(request));
});
