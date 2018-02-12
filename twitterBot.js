const Twitter       = require('twitter');
const Config        = require('./config.js');
const discordClient = require('./discordBot.js').client;
const twitterClient = new Twitter(Config.twitter.auth);

const pathToMovie   = `${__dirname}/turtle.gif`;
const mediaType     = 'image/gif';
const mediaData     = require('fs').readFileSync(pathToMovie);
const mediaSize     = require('fs').statSync(pathToMovie).size;

const keywords = {track: Config.twitter.keywords};
const stream = twitterClient.stream('statuses/filter', keywords);

function Start() {
  console.log('Twitter bot is ready!');

  stream.on('data', function(tweet) {
    // Filtramos el tweet para evitar respondernos a nosotros mismos
    // y evitar responder a un tweet al que ya hemos respondido (fav)
    console.log('Filtrando tweet...');
    makeGet('account/settings', {}).then(function(data) {
      var aux = true;

      console.log('-------------------------');
      console.log("tweet.user.screen_name === data.screen_name");
      console.log(tweet.user.screen_name === data.screen_name);
      console.log('-------------------------');
      console.log("tweet.favorited");
      console.log(tweet.favorited);
      console.log('-------------------------');
      console.log("tweet.retweeted_status");
      console.log(tweet.retweeted_status);
      console.log('-------------------------');
      // Comprueba que no sea un tweet propio
      if (tweet.user.screen_name === data.screen_name) {
        aux = false;
      }

      // Comprueba que no sea un RT
      if (tweet.retweeted_status) {
        aux = false;
      }

      // Comprueba que no tenga ya un fav el tweet para evitar duplicados
      if (tweet.favorited) {
        aux = false;
      }

      if (aux) {
        respondUser(tweet);
      } else {
        console.log("El tweet no ha pasado el filtro");
      }
    });
  });
  
  stream.on('error', function(err) {
    console.log(err);
  });
}

function respondUser(tweet) {
  console.log("Comenzamos la respuesta");
  initUpload() // Declare that you wish to upload some media
    .then(appendUpload) // Send the data for the media
    .then(finalizeUpload) // Declare that you are done uploading chunks
    .then(mediaId => {
      console.log('Enviando tweet...');
      // You now have an uploaded movie/animated gif
      // that you can reference in Tweets, e.g. `update/statuses`
      // will take a `mediaIds` param.
      var user = tweet.user;
      var message = Config.twitter.message;
      
      if (!tweet.favorited) makePost('favorites/create', {id: tweet.id_str});

      makePost('statuses/update', {
        status: message,
        in_reply_to_status_id: tweet.id_str,
        auto_populate_reply_metadata: true,
        media_ids: mediaId
      }).then(function() {
        console.log('Tweet enviado!');

        const spamChannel = discordClient.channels.find('name', Config.discord.targetChannel);
        spamChannel.send(`Mirad! Alguien me ha mencionado en Twitter: https://twitter.com/${user.screen_name}/status/${tweet.id_str}`);
      });
    });
}

/**
 * Step 1 of 3: Initialize a media upload
 * @return Promise resolving to String mediaId
 */
function initUpload() {
  console.log('INIT');
  return makePost('media/upload', {
    command    : 'INIT',
    total_bytes: mediaSize,
    media_type : mediaType,
  }).then(data => data.media_id_string);
}

/**
 * Step 2 of 3: Append file chunk
 * @param String mediaId    Reference to media object being uploaded
 * @return Promise resolving to String mediaId (for chaining)
 */
function appendUpload(mediaId) {
  console.log('APPEND');
  return makePost('media/upload', {
    command      : 'APPEND',
    media_id     : mediaId,
    media        : mediaData,
    segment_index: 0
  }).then(data => mediaId);
}

/**
 * Step 3 of 3: Finalize upload
 * @param String mediaId   Reference to media
 * @return Promise resolving to mediaId (for chaining)
 */
function finalizeUpload(mediaId) {
  console.log('FINALIZE');
  return makePost('media/upload', {
    command : 'FINALIZE',
    media_id: mediaId
  }).then(data => mediaId);
}

/**
 * (Utility function) Send a POST request to the Twitter API
 * @param String endpoint  e.g. 'statuses/upload'
 * @param Object params    Params object to send
 * @return Promise         Rejects if response is error
 */
function makePost(endpoint, params) {
  return new Promise((resolve, reject) => {
    twitterClient.post(endpoint, params, (error, data, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * (Utility function) Send a GET request to the Twitter API
 * @param String endpoint  e.g. 'account/settings'
 * @param Object params    Params object to send
 * @return Promise         Rejects if response is error
 */
function makeGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    twitterClient.get(endpoint, params, (error, data, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

module.exports = {
  Start: Start
}