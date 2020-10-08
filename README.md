# Visual Chat part 3

This iteration adds rooms, a feature of socket that allows to group users. Move to the left end of the screen to access the other room.

The server can add a client to a room by using join:  

`socket.join('some room', optional_cb_function);`

The callback is called when the socket has successfully joined a room.
You can see all of the rooms that a socket is in as an object with:  

`socket.rooms`  

Note that:

* everyone starts off in a default room based on their socket id
* you can be in multiple rooms

Sending a message only to the users in a room:

`socket.to('some room').emit('some event', 'message'):`

The sequence when connecting / entering a room:

1. player chooses username and avatar
2. player is assigned a room by the server
3. server notifies all clients in the room of the new player so they can create their avatar locally (the first time this include the player's client)
4. All the other clients in the room, upon learning about the new player, send them an intro object with their own updated parameters
5. player's client creates all the other avatars in the room

The server keeps track of all the players parameters (plus rooms but not the positions) whereas each client only knows about the other players in the same room

## Bad words

A [bad word filter library](https://www.npmjs.com/package/bad-words) has been added to the project with:

`npm install bad-words --save`

It censors offensive words in both username and messages. It happens on the server side so there's no way to hack it.
