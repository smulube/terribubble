var http            = require("http");
var express         = require("express");
var app             = express();
var sio             = require('socket.io');
var geolib          = require('geolib');
var _               = require('underscore');
var port            = process.env.PORT || 5000;
var sassMiddleware  = require('node-sass-middleware');

app.use(sassMiddleware({
  src: __dirname,
  dest: __dirname
}));

app.use(express.static(__dirname + "/"));

var server = http.createServer(app);

server.listen(port);
console.log("http server listening on %d", port);

var io = sio.listen(server);

var bubbles = {};

io.on('connection', function (socket) {
    socket.emit('id', socket.id);

    socket.on('position', function (data) {
        bubbles[ socket.id ] = data;
        think();
    });

    socket.on('disconnect', function () {
        delete bubbles[ socket.id ];
        think();
        io.emit("log", socket.id +" left");
    });
});

var think = function(){
    var bubbleCount = _.size(bubbles);

    // if not enough bubbles, let the only bubble know
    if ( !bubbleCount ) {
        console.log("no bubbles");
    }
    else if ( bubbleCount === 1 ) {
        console.log("only one bubble: "+ Object.keys(bubbles)[0]);
        io.sockets.connected[Object.keys(bubbles)[0]].emit("log", "only bubble");
    }
    else {
        console.log("ok lets think");
        io.emit("log", "other bubbles are around and moving!");
        console.log("calculate overlaps");

        _.each( bubbles, function( itemPosition, itemId ) {
            var bubbleSize = itemPosition.coords.accuracy;

            console.log("iterating bubble "+ itemId);
            console.log("bubble size "+ bubbleSize);

            _.each( bubbles, function( testPosition, testId ) {
                if ( testId !== itemId ) {
                    var distance = geolib.getDistance(
                        { latitude: itemPosition.coords.latitude, longitude: itemPosition.coords.longitude },
                        { latitude: testPosition.coords.latitude, longitude: testPosition.coords.longitude }
                    );

                    console.log("distance from "+ itemId +" to "+ testId +" is "+ distance);

                    if ( distance <= bubbleSize ) {
                        console.log("--- overlap on "+ itemId +" by "+ testId);
                        io.sockets.connected[itemId].emit("log", "<strong>"+ testId +" is in your bubble!</strong><br><small>"+ distance +"m away. your bubble is "+ bubbleSize +"m</small>");
                    }
                }
            });
        });
    }
};