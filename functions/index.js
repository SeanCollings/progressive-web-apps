const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const webpush = require('web-push');
var fs = require('fs');
var UUID = require('uuid-v4');
var os = require('os');
var Busboy = require('busboy');
var path = require('path');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var serviceAccount = require("./pwagram-fb-key.json");

// Google-Cloud config
var gcconfig = {
  projectId: 'pwagram-38881',
  keyFilename: 'pwagram-fb-key.json'
};

var gcs = require('@google-cloud/storage')(gcconfig);

// Init app to access firebase app with admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-38881.firebaseio.com/'
});

// Send to firebase
exports.storePostData = functions.https.onRequest((request, response) => {
  // Automatically wrap all code want to execute and send right headers
  cors(request, response, () => {
    // Unique ID
    var uuid = UUID();

    const busboy = new Busboy({ headers: request.headers });
    // These objects will store the values (file + fields) extracted from busboy
    let upload;
    const fields = {};

    // This callback will be invoked for each file uploaded
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(
        `File [${fieldname}] filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`
      );
      const filepath = path.join(os.tmpdir(), filename);
      upload = { file: filepath, type: mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });

    // This will invoked on every field detected
    busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) => {
      fields[fieldname] = val;
    });

    // This callback will be invoked after all uploaded files are saved.
    busboy.on('finish', () => {
      // Bucket is permanent storage
      var bucket = gcs.bucket('pwagram-38881.appspot.com');
      bucket.upload(
        upload.file,
        {
          uploadType: 'media',
          metadata: {
            metadata: {
              contentType: upload.type,
              firebaseStorageDownloadTokens: uuid
            }
          }
        },
        (err, uploadedFile) => {
          if (!err) {
            // access the database then the posts node. Then push to the request
            // image - publicly accessable url
            admin
              .database()
              .ref('posts')
              .push({
                id: fields.id,
                title: fields.title,
                location: fields.location,
                rawLocation: {
                  lat: fields.rawLocationLat,
                  lng: fields.rawLocationLng
                },
                image:
                  'https://firebasestorage.googleapis.com/v0/b/' +
                  bucket.name +
                  '/o/' +
                  encodeURIComponent(uploadedFile.name) +
                  '?alt=media&token=' +
                  uuid
              })
              // Send id to make sure can delete correct item from InDB
              .then(() => {
                webpush.setVapidDetails(
                  'mailto: nightharrier@gmail.com',
                  'BOXxvJ9r8gVRuN3LGmjffZvoJD3aVa4WZiHymO-jIARLYGZPXYzhQDfKdHRANBHTVuWvTW7aTyurA85VuPPSH7I',
                  '5HFVWdojFuGtLZrtj6oTswS2xRtNm-yhum-1zJcAZcE'
                );
                // Get subscriptions from database in firebase
                return admin
                  .database()
                  .ref('subscriptions')
                  .once('value');
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
                  webpush
                    .sendNotification(
                      pushConfig,
                      JSON.stringify({
                        title: 'New Post',
                        content: 'New Post added!',
                        openUrl: '/help'
                      })
                    )
                  // .catch((err) => {
                  //   console.log(err);
                  // })
                });

                response
                  .status(201)
                  .json({ message: 'Data stored', id: fields.id });
                return null;
              })
              .catch(err => {
                response.send(500).json({ error: err })
              });
          } else {
            console.log(err);
          }
        }
      );
    });

    // The raw bytes of the upload will be in request.rawBody.  Send it to busboy, and get
    // a callback when it's finished.
    busboy.end(request.rawBody);
    // formData.parse(request, function(err, fields, files) {
    //   fs.rename(files.file.path, "/tmp/" + files.file.name);
    //   var bucket = gcs.bucket("YOUR_PROJECT_ID.appspot.com");
    // });
  });
});
