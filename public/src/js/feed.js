var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');
var videoPlayer = document.querySelector('#player');
var canvasElement = document.querySelector('#canvas');
var captureButton = document.querySelector('#capture-btn');
var imagePicker = document.querySelector('#image-picker');
var imagePickerArea = document.querySelector('#pick-image');
var videoContainer = document.querySelector('#video-container'); //added to keep video size same as canvas
var picture;
var locationBtn = document.querySelector('#location-btn');
var locationLoader = document.querySelector('#location-loader');
var fetchedLocation = { lat: 0, lng: 0 };

locationBtn.addEventListener('click', function (event) {
  if (!('geolocation' in navigator)) {
    return;
  }

  var sawAlert = false;

  locationBtn.style.display = 'none';
  locationLoader.style.display = 'block';

  navigator.geolocation.getCurrentPosition(function (position) {
    // User allows location access
    locationBtn.style.display = 'inline';
    locationLoader.style.display = 'none';
    fetchedLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
    // Then can geolocation it with google api
    locationInput.value = fetchedLocation.lat + ' In Munich';
    // Required to make it focused
    // Focus the div element
    document.querySelector('#manual-location').classList.add('is-focused');
  }, function (err) {
    // User rejects location access
    console.log(err);
    locationBtn.style.display = 'inline';
    locationLoader.style.display = 'none';
    if (!sawAlert) {
      alert('Couldn\'t fetch location, please enter manually!');
      sawAlert = true;
    }
    fetchedLocation = { lat: 0, lng: 0 };
  },
    // Set timeout for searching for GPS else fail
    { timeout: 7000 });
});

function initializeLocation() {
  if (!('geolocation' in navigator)) {
    locationBtn.style.display = 'none';
  }
}

// Check to see if browser has ability to do video and mic
function initializeMedia() {
  if (!('mediaDevices' in navigator)) {
    navigator.mediaDevices = {};
  }

  // Create Pollyfill
  if (!('getUserMedia' in navigator.mediaDevices)) {
    // Create own camera functionaily on non supporting devices
    navigator.mediaDevices.getUserMedia = function (constraints) {
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      // all hope lost - create promise that rejects media
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented!'));
      }

      // or return promise that accesses media like modern mediaDevice call
      return new Promise(function (resolve, reject) {
        // use call method to alter way it will be called. Call it on navigator
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }

  // Get device video
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(function (stream) {
      captureButton.style.display = 'block';
      videoContainer.style.display = 'block';
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = 'block';
      //videoContainer.style.height = '200px';
      // videoContainer.style.height = videoPlayer.clientWidth / (videoPlayer.videoHeight / videoPlayer.videoWidth) + 'px';
    })
    .catch(function (err) {
      // Show image picker if camera access declined, no camera available, old browser
      imagePickerArea.style.display = 'block';
    });
}

captureButton.addEventListener('click', function (event) {
  canvasElement.style.display = 'block';
  videoPlayer.style.display = 'none';
  videoContainer.style.display = 'none';
  captureButton.style.display = 'none';

  // Canvas will display a 2d image
  var context = canvasElement.getContext('2d');
  var canvasHeight = videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width);
  context.drawImage(videoPlayer, 0, 0, canvas.width, canvasHeight);
  // Turn off all video from video source
  if (videoPlayer.srcObject) {
    videoPlayer.srcObject.getVideoTracks().forEach(function (track) {
      track.stop;
    });
  }

  picture = dataURItoBlob(canvasElement.toDataURL());
});

imagePicker.addEventListener('change', function (event) {
  // Give access to image user picked
  picture = event.target.files[0];
});

function openCreatePostModal() {
  // createPostArea.style.display = 'block';
  // Set timeout to not run at the same time as other threads -> smoother
  setTimeout(function () {
    createPostArea.style.transform = 'translateY(0)';
  }, 1);
  initializeMedia();
  initializeLocation();
  // });
  // Alternative
  // requestAnimationFrame(function () {
  //   createPostArea.style.transform = 'translateY(0)';
  // });

  if (deferredPrompt) {
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(function (choiceResult) {
      console.log(choiceResult.outcome);

      if (choiceResult.outcome === 'dismissed') {
        console.log('User cancelled installation');
      } else {
        console.log('User added to home screen');
      }
    });

    // Because we used 'deferredPropmt, set it back to null
    deferredPrompt = null;
  }

  // To remove a service worker
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker.getRegistrations()
  //     .then(function (registrations) {
  //       for (var i = 0; i < registrations.length; i++) {
  //         registrations[i].unregister();
  //       }
  //     })
  // }
}

// Reset everything
function closeCreatePostModal() {
  // Close media when close modal
  imagePickerArea.style.display = 'none';
  videoContainer.style.display = 'none';
  videoPlayer.style.display = 'none';
  canvasElement.style.display = 'none';
  locationBtn.style.display = 'inline';
  locationLoader.style.display = 'none';
  // Stop camera stream
  if (videoPlayer.srcObject) {
    // Show capture button again
    captureButton.style.display = 'inline';
    videoPlayer.srcObject.getVideoTracks().forEach(function (track) {
      track.stop();
    });
  }

  // Set timeout for smoother transition of close
  setTimeout(function () {
    createPostArea.style.transform = 'translateY(100vh)';
    // createPostArea.style.display = 'none';
  }, 1);
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

// Currently not in use, allows to save assets in cache on demand otherwise
function onSaveButtonClicked(event) {
  console.log('clicked');
  // Check to see if caching is supported
  if ('caches' in window) {
    // CACHE-ON-DEMAND
    // Create user-created cache storage
    caches.open('user-requested')
      .then(function (cache) {
        cache.add('https://httpbin.org/get');
        cache.add('/src/images/sf-boat.jpg');
      });
  }
}

// Runs through the loop removing all child nodes untill all cleared
function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

// Added Shared moments card
function createCard(data) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = 'url(' + data.image + ')';
  cardTitle.style.backgroundSize = 'cover';
  //cardTitle.style.backgroundPosition = 'center'; // Added in
  // cardTitle.style.height = '180px';
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'white';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';
  // var cardSaveButton = document.createElement('button');
  // cardSaveButton.textContent = 'Save';
  // cardSaveButton.addEventListener('click', onSaveButtonClicked);
  // cardSupportingText.appendChild(cardSaveButton);
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

function updateUI(data) {
  clearCards();
  for (var i = 0; i < data.length; i++) {
    createCard(data[i]);
  }
}

function createDataArray(data) {
  var dataArray = [];
  for (var key in data) {
    dataArray.push(data[key]);
  }
  return dataArray;
}

var url = 'https://pwagram-38881.firebaseio.com/posts.json';
// Set flag to see if network returned data before cache to prevenet overwriting
var networkDataRecieved = false;

// From Network
fetch(url)
  .then(function (res) {
    return res.json();
  })
  .then(function (data) {
    networkDataRecieved = true;
    console.log('From web', data);
    updateUI(createDataArray(data));
  });

// From indexedDB
if ('indexedDB' in window) {
  readAllData('posts')
    .then(function (data) {
      if (!networkDataRecieved) {
        console.log('From cache', data);
        updateUI(data);
      }
    });
}

/*// From Cache
if ('caches' in window) {
  caches.match(url)
    .then(function (response) {
      if (response) {
        return response.json();
      }
    })
    .then(function (data) {
      console.log('From cache', data);
      if (!networkDataRecieved) {
        updateUI(createDataArray(data));
      }
    });
};*/

// Send data to backend - fallback
function sendData() {
  var id = new Date().toISOString();
  var postData = new FormData();
  postData.append('id', id);
  postData.append('title', titleInput.value);
  postData.append('location', locationInput.value);
  postData.append('rawLocationLat', fetchedLocation.lat);
  postData.append('rawLocationLng', fetchedLocation.lng);
  postData.append('file', picture, id + '.png');

  fetch('https://us-central1-pwagram-38881.cloudfunctions.net/storePostData', {
    method: 'POST',
    body: postData
  })
    .then(function (res) {
      console.log('Send data', res);
      updateUI();
    });
}

form.addEventListener('submit', function (event) {
  event.preventDefault();

  if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
    alert('Please enter valid data!');
    return;
  }

  closeCreatePostModal();

  // Check if browser supports service workers and sync managers
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(function (sw) {
        var post = {
          id: new Date().toISOString(),
          title: titleInput.value,
          location: locationInput.value,
          picture: picture,
          rawLocation: fetchedLocation
        };
        // Write post to IndexedDB
        writeData('sync-posts', post)
          .then(function () {
            // Register sync event with the service worker
            // Choose id param to distinguish between different sync tasks
            return sw.sync.register('sync-new-posts');
          })
          .then(function () {
            // Show confirmation message (from css library & index.html)
            var snackbarContainer = document.querySelector('#confirmation-toast');
            var data = { message: 'Your Post was saved for syncing!' };
            snackbarContainer.MaterialSnackbar.showSnackbar(data);
          })
          .catch(function (err) {
            console.log(err);
          });
      });
  } else {
    // If there is no sync manager available, send immediatly
    sendData();
  }
});
