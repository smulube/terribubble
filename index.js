var http            = require("http");
var express         = require("express");
var app             = express();
var sio             = require('socket.io');
var geolib          = require('geolib');
var color           = require("color");
var _               = require('underscore');
var port            = process.env.PORT || 5000;
var sassMiddleware  = require('node-sass-middleware');

app.use(sassMiddleware({
  src: __dirname,
  dest: __dirname,
  debug: true
}));

app.use(express.static(__dirname + "/"));

var server = http.createServer(app);

server.listen(port);
console.log("http server listening on %d", port);

var io = sio.listen(server);

io.on('connection', function (socket) {
    // send id
    socket.emit("identity", socket.id);

    addBubble( socket.id, socket );

    socket.on('disconnect', function () {
        removeBubble( socket.id );
    });

    socket.on('position', function (data) {
        updatePosition( socket.id, data );
    });

    socket.on('options', function (data) {
        updateOptions( socket.id, data );
    });
});

var bubbles = {};

var addBubble = function( id, socket ) {
    console.log("add bubble "+ id);

    bubbles[ id ] = {
        number   : _.size(bubbles),
        color    : color({ h: _.random(360), s: 100, l: 50 }).rgbString(),
        position : {}
    };

    broadcastBubbles();
};

var updatePosition = function( id, data ) {
    console.log("update position - "+ id);

    bubbles[ id ].position = data;

    broadcastBubbles();
};

var updateOptions = function( id, data ) {
    console.log("update options - "+ id);

    if ( !data.name || data.name === "" ) {
        data.name = "Bubble "+ _.random(99);
    }

    bubbles[ id ].options = data;

    broadcastBubbles();
};

var removeBubble = function( id ) {
    console.log("remove bubble "+ id);
    delete bubbles[ id ];
    broadcastBubbles();
};

var broadcastBubbles = function() {
    console.log("broadcast bubbles");
    io.emit("update", bubbles);
};