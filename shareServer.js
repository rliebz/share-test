var port = 7007;
var dbHost = 'localhost';
var dbPort = 27017;
var dbName = 'sharejstest';

var livedb = require('livedb');
var mongo = require('livedb-mongo')(
    'mongodb://' + dbHost + ':' + dbPort + '/' + dbName,
    {safe:true}
);
var backend = livedb.client(mongo);

var sharejs = require('share');
var share = sharejs.server.createClient({backend: backend});

var Duplex = require('stream').Duplex;
var browserChannel = require('browserchannel').server;

var express = require('express');
var server = express();

// Serve static files
server.use(express.static(sharejs.scriptsDir));     // Sharejs
server.use(express.static(__dirname + '/public'));  // index.html and Ace wrapper
server.use(express.static(__dirname + '/node_modules/ace-builds')); // Ace

var users = 0;

server.use(browserChannel(function(client) {

  var stream = new Duplex({objectMode: true});

  stream._read = function() {};
  stream._write = function(chunk, encoding, callback) {
    if (client.state !== 'closed') {
      client.send(chunk);
    }
    callback();
  };

  client.on('message', function(data) {
    // Handle our custom messages separately
    if (data.registration) {
        users += 1;
        client.userMeta = data; // Attach metadata to the client object
        console.log('new user:', data.username, '| Total: ', users);
    } else {
        stream.push(data);
    }
  });

  // Called 20-30 seconds after the socket is closed
  client.on('close', function(reason) {
    users -= 1;
    console.log("removed user", client.userMeta.username, "| Total:", users);
    stream.push(null);
    stream.emit('close');
  });

  stream.on('end', function() {
    client.close();
  });

  // Give the stream to sharejs
  return share.listen(stream);

}));

server.listen(port, function() {
    console.log('Server running at http://127.0.0.1:' + port);
});