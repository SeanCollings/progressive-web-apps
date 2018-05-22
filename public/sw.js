// Use to import external files to service worker
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v22';
var CACHE_DYNAMIC_NAME = 'dynamic-v2';
var STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
  '/src/js/feed.js',
  '/src/js/idb.js',
  '/src/js/promise.js',
  '/src/js/fetch.js',
  '/src/js/material.min.js',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/images/main-image.jpg',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

// Remove items from dynamic cache if too full
// function trimCache(cacheName, maxItems) {
//   caches.open(cacheName)
//     .then(function (cache) {
//       return cache.keys()
//         .then(function (keys) {
//           if (keys.length > maxItems) {
//             cache.delete(keys[0])
//               .then(trimCache(cacheName, maxItems));
//           }
//         })
//     })
// }


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
        cache.addAll(STATIC_FILES);
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

//== Prevent false-positives (Q&A lecture 86)
const isInCache = (requestURL, cacheArr) => cacheArr.some(url => url === requestURL.replace(self.origin, ''));

//== Alternate method
function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
    console.log('matched ', string);
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
}


// Triggered by web application / actual page
// #region Strategy: Cache-then-Network-&-Dynamic-Caching
self.addEventListener('fetch', function (event) {
  var url = 'https://pwagram-38881.firebaseio.com/posts.json';

  // If request url is the same as 'url'
  if (event.request.url.indexOf(url) > -1) {
    // return response and store in INDB
    event.respondWith(fetch(event.request)
      .then(function (res) {
        var clonedRes = res.clone();
        // Clear store first before writing to InDB store
        clearAllData('posts')
          .then(function () {
            return clonedRes.json()
          })
          .then(function (data) {
            // Store data in database per key
            for (var key in data) {
              writeData('posts', data[key])
              // For testing
              // Delete item from db via ID
              /*.then(function () {
                deleteItemFromData('posts', key);
              });*/
            }
          });
        return res;
      })
    );
    // Use cache-then-network strategy
    /*event.respondWith(
      // Dynamic caching
      caches.open(CACHE_DYNAMIC_NAME)
        .then(function (cache) {
          // Return the fetch request
          return fetch(event.request)
            // Intercept fetch and add it to the cache
            .then(function (res) {
              //trimCache(CACHE_DYNAMIC_NAME, 5);
              cache.put(event.request, res.clone());
              // Return the actual response
              return res;
            });
        })
    );
      event.respondWith(fetch(event.request)
    .then(function (res) {
      var respio
      return res;
    })
  );*/
  } else if (isInCache(event.request.url, STATIC_FILES)/*new RegExp('\\b' + STATIC_FILES.join('\\b|\\b') + '\\b').test(event.request.url)*/) {
    // If the request url is contained within the STATIC_FILES array (ie app static files)
    // Implement cache-only strategy
    event.respondWith(
      caches.match(event.request)
    );
  } else {
    // For all urls that dont use cache-then-network strategy
    // Use cache-with-network-fallback
    event.respondWith(
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
                    //trimCache(CACHE_DYNAMIC_NAME, 5);
                    // store clone of data in cache
                    cache.put(event.request.url, res.clone());
                    // return actual res which then gets consumed (i.e. used / removed thereafter)
                    return res;
                  });
              })
              // Catch error when try to fetch from network and offline..
              .catch(function (err) {
                // If can't find a cached value, will return offline page
                return caches.open(CACHE_STATIC_NAME)
                  .then(function (cache) {
                    // Return offline page only if trying to access /help page offline
                    // [update]: if a request is an html page, show offline page
                    if (event.request.headers.get('accept').includes('text/html')) {
                      return cache.match('/offline.html');
                    }
                    // Can check for anthing else as well ie images, css and show fallback defaults etc
                  });
              });
          }
        }));
  }
});
// #endregion Strategy: Cache-then-Network-&-Dynamic-Caching

// #region: Other Strategies

// #region Strategy: Cache-then-Network
// self.addEventListener('fetch', function (event) {
//   //console.log('[Service Worker] Fetching something ...', event);

//   // Prevent Chrome error
//   if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
//     return;
//   }
//   // Intercept request and return what is necessary
//   event.respondWith(
//     // Get cache value by request (i.e. by key)
//     caches.match(event.request)
//       .then(function (response) {
//         // If already in cache, return item else fetch it
//         if (response) {
//           return response;
//         } else {
//           // if nothing in the cache, return the original network request
//           return fetch(event.request)
//             // Pre-cache after any fetch event within application and return
//             .then(function (res) {
//               return caches.open(CACHE_DYNAMIC_NAME)
//                 .then(function (cache) {
//                   // store clone of data in cache
//                   cache.put(event.request.url, res.clone());
//                   // return actual res which then gets consumed (i.e. used / removed thereafter)
//                   return res;
//                 });
//             })
//             // Catch error when try to fetch from network and offline..
//             .catch(function (err) {
//               // If can't find a cached value, will return offline page
//               return caches.open(CACHE_STATIC_NAME)
//                 .then(function (cache) {
//                   return cache.match('/offline.html');
//                 });
//             });
//         }
//       })
//   );
// });
// #endregion Strategy: Cache then Network

// #region Strategy: Cache-Only
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     caches.match(event.request)
//   );
// });
//#endregion Strategy: Cache-Only

// #region Strategy: Network-Only
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     fetch(event.request)
//   );
// });
//#endregion Strategy: Network-Only

// #region Strategy: Network-1st-then-Cache-fallback
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     // Call fetch first, if successful -> will just work
//     fetch(event.request)
//       // Add dynamic caching if response works
//       .then(function (res) {
//         return caches.open(CACHE_DYNAMIC_NAME)
//           .then(function (cache) {
//             cache.put(event.request.url, res.clone());
//             return res;
//           });
//       })
//       //else catch failure and try to get from cache
//       .catch(function (err) {
//         return caches.match(event.request);
//       })
//   );
// });
//#endregion Strategy: Network 1st then Cache fallback

// #endregion Other Strategies