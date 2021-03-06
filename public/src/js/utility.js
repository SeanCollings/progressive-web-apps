// Open the DB and creates object store as needed
// Give access to IndexedDB through a promise-like way
// .open(db-name, version, function that executes when the db was created)
var dbPromise = idb.open('posts-store', 1, function (db) {
  // If 'posts' object store not created
  if (!db.objectStoreNames.contains('posts')) {
    // Create a new object store / a table. 'name', 'primary key'
    db.createObjectStore('posts', { keyPath: 'id' });
  }
  // ObjectStore to store all the post to be sync'd
  if (!db.objectStoreNames.contains('sync-posts')) {
    db.createObjectStore('sync-posts', { keyPath: 'id' });
  }
})

// Write data to db
function writeData(st, data) {
  return dbPromise
    .then(function (db) {
      // Create transaction and target which store to target
      var tx = db.transaction(st, 'readwrite');
      // Open targeted store
      var store = tx.objectStore(st);
      // Add items to store by key
      store.put(data);
      // close transaction to maintain db integrity that it worked 100%
      return tx.complete;
    });
}

function readAllData(st) {
  return dbPromise
    .then(function (db) {
      // Every operation has to be wrapped in a transaction
      var tx = db.transaction(st, 'readonly');
      var store = tx.objectStore(st);
      return store.getAll();
    })
}

function clearAllData(st) {
  return dbPromise
    // get access to db returned from dbPromise
    .then(function (db) {
      var tx = db.transaction(st, 'readwrite');
      var store = tx.objectStore(st);
      // Clear all from store
      store.clear();
      return tx.complete;
    });
}

function deleteItemFromData(st, id) {
  dbPromise
    .then(function (db) {
      var tx = db.transaction(st, 'readwrite');
      var store = tx.objectStore(st);
      store.delete(id);
      return tx.complete;
    })
    .then(function () {
      console.log('Item deleted!');
    });
}

// To convert public VAPID key to an array of Uint values
function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Covert base64 url to a file
function dataURItoBlob(dataURI) {
  var byteString = atob(dataURI.split(',')[1]);
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  var blob = new Blob([ab], { type: mimeString });
  return blob;
}