var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');

function openCreatePostModal() {
  // createPostArea.style.display = 'block';
  // setTimeout(function () {
  createPostArea.style.transform = 'translateY(0)';
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

function closeCreatePostModal() {
  createPostArea.style.transform = 'translateY(100vh)';
  //  createPostArea.style.display = 'none';
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
  fetch('https://us-central1-pwagram-38881.cloudfunctions.net/storePostData', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      id: new Date().toISOString(),
      title: titleInput.value,
      location: locationInput.value,
      image: 'https://firebasestorage.googleapis.com/v0/b/pwagram-38881.appspot.com/o/sf-boat.jpg?alt=media&token=55d96247-08eb-46ab-b9b5-cce2e2108eaf'
    })
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
          location: locationInput.value
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
