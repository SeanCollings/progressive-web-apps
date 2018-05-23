const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var serviceAccount = require("./pwagram-fb-key.json");

// Init app to access firebase app with admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-38881.firebaseio.com/'
});

// Send to firebase
exports.storePostData = functions.https.onRequest((request, response) => {
  // Automatically wrap all code want to execute and send right headers
  cors(request, response, () => {
    // access the database then the posts node. Then push to the request
    admin.database().ref('posts').push({
      id: request.body.id,
      title: request.body.title,
      location: request.body.location,
      image: request.body.image
    })
      // Send id to make sure can delete correct item from InDB
      .then(() => {
        response.status(201).json({ message: 'Data stored', id: request.body.id });

        return null;
      }
      )
      .catch(err => {
        response.send(500).json({ error: err })
      })
  })
});
