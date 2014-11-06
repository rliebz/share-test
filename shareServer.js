var livedb = require('livedb');
var backend = livedb.client(livedb.memory());

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
    stream.push(data);
  });

  client.on('close', function(reason) {
    stream.push(null);
    stream.emit('close');
  });

  stream.on('end', function() {
    client.close();
  });

  // Give the stream to sharejs
  return share.listen(stream);

}));

port = 7007;
server.listen(port, function() {
    console.log('Server running at http://127.0.0.1:' + port);
});