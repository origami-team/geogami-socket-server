/*
Notes:-
1. eventhough two objects are initialized 
*/
let app = require('express')();
let io = require('socket.io')(process.env.PORT || 3001);
// Rooms impl.
//const { makeid } = require('./utils');
const clientRooms = {};

// Multi-player impl.
var clients = [];

console.log("Server Started");

io.on('connection', socket => {
  // Print
  console.log("Connection made!");
  //console.log("socket.id", socket.id);

  // Multi-player impl.
  //#region 
  var currentPlayer = {};
  currentPlayer.name = 'unknown';
  //#endregion

  //#region old impl.
  // Functions' declaration
  socket.on('newGame', handleNewGame);
  socket.on('joinGame', handleJoinGame);
  socket.on('updateAvatarPosition', handleUpdateAvatarPosition);
  socket.on('updateAvatarDirection', handleUpdateAvatarDirection);
  socket.on('checkRoomExistance', handleCheckRoomExistance);
  socket.on('disconnect', onDisconnect);

  // Functions' definitions
  function handleNewGame(roomNameObj) {
    //let roomName = makeid(5);
    let roomName = roomNameObj["gameCode"];
    //let roomName = 'ss123';
    console.log("roomName : ", roomName, ", type: ", typeof (roomName));

    clientRooms[socket.id] = roomName;
    //TODO: send name to frontend
    socket.join(roomName);
    console.log("Num Room Members(new): ", io.sockets.adapter.rooms[roomName].length);
    printNumRoomMembers(roomName); //Print number of members
  }

  function handleJoinGame(roomNameObj) {
    let roomName = roomNameObj["gameCode"];
    console.log("roomName obj: ", roomNameObj);
    const room = io.sockets.adapter.rooms[roomName];
    console.log("room: ", room);

    clientRooms[socket.id] = roomName;

    // Check if room is created
    //if(! io.sockets.adapter.rooms[roomName]){
    socket.join(roomName);
    printNumRoomMembers(roomName); //Print number of members
    /* } else {
      console.log("Warning: Room doesn't exist!!!");
    } */

    //ToDO: add notificatoin that a new user has been joined
  }

  function handleUpdateAvatarPosition(avatarPosition) {
    console.log("Loc", { x: avatarPosition["x_axis"], z: avatarPosition["y_axis"], r_code: avatarPosition["gameCode"] });
    io.to(avatarPosition["gameCode"]).emit('updateAvatarPosition', { x: avatarPosition["x_axis"], z: avatarPosition["y_axis"] })
  }

  function handleUpdateAvatarDirection(avatarHeading) {
    console.log("Direction", { angleValue: avatarHeading["x_axis"], r_code: avatarHeading["gameCode"] });
    io.to(avatarHeading["gameCode"]).emit('updateAvatarDirection', { angleValue: avatarHeading["x_axis"] })
  }

  function handleCheckRoomExistance(roomNameObj) {
    let roomName = roomNameObj["gameCode"];
    // Check if room is created
    if (io.sockets.adapter.rooms[roomName]) {
      //socket.join(roomName);
      //printNumRoomMembers(roomName); //Print number of members
      console.log("Info: Room exist!??");
      io.emit('checkRoomExistance', { RoomStatus: true })
    } else {
      console.log("Warning: Room doesn't exist!!!??");
      io.emit('checkRoomExistance', { RoomStatus: false })
    }
  }

  function onDisconnect(avatarHeading) {
    console.log("Disonnection!");
  }


  // Helping functions
  function printNumRoomMembers(roomName) {
    console.log("Num Room Members(new): ", io.sockets.adapter.rooms[roomName].length);
  }
  //#endregion


  // Multi-player impl.
  //#region 
  socket.on('player move', function (data) {
    //console.log('recv: move: '+JSON.stringify(data));
    //io.emit('updateAvatarPosition', { x: data["position"][0], z: data["position"][2] })
    currentPlayer.position = data.position;

    //socket.broadcast.emit('player move', currentPlayer);
    socket.broadcast.emit('player move', currentPlayer);
    console.log('(player move), move by: '+ currentPlayer.name);
  });

  socket.on('player turn', function (data) {
    //console.log('recv: turn: '+JSON.stringify(data));
    io.emit('updateAvatarDirection', { angleValue: data["rotation"][1] })
    currentPlayer.rotation = data.rotation;

    //socket.broadcast.emit('player turn', currentPlayer);
  });

  socket.on('player connect', function () {
    console.log("(player connect)_1a, clients.length: "+ clients.length);
    if(clients.length>0){
      console.log("(player connect)_1b, clients.detail: "+ clients[0]);
    }
    for (var i = 0; i < clients.length; i++) {
      var playerConnected = {
        name: clients[i].name,
        position: clients[i].position,
        rotation: clients[i].rotation
        //health: clients[i].health
      };
      // in your current game, we need to tell you about the other players.
      socket.emit('other player connected', playerConnected);
      console.log('(player connect)_2, emit: other player connected: ' + JSON.stringify(playerConnected));
    }
    console.log('(player connect)_3, Done-player connect--//');

  });

  socket.on('play', function (data) {
    console.log('(play),' +currentPlayer.name + ' recv: play: ' + JSON.stringify(data));
    // if this is the first person to join the game init the enemies
    /* if (clients.length === 0) {
      numberOfEnemies = data.enemySpawnPoints.length;
      enemies = [];
      data.enemySpawnPoints.forEach(function (enemySpawnPoint) {
        var enemy = {
          name: guid(),
          position: enemySpawnPoint.position,
          rotation: enemySpawnPoint.rotation,
          health: 100
        };
        enemies.push(enemy);
      });
      playerSpawnPoints = [];
      data.playerSpawnPoints.forEach(function (_playerSpawnPoint) {
        var playerSpawnPoint = {
          position: _playerSpawnPoint.position,
          rotation: _playerSpawnPoint.rotation
        };
        playerSpawnPoints.push(playerSpawnPoint);
      });
    } */

    /* var enemiesResponse = {
      enemies: enemies
    }; */
    // we always will send the enemies when the player joins
    //console.log(currentPlayer.name + ' emit: enemies: ' + JSON.stringify(enemiesResponse));
    //socket.emit('enemies', enemiesResponse);
    //var randomSpawnPoint = playerSpawnPoints[Math.floor(Math.random() * playerSpawnPoints.length)];
    currentPlayer = {
      name: data.name,
      position: [224,100,74],
      rotation: [0,0,0]
      //health: 100
    };
    clients.push(currentPlayer);
    // in your current game, tell you that you have joined
    console.log('(play),' + currentPlayer.name + ' emit: play: ' + JSON.stringify(currentPlayer));
    socket.emit('play', currentPlayer);
    // in your current game, we need to tell the other players about you.
    socket.broadcast.emit('other player connected', currentPlayer);
  });




  //#endregion

});