(function(){

$(document).foundation();

var currentId;
var bubbles       = {};
var bubblesLocal  = {};
var socket        = io.connect();

// map setup

var map = L.map('map', {
    center: [0, 0],
    zoom: 20,
    zoomControl: false,
    attributionControl: false
});

// sounds array

var sounds = [];

for (var i = 0; i < 12; i++) {
    sounds.push(new buzz.sound( "/sounds/"+ (450 + (50 * i)) +".mp3", {
        volume      : 100,
        webAudioApi : true
    }));
};

socket.on('connect', function (data) {
    //console.log("connected");
});

socket.on('disconnect', function (data) {
    //console.log("disconnected");
});

socket.on('identity', function (data) {
    //console.log("identity", data);
    currentId = data;

    $('#js-player-edit').foundation('reveal', 'open');
});

socket.on('update', function (data) {
    //console.log("update", data);
    bubbles = data;
    processBubbles();
});

var processBubbles = function() {
    // only handle bubbles that are ready to play
    _.each( bubbles, function(bubble,bubbleId) {
        if ( !bubble.ready ) {
            delete bubbles[bubbleId];
        }
    });

    var ownBubble = _.find( bubbles, function(bubble, bubbleId) {
        return bubbleId === currentId;
    });
    var ownBubblePosition;

    if ( ownBubble ) {
        ownBubblePosition = L.latLng( [ ownBubble.position.coords.latitude, ownBubble.position.coords.longitude ] );
    }

    // loop each bubble
    _.each( bubbles, function( bubble, bubbleId ) {
        var position = L.latLng( [ bubble.position.coords.latitude, bubble.position.coords.longitude ] );
        var size     = bubble.options.size;
        var slot     = bubble.slot;
        var color    = bubble.color;
        var name     = bubble.options.name;

        bubblesLocal[bubbleId] = bubblesLocal[bubbleId] || {};
        bubblesLocal[bubbleId].slot = slot;
        bubblesLocal[bubbleId].overlap = false;

        // map circle
        // if not created yet, then do it
        if ( !bubblesLocal[bubbleId].circle  ) {
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
        }
        // otherwise, update it
        else {
            bubblesLocal[bubbleId].circle.setLatLng( position );
            bubblesLocal[bubbleId].circle.setRadius( size );
            bubblesLocal[bubbleId].circle.updateLabelContent( name );
        }

        // distance / volume / frequency
        if ( ownBubble ) {
            // distance
            bubblesLocal[bubbleId].distance = ownBubblePosition.distanceTo(position) - size - ownBubble.options.size;
            //console.log(name +" is "+ bubblesLocal[bubbleId].distance +"m away");

            // not our bubble
            if ( bubbleId !== currentId ) {

                // detect overlap
                if ( bubblesLocal[bubbleId].distance <= 0 ) {
                    clearTimeout( bubblesLocal[bubbleId].soundStop );
                    clearTimeout( bubblesLocal[bubbleId].soundStart );
                    clearTimeout( bubblesLocal[bubbleId].soundDelay );
                    bubblesLocal[bubbleId].soundStart = false;
                    sounds[ bubblesLocal[bubbleId].slot ].play().loop();
                    bubblesLocal[bubbleId].overlap  = true;
                    //console.log("overlap bubble "+ slot);
                }
                else {
                    if ( bubblesLocal[bubbleId].overlap ) {
                        sounds[ bubblesLocal[bubbleId].slot ].unloop().stop();
                    }
                    bubblesLocal[bubbleId].overlap = false;

                    // play sound
                    bubblesLocal[bubbleId].soundFunction = function() {
                        clearTimeout( bubblesLocal[bubbleId].soundStop );
                        bubblesLocal[bubbleId].soundStart = true;

                        sounds[bubblesLocal[bubbleId].slot].play();

                        bubblesLocal[bubbleId].soundStop = setTimeout( function() {
                            //console.log("stop sound and wait "+ bubblesLocal[bubbleId].soundWait +" ms");
                            sounds[bubblesLocal[bubbleId].slot].stop();

                            bubblesLocal[bubbleId].soundDelay = setTimeout( bubblesLocal[bubbleId].soundFunction, bubblesLocal[bubbleId].soundWait );
                        }, 100);
                    };

                    if ( !bubblesLocal[bubbleId].soundStart ) {
                        clearTimeout( bubblesLocal[bubbleId].soundStop );
                        clearTimeout( bubblesLocal[bubbleId].soundStart );
                        clearTimeout( bubblesLocal[bubbleId].soundDelay );
                        bubblesLocal[bubbleId].soundStart = setTimeout( bubblesLocal[bubbleId].soundFunction, _.random(0,2000) );
                    }
                }

                bubblesLocal[bubbleId].soundWait = bubblesLocal[bubbleId].distance * 50;
                if (bubblesLocal[bubbleId].soundWait > 3000) {
                    bubblesLocal[bubbleId].soundWait = 3000;
                }
            }
        }

        // if it's our bubble
        if ( bubbleId === currentId ) {
            $(".js-name").html(name);
            $(".js-size").html(size +"m bubble");
            $(".js-name").css("color",color);
            $(".js-count").html(_.size( _.filter(bubbles, function(bubble){ return bubble.ready; }) ) +" players");

            map.panTo( position );

            $(".app-loading").velocity("fadeOut", { duration: 300 });
        }
    });

    if ( ownBubble ) {
        sounds[bubblesLocal[currentId].slot].play().loop();
    }

    // clear up bubbles that left
    var bubbleIds = _.keys( bubbles );

    _.each( bubblesLocal, function( bubble, bubbleId ) {
        if ( !_.contains( bubbleIds, bubbleId ) ) {
            map.removeLayer( bubblesLocal[bubbleId].circle );
            sounds[bubblesLocal[bubbleId].slot].stop();
            clearTimeout( bubblesLocal[bubbleId].soundDelay );
            clearTimeout( bubblesLocal[bubbleId].soundStart );
            clearTimeout( bubblesLocal[bubbleId].soundStop );
            delete bubblesLocal[bubbleId];
        }
    });

    //console.log(bubbles);
    //console.log(bubblesLocal);
};

var setOptions = function(){
    // activate sounds
    _.each(sounds,function(sound){ sound.load(); });
    updateOptions();
    $(".js-start").blur();
    $('#js-player-edit').foundation('reveal', 'close');
};

// cookie stuff

var previousName = $.cookie('name');
if ( previousName ) {
    $(".js-form-name").val( previousName );
}

var previousSize = $.cookie('size');
if ( previousSize ) {
    $(".js-form-size").val( previousSize );
}

$(".js-start").on("click", setOptions);
$(".js-form").on("submit", function(e){
    e.preventDefault();
});

var updateOptions = function() {
    var options = {
        name : $(".js-form-name").val(),
        size : $(".js-form-size").val()
    };
    $.cookie('name', options.name);
    $.cookie('size', options.size);
    socket.emit('options', options);
};

var currentPos;

var newPosition = function(position) {
    //console.log("new position");
    currentPos = $.extend(true, {} ,position);
};

var updater = setInterval(function(){
    if ( currentPos ) {
        socket.emit('position', currentPos);
    }
},500);

var geolocationError = function(error) {
    //console.log("geolocation error");
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