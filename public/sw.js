var CACHE_STATIC_NAME = 'static-v4';
var CACHE_DYNAMIC_NAME = 'dynamic-v2';

// Triggered by browser
self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installing Service Worker ...', event);

  ///* PRE-CACHING *///
  // Open the caches storage & waits till cache is created/opened then goes
  // to next eventlisteners etc.
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(function (cache) {
        console.log('[Service Worker] Precaching App Shell');
        // Think of it like caching 'urls'. Therefore need to cache / (i.e. home url)
        cache.addAll([
          '/',
          '/index.html',
          '/src/js/app.js',
          '/src/js/feed.js',
          '/src/js/promise.js',
          '/src/js/fetch.js',
          '/src/js/material.min.js',
          '/src/css/app.css',
          '/src/css/feed.css',
          '/src/images/main-image.jpg',
          'https://fonts.googleapis.com/css?family=Roboto:400,700',
          'https://fonts.googleapis.com/icon?family=Material+Icons',
          'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
        ]);
      })
  );
});

// Triggered by browser
self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activating Service Worker ...', event);
  // wait until cleanup of old cache before continuing
  event.waitUntil(
    // Get str array of keys of all caches
    caches.keys()
      .then(function (keyList) {
        // Promise.add - takes an array of promises and waits for all to finish
        return Promise.all(keyList.map(function (key) {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] Removing old cache.', key);
            // Remove old cache
            return caches.delete(key);
          }
        }));
      })
  );
  // Add this line to make it more robust
  return self.clients.claim();
});

// Triggered by web application / actual page
self.addEventListener('fetch', function (event) {
  //console.log('[Service Worker] Fetching something ...', event);

  // Prevent Chrome error
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }
  // Intercept request and return what is necessary
  event.respondWith(
    // Get cache value by request (i.e. by key)
    caches.match(event.request)
      .then(function (response) {
        // If already in cache, return item else fetch it
        if (response) {
          return response;
        } else {
          // if nothing in the cache, return the original network request
          return fetch(event.request)
            // Pre-cache after any fetch event within application and return
            .then(function (res) {
              return caches.open(CACHE_DYNAMIC_NAME)
                .then(function (cache) {
                  // store clone of data in cache
                  cache.put(event.request.url, res.clone());
                  // return actual res which then gets consumed (i.e. used / removed thereafter)
                  return res;
                });
            })
            // Catch error when try to fetch from network and offline..
            .catch(function (err) {

            });
        }
      })
  );
});