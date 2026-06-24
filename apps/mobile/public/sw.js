// Minimal service worker to enable PWA installation criteria on Chrome and handle offline routing
const CACHE_NAME = 'deluxnet-mobile-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('[Service Worker] Asset caching failed: ', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle standard API requests normally (network-only)
  if (event.request.url.includes('/api/v1/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached asset, or fetch from network as fallback
      return response || fetch(event.request).catch(() => {
        // Offline fallback logic for SPA navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
