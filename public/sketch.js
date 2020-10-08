//check README.md for more information

/// <reference path="TSDef/p5.global-mode.d.ts" />

//create a socket connection
var socket;

//linear speed
var SPEED = 300;
//how long does it stay per character
var MESSAGE_TIME = 0.3;

//this object keeps track of all the current players, coordinates and color
var players;
//a reference to this particular player
var me;
var canvas;

var nickName;

//lobby, avatar selection or game?
var screen;

//preset colors
var COLORS = ['#FF004D', '#FFA300', '#008751', '#29ADFF', '#FF77A8', '#FFCCAA'];
//preloaded images
var avatars = [];
//these are number, no need to send images
var currentAvatar;
var currentColor;
var roomColor;

//setup is called when all the assets have been loaded
function preload() {
    for (var i = 0; i < 3; i++)
        avatars[i] = loadImage("assets/avatar" + i + ".png");
}

function setup() {
    screen = "lobby";
}

//I could do this in DOM (regular html and javascript elements) 
//but I want to show a canvas with html overlay
function avatarSelection() {
    //create a canvas
    canvas = createCanvas(800, 600);
    //accept only the clicks on the canvas (not the ones on the UI)
    canvas.mouseReleased(canvasClicked);
    //by default the canvas is attached to the bottom, i want a 
    canvas.parent('canvas-container');
    screen = "avatar";

    //since my avatars are pixelated and scaled I kill the antialiasing on canvas
    noSmooth();
    randomAvatar();
    background(10, 255, 255);
}

function newGame() {
    screen = "game";
    showChat();


    /*
    //This is to visualize framerate independent movements
    var fps = random(30, 60);
    frameRate(fps);
    console.log("Simulating a framerate of " + fps);
    */

    //paint background
    roomColor = color("#FFF1E8");
    background(roomColor);

    //initialize players as object
    players = {};

    //I create socket but I wait to assign all the functions before opening a connection
    socket = io({
        autoConnect: false
    });

    //if the client detects a server connection it may be because the server restarted 
    //in that case the clients reconnect automatically and are assigned new ids so I have to clear
    //the previous player list to avoid ghosts
    socket.on('connect', function () {
        players = {};

        //send the server my name and avatar
        socket.emit('join', { nickName: nickName, color: currentColor, avatar: currentAvatar });
    });

    //when somebody joins the game create a new player
    socket.on('playerJoined',
        function (p) {

            console.log("new player in the room " + p.id + " " + p.x + " " + p.y);

            //if it's me
            if (socket.id == p.id) {
                players = {};
                players[p.id] = me = createPlayer(p);
            }
            else {
                //
                players[p.id] = createPlayer(p);

                //console.log("I shall introduce myself to " + p.id);

                //If I'm not the new player send an introduction to the new player
                socket.emit('intro', p.id, {
                    id: socket.id,
                    nickName: me.nickName,
                    color: me.color,
                    avatar: me.avatar,
                    room: me.room,
                    x: me.x,
                    y: me.y,
                    destinationX: me.destinationX,
                    destinationY: me.destinationY
                });
            }

            console.log("There are now " + Object.keys(players).length + " players in this room");

        }
    );

    //each existing player sends me an object with their parameters
    socket.on('onIntro',
        function (p) {
            //console.log("Hello newcomer I'm " + p.nickName + " " + p.id);
            players[p.id] = createPlayer(p);
            console.log("There are now " + Object.keys(players).length + " players in this room");
        }
    );


    //when somebody clicks to move, update the destination (not the position)
    socket.on('playerMoved',
        function (p) {
            console.log(p.id + " moves to: " + p.destinationX + " " + p.destinationY);

            //make sure the player exists
            if (players.hasOwnProperty(p.id)) {
                players[p.id].x = p.x;
                players[p.id].y = p.y;
                players[p.id].destinationX = p.destinationX;
                players[p.id].destinationY = p.destinationY;
            }
        });


    //when somebody disconnects/leaves the room
    socket.on('playerLeft',
        function (p) {
            console.log("Player " + p.id + " left");
            delete players[p.id];
            console.log("There are now " + Object.keys(players).length + " players in this room");
        }
    );


    //when somebody talks
    socket.on('playerTalked',
        function (p) {
            console.log("new message from " + p.id + ": " + p.message);
            var playerId = p.id;
            //make sure the player exists in the client
            if (players.hasOwnProperty(p.id)) {
                //the canvas continuously refresh and
                //the speech bubble needs to be rendered for a while
                //so I create a counter
                players[p.id].message = players[p.id].nickName + ": " + p.message;
                players[p.id].messageTime = p.message.length * MESSAGE_TIME;
            }
        }

    );

    //when a server message arrives
    socket.on('serverMessage',
        function (msg) {
            if (socket.id) {
                console.log("Message from server: " + msg);
            }
        }

    );

    socket.open();

}

//this p5 function is called continuously 60 times per second by default
function draw() {

    //just renders the current avatar number and color
    if (screen == "avatar") {

        background(240, 240, 240);
        imageMode(CENTER);
        tint(COLORS[currentColor]);
        image(avatars[currentAvatar], width / 2, height / 2, avatars[currentAvatar].width * 4, avatars[currentAvatar].height * 4);
        noTint();
    }
    if (screen == "game") {
        //draw a background
        background(roomColor);

        //iterate through the players
        for (var playerId in players) {
            if (players.hasOwnProperty(playerId)) {

                var p = players[playerId];

                //make sure the coordinates are non null since I may have created a player
                //but I may still be waiting for the first update
                if (p.x != null && p.y != null) {

                    //position and destination are different, move
                    if (p.x != p.destinationX || p.y != p.destinationY) {

                        //a series of vector operations to move toward a point at a linear speed

                        // create vectors for position and dest.
                        var destination = createVector(p.destinationX, p.destinationY);
                        var position = createVector(p.x, p.y);

                        // Calculate the distance between your destination and position
                        var distance = destination.dist(position);

                        // this is where you actually calculate the direction
                        // of your target towards your rect. subtraction dx-px, dy-py.
                        var delta = destination.sub(position);

                        // then you're going to normalize that value
                        // (normalize sets the length of the vector to 1)
                        delta.normalize();

                        // then you can multiply that vector by the desired speed
                        var increment = delta.mult(SPEED * deltaTime / 1000);

                        /*
                        IMPORTANT
                        deltaTime The system variable deltaTime contains the time difference between 
                        the beginning of the previous frame and the beginning of the current frame in milliseconds.
                        the speed is not based on the client framerate which can be variable but on the actual time that passes
                        between frames. Replace deltaTime with 30 and uncomment the random frameRate at the beginning
                        */

                        //increment the position
                        position.add(increment);

                        //calculate new distance
                        var newDistance = position.dist(createVector(p.destinationX, p.destinationY));

                        //if I got farther than I was originally I overshot so set position to destination
                        if (newDistance > distance) {
                            p.x = p.destinationX;
                            p.y = p.destinationY;
                        }
                        else {
                            p.x = position.x;
                            p.y = position.y;
                        }


                    }

                    //draw the avatar
                    imageMode(CENTER);
                    image(p.avatarGraphics, p.x, p.y, p.avatarGraphics.width * 2, p.avatarGraphics.height * 2);

                    //check if the player has messages
                    if (p.messageTime != null) {

                        //check if the last message expired
                        if (p.messageTime > 0) {
                            //draw the message
                            fill(COLORS[p.color]);
                            textSize(20);
                            textAlign(CENTER, BASELINE);
                            text(p.message, p.x, p.y - 30);
                            //decrease the counter
                            p.messageTime -= deltaTime / 1000;
                        }
                    }

                    //the rooms are hardcoded, ideally you want a data structure
                    if (p == me) {
                        if (p.x < 20 && p.room == "greyRoom") {
                            //change my attribute immediately so I don't emit it again at the next frame
                            p.room = "blueRoom";
                            roomColor = color("#1D2B53");

                            socket.emit('changeRoom', { from: "greyRoom", to: "blueRoom", x: width - 25, y: p.y });
                        }

                        if (p.x > width - 20 && p.room == "blueRoom") {
                            //change my attribute immediately so I don't emit it again at the next frame
                            p.room = "greyRoom";
                            roomColor = color("#FFF1E8");
                            //print("Exit room");
                            socket.emit('changeRoom', { from: "blueRoom", to: "greyRoom", x: 25, y: p.y });
                        }


                    }
                }

            }
        }
    }

    //

}

//copy the properties
function createPlayer(p) {
    return {
        nickName: p.nickName,
        color: p.color,
        avatar: p.avatar,
        avatarGraphics: tintGraphics(avatars[p.avatar], COLORS[p.color]),
        room: p.room,
        x: p.x,
        y: p.y,
        destinationX: p.destinationX,
        destinationY: p.destinationY
    }
}

//My inputs


//when I click to move
function canvasClicked() {

    if (me != null) {
        console.log("xy " + me.x + ", " + me.y);
        socket.emit('move', { x: me.x, y: me.y, room: me.room, destinationX: mouseX, destinationY: mouseY });
    }


}

//For better user experience I automatically focus on the chat textfield upon pressing a key
function keyPressed() {
    if (screen == "game") {
        var field = document.getElementById("chatField");
        field.focus();
    }
    if (screen == "lobby") {
        var field = document.getElementById("lobby-field");
        field.focus();
    }
}

//when I hits send
function talk(msg) {
    socket.emit('talk', { message: msg, room: me.room });
}

//called by the talk button in the html
function getTalkInput() {
    // Selecting the input element and get its value 
    var inputVal = document.getElementById("chatField").value;
    //sending it to the talk function in sketch
    talk(inputVal);
    document.getElementById("chatField").value = "";
    //prevent page from refreshing (default form behavior)
    return false;
}

//called by the continue button in the html
function nameOk() {
    var v = document.getElementById("lobby-field").value;

    if (v != "") {
        nickName = v;
        console.log(">welcome " + nickName);
        hideLobby();
        //the div container
        showAvatar();
        //the canvas background
        avatarSelection();
        //prevent page from refreshing on enter (default form behavior)
        return false;
    }

}

//draws a random avatar body in the center of the canvas
//colors it a random color
function randomAvatar() {
    currentColor = floor(random(0, COLORS.length));
    currentAvatar = floor(random(0, avatars.length));
}

function tintGraphics(img, colorString) {

    var c = color(colorString);
    let pg = createGraphics(img.width, img.height);
    pg.noSmooth();
    pg.tint(red(c), green(c), blue(c), 255);
    pg.image(img, 0, 0, img.width, img.height);
    return pg;
}

function bodyOk() {
    hideAvatar();
    newGame();
}

function showLobby() {
    document.getElementById("lobby-container").style.display = "block";
}

function hideLobby() {
    document.getElementById("lobby-container").style.display = "none";
}

function showAvatar() {
    document.getElementById("avatar-container").style.display = "block";
}

function hideAvatar() {
    document.getElementById("avatar-container").style.display = "none";
}

//enable the chat input when it's time
function showChat() {
    document.getElementById("talk-form").style.display = "block";
}


