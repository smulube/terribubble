(function(){

$(document).foundation();

var currentId;
var bubbles       = {};
var bubblesLocal  = {};
var hasPosition   = false;
var socket        = io.connect();

// map setup

var map = L.map('map', {
    center: [0, 0],
    zoom: 18,
    zoomControl: false,
    attributionControl: false
});

// sounds array

var sounds = [];

for (var i = 0; i < 12; i++) {
    sounds.push(new buzz.sound( "/sounds/"+ (450 + (50 * i)) +".mp3", {
        volume      : 0,
        webAudioApi : true
    }));
};

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
});

socket.on('update', function (data) {
    console.log("update", data);
    bubbles = data;
    processBubbles();
});

var processBubbles = function() {
    var ownBubble = _.find( bubbles, function(bubble, bubbleId) {
        return bubbleId === currentId;
    });
    var ownBubblePosition = ownBubble.position && ownBubble.position.coords ? L.latLng( [ ownBubble.position.coords.latitude, ownBubble.position.coords.longitude ] ) : null;

    // loop each bubble
    _.each( bubbles, function( bubble, bubbleId ) {
        var position, size, slot, name, color;

        // position
        if ( bubble.position && bubble.position.coords ) {
            position = L.latLng( [ bubble.position.coords.latitude, bubble.position.coords.longitude ] );
        }

        // size
        if ( bubble.options && typeof bubble.options.size !== "undefined" ) {
            size = bubble.options.size;
        }

        // slot
        if ( typeof bubble.slot !== "undefined" ) {
            console.log("slot:"+ bubble.slot);
            slot = bubble.slot;
        }

        // color
        if ( bubble.color ) {
            color = bubble.color;
        }

        // name
        if ( bubble.options && bubble.options.name && bubble.options.name !== "" ) {
            name = bubble.options.name;
        }

        // if not already on the map, create it
        if ( !bubblesLocal[bubbleId] ) {
            if ( position && size ) {
                bubblesLocal[bubbleId] = {};

                // map circle
                bubblesLocal[bubbleId].circle = L.circle(
                    position,
                    size,
                    {
                        stroke: true,
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.5
                    }
                )
                .bindLabel( name, {
                    noHide: true,
                    direction: 'auto'
                })
                .addTo(map);

                bubblesLocal[bubbleId].soundVolume = 0;

                bubblesLocal[bubbleId].soundStart = setTimeout(function(){
                    bubblesLocal[bubbleId].sound = setInterval(function(){
                        sounds[slot].setVolume(bubblesLocal[bubbleId].soundVolume).play();

                        setTimeout(function(){
                            sounds[slot].fadeOut(250, function(){
                                sounds[slot].stop();
                            });
                        }, 100);
                    },2000);
                },_.random(0,2000));
            }
        }
        // otherwise, update it
        else {
            bubblesLocal[bubbleId].circle.setLatLng( position );
            bubblesLocal[bubbleId].circle.setRadius( size );
        }

        // update volume
        if ( bubblesLocal[bubbleId] && position && ownBubblePosition ) {
            console.log("volume of frequency "+ (450 + (50 * slot)), parseInt(100 - (ownBubblePosition.distanceTo(position) * 2)));
            bubblesLocal[bubbleId].soundVolume = parseInt(100 - (ownBubblePosition.distanceTo(position) * 2));
            if ( bubblesLocal[bubbleId].soundVolume < 0 ) {
                bubblesLocal[bubbleId].soundVolume = 0;
            }
            sounds[slot].setVolume( bubblesLocal[bubbleId].soundVolume );
        }

        // overlapping?
        if ( position && size && ownBubblePosition && bubbleId !== currentId && ownBubble.options && typeof ownBubble.options.size !== "undefined" ) {
            if ( ownBubblePosition.distanceTo(position) - size < ownBubble.options.size ) {
                console.log("overlapping "+ name +" by "+ ( ownBubble.options.size - (ownBubblePosition.distanceTo(position) - size) ));
            }
            else {
                console.log("not overlapping "+ name +" by "+ ( (ownBubblePosition.distanceTo(position) - size) - ownBubble.options.size ));
            }
        }

        // if it's our bubble
        if ( bubbleId === currentId ) {
            if ( position && size && name && color ) {
                $(".js-name").html(name);
                $(".js-size").html(size +"m bubble");
                $(".js-name").css("color",color);
                $(".js-count").html(_.size(bubbles) +" players");

                if ( !hasPosition ) {
                    hasPosition = true;
                    map
                        .panTo( position )
                        .fitBounds( bubblesLocal[bubbleId].circle.getBounds(), { padding: [50, 50] });
                }

                $(".app-loading").velocity("fadeOut", { duration: 300 });
            }
        }
    });

    // clear up bubbles that left
    var bubbleIds = _.keys(bubbles);

    _.each( bubblesLocal, function( bubble, bubbleId ) {
        if ( !_.contains( bubbleIds, bubbleId ) ) {
            map.removeLayer( bubblesLocal[bubbleId].circle );
            clearInterval( bubblesLocal[bubbleId].sound );
            if ( bubblesLocal[bubbleId].soundStart ) {
                clearTimeout( bubblesLocal[bubbleId].soundStart );
            }
            delete bubblesLocal[bubbleId];
        }
    });
};

var setOptions = function(){
    // activate sounds
    _.each(sounds,function(sound){ sound.load(); });
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
    hasPosition = false;
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