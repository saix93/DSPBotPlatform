var fs = require('fs');
var twitter = require('twitter');
var config = require('./config.js');

var connect = new twitter(config.twitter.auth)

var keywords = {track: '#testingdspbot'};
var stream = connect.stream('statuses/filter', keywords);

function respondUser(tweet) {
  var gifPath = `${__dirname}/turtle.gif`;

  fs.stat(gifPath, function(err, gifStat) {
    if (err) {
      console.log("Error en gif");
      console.log(err);
    } else {
      console.log("Sabemos el tamaño del gif:");
      console.log(gifStat.size);
      console.log("--------------------------");
      // Se sube el gif a twitter
      var mediaConfig = {
        Name: "myGif",
        command: "INIT",
        total_bytes: gifStat.size,
        media_type: "image/gif",
        media_category: "tweet_gif"
      }

      var segmentIndex = 0;

      connect.post('media/upload', mediaConfig, function(err, init) {
        if (err) {
          console.log("Error en init");
          console.log(err);
        } else {
          console.log("Se ha llamado a init");
          console.log(init);
          console.log("--------------------------");
          var fd = fs.openSync(gifPath, 'r');

          newChunk(init, fd);
        }
      });

      function newChunk(init, fd) {
        var CHUNK_SIZE = 65536;
        var buffer = new Buffer(CHUNK_SIZE);
        var gifData;

        console.log("Este es el estado del indice");
        console.log(segmentIndex);
        console.log("--------------------------");
        var nread = fs.readSync(fd, buffer, 0, CHUNK_SIZE, CHUNK_SIZE * segmentIndex);

        if (nread === 0) {
          var finalizeConf = {
            Name: "myGif",
            command: "FINALIZE",
            media_id: init.media_id_string
          }

          connect.post('media/upload', finalizeConf, function(err, response) {
            if (err) {
              console.log("Error en finalize");
              console.log(err);
            } else {
              console.log("Se ha llamado a finalize");
              console.log(response);
              console.log("--------------------------");
              // Se construye el tweet de respuesta al usuario

              var user = tweet.user;

              var message = `Hola, ${user.name}.`;

              var responseTweet = {
                status: message,
                in_reply_to_status_id: tweet.id_str,
                auto_populate_reply_metadata: true,
                media_ids: init.media_id_string
              };

              connect.post('statuses/update', responseTweet, function(err, response) {
                if (err) {
                  console.log("Error en tweet");
                  console.log(err);
                } else {
                  console.log('Responded! - tweet id: ' + tweet.id_str);
                }
              });
            }
          });
        } else {
          if (nread < CHUNK_SIZE) {
            gifData = buffer.slice(0, nread);
          } else {
            gifData = buffer;
          }

          var appendConf = {
            Name: "myGif",
            command: "APPEND",
            media_id: init.media_id_string,
            media: gifData.toString('base64'),
            segment_index: segmentIndex
          }

          connect.post('media/upload', appendConf, function(err, response) {
            if (err) {
              console.log("Error en append");
              console.log(err);
            } else {
              console.log("Se ha llamado a append");
              console.log(response);
              console.log("--------------------------");
              segmentIndex++;
              newChunk(init, fd);
            }
          });
        }
      }
    }
  });
}

stream.on('data', function(data) {
  respondUser(data);
});

stream.on('error', function(err) {
  console.log(err);
});