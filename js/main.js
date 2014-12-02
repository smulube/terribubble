(function(){

var currentPos;
var socket = io.connect();

var log = function(message){
    console.log("new log");
    $(".js-log").prepend("<p class='log-item'>"+ message +"</p>");
};

log( "connecting..." );

var processGeolocation = function(position) {
    console.log("new geo");
    currentPos = $.extend(true, {} ,position);

    if ( socket.connected ) {
        socket.emit('position', currentPos);
    }

    log( "bubble size at "+ currentPos.coords.accuracy );
};

var geolocationError = function(error) {
    console.log("geo error");
};

var geoOptions = {
    timeout: 1000,
    enableHighAccuracy: true,
    maximumAge: 0
};

var watchId = navigator.geolocation.watchPosition(
    processGeolocation,
    geolocationError,
    geoOptions
);

socket.on('id', function (data) {
    $(".js-id").html("you are <strong>"+ data +"</strong>");
});

socket.on('log', function (data) {
    log(data);
});

socket.on('connect', function (data) {
    log("you are now connected");
});

socket.on('disconnect', function (data) {
    log("you have disconnected");
});

})();