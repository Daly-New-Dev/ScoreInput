// Define a unique cache name
const CACHE_NAME = 'student-score-app-v1';

// List of static assets to cache on install
const ASSETS_TO_CACHE = [
  '/', // The main index.html file
  'https://fonts.googleapis.com/css2?family=Khmer+OS+Battambang&family=Khmer+OS+Muol+Light&display=swap'
  // Other static assets like font files could be added if their exact URLs are known
];

// The Google Apps Script URL that should ALWAYS be fetched from the network
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmLiz076vLjp5Hf--toh3n23D8zc84N5EygKS7NQ3a7rpGQ1VcuKallQIcMl5vIeBh8w/exec';

// Install event: Cache all static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets.');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Handle network requests
self.addEventListener('fetch', event => {
  const requestUrl = event.request.url;

  // 1. ALWAYS go to the network for Google Apps Script requests.
  // This is crucial for submitting scores and fetching live data.
  if (requestUrl.startsWith(SCRIPT_URL)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. For all other requests (static assets), use "Network First, then Cache"
  // This ensures users get the freshest content if online, but the app
  // still loads if offline.
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If the request is successful, cache it and return it
        return caches.open(CACHE_NAME).then(cache => {
          // We only cache successful GET requests
          if (event.request.method === 'GET' && networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // If the network request fails (e.g., offline), try to get it from the cache
        console.log('Service Worker: Network failed, serving from cache for:', requestUrl);
        return caches.match(event.request);
      })
  );
});