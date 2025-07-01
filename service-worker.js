const CACHE_NAME = 'student-scores-cache-v3'; // Updated cache name to force update
const urlsToCache = [
  '/',
  '/index.html'
];

// Install the service worker and cache the static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// ### FIX: Implemented a "Network Falling Back to Cache" strategy ###
// This is more robust and prevents errors on refresh for online users.
self.addEventListener('fetch', event => {
  // Strategy 1: For API calls to Google Scripts, we must always go to the network.
  if (event.request.url.startsWith('https://script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Strategy 2: For our app assets (like index.html), try the network first.
  // This ensures online users get the latest version.
  // If the network fails (because the user is offline), serve from the cache.
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If the fetch is successful, cache the new version for offline use.
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return networkResponse;
      })
      .catch(() => {
        // If the network request fails, serve the asset from the cache instead.
        return caches.match(event.request);
      })
  );
});


// Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
