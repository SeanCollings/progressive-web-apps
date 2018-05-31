importScripts('workbox-sw.prod.v2.1.3.js');
importScripts('/src/js/idb.min.js');
importScripts('/src/js/utility.min.js');

// Workbox works well and makes easier for caching and dynammic caching

const workboxSW = new self.WorkboxSW();

// Setup own routes for dynamic caching
// - in registerRoute - can pass url, or regex
// - Regex - parse any request we make and get a hit if similar
// - staleWhileRevalidate - cache then network request with dynamic caching
workboxSW.router.registerRoute(/.*(?:googleapis|gstatic)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: 'google-fonts',
    cacheExpiration: {
      maxEntries: 4
      // can add expiration date
      // ,
      //   maxAgeSeconds: 60 * 60 * 24 * 30
    }
  }));

workboxSW.router.registerRoute('https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css',
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: 'material-css'
  }));

workboxSW.router.registerRoute(/.*(?:firebasestorage\.googleapis)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: 'post-images'
  }));

// Create own strategy
workboxSW.router.registerRoute('https://pwagram-38881.firebaseio.com/posts.json',
  // create own function - create own indexedb strategy
  function (args) {
    // args - get access to underlying fetch event
    return fetch(args.event.request)
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
            }
          });
        return res;
      })
  });

// Create fallback
workboxSW.router.registerRoute(function (routeData) {
  // return true; /* handle every route */
  // Check if incoming request accepts this content
  return (routeData.event.request.headers.get('accept').includes('text/html'));
},
  function (args) {
    return caches.match(args.event.request)
      .then(function (response) {
        // If already in cache, return item else fetch it
        if (response) {
          return response;
        } else {
          // if nothing in the cache, return the original network request
          return fetch(args.event.request)
            // Pre-cache after any fetch event within application and return
            .then(function (res) {
              return caches.open('dynamic')
                .then(function (cache) {
                  // store clone of data in cache
                  cache.put(args.event.request.url, res.clone());
                  // return actual res which then gets consumed (i.e. used / removed thereafter)
                  return res;
                });
            })
            // Catch error when try to fetch from network and offline..
            .catch(function (err) {
              // If can't find a cached value, will return offline html page
              return caches.match('/offline.html')
                .then(function (res) {
                  return res;
                });
            });
        }
      })
  });

workboxSW.precache([
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "998a8151b6bad8b22167bb114587e90a"
  },
  {
    "url": "manifest.json",
    "revision": "14df2b83905d213368a2f306067cd72c"
  },
  {
    "url": "offline.html",
    "revision": "4eab25ac74fd2904ec41a4d1fd558850"
  },
  {
    "url": "src/css/app.css",
    "revision": "f27b4d5a6a99f7b6ed6d06f6583b73fa"
  },
  {
    "url": "src/css/feed.css",
    "revision": "ba5ba020b9b8cf86d53dd562ec47b6dd"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  },
  {
    "url": "src/js/app.min.js",
    "revision": "0b43ec78c6af23f0a0e6387e9b6417bb"
  },
  {
    "url": "src/js/feed.min.js",
    "revision": "35e3f48a100d1e3be33325d93be5851a"
  },
  {
    "url": "src/js/fetch.min.js",
    "revision": "f044946c220164eed257b4e2fcb39234"
  },
  {
    "url": "src/js/idb.min.js",
    "revision": "88ae80318659221e372dd0d1da3ecf9a"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "713af0c6ce93dbbce2f00bf0a98d0541"
  },
  {
    "url": "src/js/promise.min.js",
    "revision": "3468ef1e50a211ea36c24d4abd41062b"
  },
  {
    "url": "src/js/utility.min.js",
    "revision": "a4d4cb3fb469d7c5e563403c9bac634c"
  }
]);

/* ======== ADD OWN SERVICE WORKER CODE HERE ======== */

// Will fire when re-establishes connectivity or if online,
// will fire when a new sync task was registered
self.addEventListener('sync', function (event) {
  console.log('[Service Worker] Background syncing', event);

  // If many tags, use a switch statement
  // Add tags to const file
  if (event.tag === 'sync-new-posts') {
    console.log('[Service Worker] Syncing new Posts');
    // Wait untill all data sent before finishing
    event.waitUntil(
      // Read data from InDB
      readAllData('sync-posts')
        .then(function (data) {
          for (let dt of data) {
            // Send data through as form data
            var postData = new FormData();
            postData.append('id', dt.id);
            postData.append('title', dt.title);
            postData.append('location', dt.location);
            postData.append('rawLocationLat', dt.rawLocation.lat);
            postData.append('rawLocationLng', dt.rawLocation.lng);
            postData.append('file', dt.picture, dt.id + '.png');

            fetch('https://us-central1-pwagram-38881.cloudfunctions.net/storePostData', {
              method: 'POST',
              body: postData
            })
              .then(function (res) {
                console.log('Sent data', res);
                // Make sure it was succesfully sync'd to the DB before deleting from InDB
                if (res.ok) {
                  res.json()
                    .then(function (resData) {
                      deleteItemFromData('sync-posts', resData.id);
                    })
                }
              })
              .catch(function (err) {
                console.log('Error while sending data', err);
              });
          }
        })
    );
  }
});


// Activated when a user clicks on a notification thrown by the service worker
self.addEventListener('notificationclick', function (event) {
  var notification = event.notification;
  var action = event.action;

  console.log(notification);

  if (action === 'confirm') {
    console.log('Confirm was chosen');
    notification.close();
  } else {
    console.log(action);

    // Open another page on !confirm
    event.waitUntil(
      // all things managed by service worker
      clients.matchAll()
        .then(function (clis) {
          // Find open windows where our application runs in
          // 'clis' (clients) is just an array
          var client = clis.find(function (c) {
            return c.visibilityState === 'visible';
          });

          // If tap notification
          if (client !== undefined) {
            // If browser open, focus to that page on new tab
            // navigate to url found on notification openUrl
            client.navigate(notification.data.url);
            client.focus();
          } else {
            // If no browser open, open a new browser/tab with applicaton loaded
            clients.openWindow(notification.data.url);
          }
          notification.close();
        })
    );
  }
});


// Fired when notification was closed / swiped away ie no button selection
self.addEventListener('notificationclose', function (event) {
  console.log('Notification was closed', event);
});


// Listen for incoming Push msg
self.addEventListener('push', function (event) {
  // If this service worker, on this browser, on this device has a subscription -> then will get it
  console.log('Push Notification received', event);

  // If there is data on the event to extract
  var data = {
    title: 'New',
    content: 'Something new happened!',
    openUrl: '/'
  }; // a fallback message

  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  // Send notification
  var options = {
    body: data.content,
    icon: '/src/images/icons/app-icon-96x96.png',
    badge: '/src/images/icons/app-icon-96x96.png',
    data: {
      url: data.openUrl
    }
  };

  event.waitUntil(
    // Active service worker cant show the notification - used to listen to events in bckground,
    // must use the registration of sw.. part running in browser
    self.registration.showNotification(data.title, options)
  );
});