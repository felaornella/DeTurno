// Install event: Cache assets and update the service worker immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/', // Home page
        '/files/logo-192x192.png', // Icon 192x192
        '/files/logo-512x512.png' // Icon 512x512
      ]).catch((error) => {
        console.error('Failed to cache assets during install:', error);
      });
    })
  );
  self.skipWaiting(); // Activate the service worker immediately after installation
});

// Activate event: Clean up old caches and take control of the page immediately
self.addEventListener('activate', (event) => {
  const cacheWhitelist = ['v1']; // List of caches we want to keep

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName); // Delete old caches
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of the page immediately
});

// Fetch event: Serve cached assets first, then fetch from the network if necessary
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request).catch((error) => {
          console.error('Fetch failed; returning offline page:', error);
          return caches.match('/'); // Fallback to an offline page if network fails
        });
      })
  );
});