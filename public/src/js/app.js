var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

// If older browser where there is no promise functionality,
// set our own promise from promise.js
// POLYFILLS
if (!window.Promise) {
  window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    // NEVER CACHE SERVICE WORKER!!!
    // .register('/sw.js', { scope: '/' })
    // Use workbox generated service-worker
    .register('/service-worker.js', { scope: '/' })
    .then(function () {
      console.log('Service worker registered!');
    })
    .catch(function (err) {
      console.log(err);
    });
}

window.addEventListener('beforeinstallprompt', function (event) {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function displayConfirmNotification() {
  // Display notifications through service worker
  if ('serviceWorker' in navigator) {
    var options = {
      body: 'You succesfully subscribed to our Notification service!',
      icon: '/src/images/icons/app-icon-96x96.png',
      image: '/src/images/sf-boat.jpg',
      dir: 'ltr', // default
      lang: 'en-UK', //BCP 47
      vibrate: [100, 50, 200],   // vibrate, pause, vibrate etc
      badge: '/src/images/icons/app-icon-96x96.png', // notification icon at top of phone
      tag: 'confirm-notification', // Stack notifications ie dont repeat notifications
      renotify: true,  // if true & if tag set, will still vibrate on same notifications
      actions: [
        {
          action: 'confirm',
          title: 'Okay',
          icon: '/src/images/icons/app-icon-96x96.png'
        },
        {
          action: 'cancel',
          title: 'Cancel',
          icon: '/src/images/icons/app-icon-96x96.png'
        }
      ]
    };

    navigator.serviceWorker.ready
      .then(function (swreg) {
        swreg.showNotification('Successfully subscribed!', options);
      });
  }
}

// Create a new subscribtion for a user , store on server  etc
function configurePushSub() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  var reg;
  navigator.serviceWorker.ready
    .then(function (swreg) {
      // access push manager and check for existing subs
      // Each service worker / browser / device combo yields one subscription
      reg = swreg;
      return swreg.pushManager.getSubscription();
    })
    .then(function (sub) {
      if (sub === null) {
        // Create new subscription

        // Add key for authenticity
        var vapidPublicKey = 'BOXxvJ9r8gVRuN3LGmjffZvoJD3aVa4WZiHymO-jIARLYGZPXYzhQDfKdHRANBHTVuWvTW7aTyurA85VuPPSH7I';
        var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);

        // Returns a promise when newly subbed
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidPublicKey
        });
      } else {
        // We have a subscription
      }
    })
    .then(function (newSub) {
      // Pass new sub to server
      // Create new node in firebase - subscriptions
      return fetch('https://pwagram-38881.firebaseio.com/subscriptions.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(newSub)
      });
    })
    .then(function (res) {
      if (res.ok) {
        displayConfirmNotification();
      }
    })
    .catch(function (err) {
      console.log(err);
    });
}

function askForNotificationPermission() {
  Notification.requestPermission(function (result) {
    console.log('User Choice', result);
    if (result !== 'granted') {
      console.log('No notification permission granted!');
    } else {
      //displayConfirmNotification();
      configurePushSub();
      // Hide button if user allows notifications
    }
  })
}

// Only show notifications buttons if browser allows
if ('Notification' in window && 'serviceWorker' in navigator) {
  for (var i = 0; i < enableNotificationsButtons.length; i++) {
    enableNotificationsButtons[i].style.display = 'inline-block';
    enableNotificationsButtons[i].addEventListener('click', askForNotificationPermission);
  }
}

//#region Promises and Fetch
/*
// Creating promises in JS
var promise = new Promise(function (resolve, reject) {
  setTimeout(function () {
    resolve('This is executed once the timer is done!');
    //reject({ code: 500, message: 'An error occurred!' });
    //console.log('This is executed once the timer is done!');
  }, 3000);
});

promise.then(function (text) {
  return text;
}).then(function (sameText) {
  console.log(sameText + ' new Text added!');
}).catch(function (err) {
  console.log(err.code, err.message);
});

// Creating ajax calls (can't be used in service workers)
// GET
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://httpbin.org/ip');
xhr.responseType = 'json';

xhr.onload = function () {
  console.log(xhr.response);
}

xhr.onerror = function () {
  console.log('Error!');
}

xhr.send();

// Creating fetch requests in JS (can be used in service workers)
// GET
fetch('https://httpbin.org/ip')
  .then(function (response) {
    console.log(response);
    return response.json();
  })
  .then(function (data) {
    console.log(data);
  })
  .catch(function (err) {
    console.log(err);
  });

// POST
fetch('https://httpbin.org/post', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  mode: 'cors',
  body: JSON.stringify({ message: 'Does this work?' })
})
  .then(function (response) {
    console.log(response);
    return response.json();
  })
  .then(function (data) {
    console.log(data);
  })
  .catch(function (err) {
    console.log(err);
  });

console.log('This is executed right after setTimeout()');
*/
//endregion Promises and Fetch