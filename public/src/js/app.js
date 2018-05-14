var deferredPrompt;

// If older browser where there is no promise functionality,
// set our own promise from promise.js
// POLYFILLS
if (!window.Promise) {
  window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    // NEVER CACHE SERVICE WORKER!!!
    .register('/sw.js', { scope: '/' })
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