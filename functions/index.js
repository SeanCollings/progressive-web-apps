const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const webpush = require('web-push');

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
        webpush.setVapidDetails('mailto: nightharrier@gmail.com',
          'BOXxvJ9r8gVRuN3LGmjffZvoJD3aVa4WZiHymO-jIARLYGZPXYzhQDfKdHRANBHTVuWvTW7aTyurA85VuPPSH7I',
          '5HFVWdojFuGtLZrtj6oTswS2xRtNm-yhum-1zJcAZcE');
        // Get subscriptions from database in firebase
        return admin.database().ref('subscriptions').once('value');
      })
      .then(subscriptions => {
        // Send push messages to each subscription
        subscriptions.forEach(sub => {
          const pushConfig = {
            endpoint: sub.val().endpoint,
            keys: {
              auth: sub.val().keys.auth,
              p256dh: sub.val().keys.p256dh
            }
          };
          // Send notification
          webpush.sendNotification(pushConfig, JSON.stringify({
            title: 'New Post',
            content: 'New Post added!',
            openUrl: '/help'
          }))
          // .catch((err) => {
          //   console.log(err);
          // })
        });

        response.status(201).json({ message: 'Data stored', id: request.body.id });
        return null;
      })
      .catch(err => {
        response.send(500).json({ error: err })
      })
  })
});
