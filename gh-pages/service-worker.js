const CACHE_NAME = 'deturno-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo-192x192.png',
  './logo-512x512.png',
  './js/app.js',
  './js/pharmacies.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch((error) => {
      console.error('Failed to cache assets during install:', error);
    })),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request).catch(() => caches.match('./index.html'))),
  );
});
