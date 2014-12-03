(function(){

$(document).foundation();

var currentId;
var bubbles = {};
var bubbleCircles = {};
var socket  = io.connect();

var map = L.map('map', {
    center: [0, 0],
    zoom: 18,
    zoomControl: false,
    attributionControl: false
});

socket.on('connect', function (data) {
    console.log("connected");
});

socket.on('disconnect', function (data) {
    console.log("disconnected");
});

socket.on('identity', function (data) {
    console.log("identity", data);
    currentId = data;

    $('#js-player-edit').foundation('reveal', 'open');
    $(document).on('opened.fndtn.reveal', '#js-player-edit', function () {
        $(".js-form-name").focus();
    });
});

socket.on('update', function (data) {
    console.log("update", data);
    bubbles = data;
    processBubbles();
});

var processBubbles = function() {
    // remove all circles
    _.each( bubbleCircles, function( circle ) {
        map.removeLayer(circle);
    });

    // loop each bubble
    _.each( bubbles, function( bubble, bubbleId ) {
        if ( bubble.position && bubble.position.coords ) {
            var position = L.latLng( [ bubble.position.coords.latitude, bubble.position.coords.longitude ] );
            var size = parseInt(bubble.options && bubble.options.size ? bubble.options.size : 0);
            var color = bubble.color || "#000";

            // create circle if not created already
            bubbleCircles[bubbleId] = L.circle(
                position,
                size,
                {
                    stroke: true,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.5
                }
            ).addTo(map);

            // if it's our bubble
            if ( bubbleId === currentId ) {
                map.panTo( position );
                map.panInsideBounds(bubbleCircles[bubbleId].getBounds());

                if ( bubble.options ) {
                    $(".js-name").html(bubble.options.name);
                    $(".js-size").html(bubble.options.size +"m bubble");
                }

                if ( bubble.color ) {
                    $(".js-name").css("color",bubble.color);
                }

                $(".app-loading").velocity("fadeOut", { duration: 300 });
            }
        }
    });


    console.log(bubbleCircles);
};

var setOptions = function(){
    updateOptions();
    $('#js-player-edit').foundation('reveal', 'close');
};

$(".js-start").on("click", setOptions);
$(".js-form").on("submit", function(e){
    e.preventDefault();
    //setOptions();
});

var updateOptions = function() {
    var options = {
        name : $(".js-form-name").val(),
        size : $(".js-form-size").val()
    };
    console.log(options);
    socket.emit('options', options);
};

var newPosition = function(position) {
    console.log("new position");
    currentPos = $.extend(true, {} ,position);
    socket.emit('position', currentPos);
};

var geolocationError = function(error) {
    console.log("geolocation error");
};

var watchId = navigator.geolocation.watchPosition(
    newPosition,
    geolocationError,
    {
        timeout: 1000,
        enableHighAccuracy: true,
        maximumAge: 0
    }
);

})();