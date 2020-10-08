//check README.md

//create a web application that uses the express frameworks and socket.io to communicate via http (the web protocol)
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var Filter = require('bad-words');
var filter = new Filter();



//canvas size
var WIDTH = 800;
var HEIGHT = 600;
var MARGIN = 50; //don't spawn on corners

//We want the server to keep track of the whole game state
//in this case the game state are the attributes of each player
var gameState = {
    players: {}
}

//rooms are different location in this game so they are predetermined (not dynamic)
//I don't want users to be in multiple rooms at the same time
var ROOMS = ["greyRoom", "blueRoom", "redRoom"];
var defaultRoom = ROOMS[0];

//when a client connects serve the static files in the public directory ie public/index.html
app.use(express.static('public'));

//when a client connects the socket is established and I set up all the functions listening for events
io.on('connection', function (socket) {
    //this appears in the terminal
    console.log('A user connected');

    //send the user to the default room
    socket.join(defaultRoom, function () {
        console.log(socket.rooms);
    });


    //wait for the player to send their name and info, then broadcast them
    socket.on('join', function (playerInfo) {
        console.log("New user joined the server: " + playerInfo.nickName + " avatar# " + playerInfo.avatar + " color# " + playerInfo.color);

        //the server randomizes the position
        var x = MARGIN + Math.floor(Math.random() * (WIDTH - MARGIN * 2));
        var y = MARGIN + Math.floor(Math.random() * (HEIGHT - MARGIN * 2));

        //the player objects on the client will keep track of the room
        var newPlayer = { id: socket.id, nickName: filter.clean(playerInfo.nickName), color: playerInfo.color, room: defaultRoom, avatar: playerInfo.avatar, x: x, y: y, destinationX: x, destinationY: y };

        //save the same information in my game state
        gameState.players[socket.id] = newPlayer;

        //this is sent to the client upon connection
        socket.emit('serverMessage', 'Hello welcome!');

        //send all players information about the new player
        //upon creation destination and position are the same 
        io.to(defaultRoom).emit('playerJoined', newPlayer);

        console.log("There are now " + Object.keys(gameState.players).length + " players on this server");

    });

    //when a client disconnects I have to delete its player object
    //or I would end up with ghost players
    socket.on('disconnect', function () {
        console.log("Player disconnected " + socket.id);
        io.sockets.emit('playerLeft', { id: socket.id });
        //send the disconnect
        //delete the player object
        delete gameState.players[socket.id];
        console.log("There are now " + Object.keys(gameState.players).length + " players on this server");

    });

    //when I receive an intro send it to the recipient
    socket.on('intro', function (newComer, obj) {
        io.to(newComer).emit('onIntro', obj);
    });


    //when I receive a talk send it to everybody in the room
    socket.on('talk', function (obj) {
        obj.message = filter.clean(obj.message)
        io.to(obj.room).emit('playerTalked', { id: socket.id, message: obj.message });

    });


    //when I receive a move sent it to everybody
    socket.on('changeRoom', function (obj) {

        console.log("Player " + socket.id + " moved from " + obj.from + " to " + obj.to);
        socket.leave(obj.from);
        socket.join(obj.to);

        //broadcast the change to everybody in the current room
        //from the client perspective leaving the room is the same as disconnecting
        io.to(obj.from).emit('playerLeft', { id: socket.id });

        //same for joining, sending everybody in the room the player state
        var playerObject = gameState.players[socket.id];
        playerObject.room = obj.to;
        playerObject.x = playerObject.destinationX = obj.x;
        playerObject.y = playerObject.destinationY = obj.y;
        io.to(obj.to).emit('playerJoined', playerObject);


    });

    //when I receive a move sent it to everybody
    socket.on('move', function (obj) {

        //broadcast the movement to everybody
        io.to(obj.room).emit('playerMoved', { id: socket.id, x: obj.x, y: obj.y, destinationX: obj.destinationX, destinationY: obj.destinationY });

    });


});



//listen to the port 3000
http.listen(3000, function () {
    console.log('listening on *:3000');
});



