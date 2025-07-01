const CACHE_NAME = 'student-scores-cache-v4'; // Updated cache name to force update
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

// ### FIX: Implemented a "Cache, then Network" strategy ###
// This is a more robust pattern to prevent refresh errors.
self.addEventListener('fetch', event => {
  // Strategy 1: For API calls to Google Scripts, we must always go to the network.
  if (event.request.url.startsWith('https://script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Strategy 2: For our app assets (like index.html), serve from cache first for a fast load,
  // then update the cache in the background from the network.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // Fetch a fresh version from the network in the background to update the cache.
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // If we get a valid response, update the cache.
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
          // The network request failed, which is okay if we're offline.
          console.log('Network request failed, serving from cache if available.', err);
        });

        // Return the cached version immediately if it exists,
        // otherwise, wait for the network to respond.
        return response || fetchPromise;
      });
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
