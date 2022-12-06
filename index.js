/*
Notes:-
1. eventhough two objects are initialized 
*/
let app = require('express')();
let io = require('socket.io')(process.env.PORT || 3005);
// Rooms impl.
//const { makeid } = require('./utils');
const clientRooms = {};
const isGameTrackStored = {}
const roomVRWorldType = {};

console.log("Server Started");

io.on('connection', async (socket) => {
  // Print
  console.log("Connection made!!!");
  // Functions' declaration
  // socket.on('newGame', handleNewGame);
  socket.on('joinGame', handleJoinGame);
  socket.on('updateGameTrackStauts', handleUpdateGameTrackStauts);
  // socket.on('checkIsGameTrackStored', handleCheckIsGameTrackStored);
  socket.on('updateAvatarPosition', handleUpdateAvatarPosition);
  socket.on('updateAvatarDirection', handleUpdateAvatarDirection);
  socket.on('checkRoomExistance', handleCheckRoomExistance);

  /* new impl (multiplayer-realworld) */
  // socket.on('assignPlayerNumber', handleAssignPlayerNumber);

  // add to hlep function
  /*   function checkNumberOfPlayers(roomName) {
    } */

  // Functions' definitions
  function handleJoinGame(gameCodeRecieved) {
    console.log("/// gameCodeRecieved: ", gameCodeRecieved);
    // Assign received gamecode to a var.
    let roomName = gameCodeRecieved["gameCode"];
    let gameNumPlayers = gameCodeRecieved["gameNumPlayers"];
    let playersCount;

    /* check whether game can accept further players */
    // check whether room exist
    if (io.sockets.adapter.rooms[roomName]) {
      // Get players count in room
      // playerNo equal the current length of users in the room
      playersCount = io.sockets.adapter.rooms[roomName].length;
      //check if game still accept more players
      // if not send user notification
      if (playersCount >= gameNumPlayers) {
        io.to(socket.id).emit('gamePlayersFull', { msg: `Sorry this game accepts only ${gameNumPlayers} players.` })
        console.log("don't allow adding player")
        return;
      }
    } else {
      // Enterd only when room is empty
      playersCount = 1;
      // Initialize track stored status to false
      isGameTrackStored[roomName] = { status: false, game_id: undefined };
      console.log("isGameTrackStored: ", isGameTrackStored);
    }

    /* Assign room name to local object */
    clientRooms[socket.id] = roomName;

    /* Join player to room */
    socket.join(roomName);

    /* send playerNo to user using socket ID */
    io.to(socket.id).emit('assignPlayerNumber', { playerNo: playersCount, playerID: socket.id })

    /* Notify all players of number of joined players except joined member (to be able to start game wen all are in) */
    socket.to(roomName).emit('playerJoined', { joinedPlayersCount: playersCount })

    // temp
    printNumRoomMembers(roomName); //Print number of members
  }

  /* multiplayer */
  function handleUpdateGameTrackStauts(data) {
    let roomName = data["roomName"]
    let game_id = data["game_id"]

    console.log("name: ", roomName, "///// id: ", game_id)
    isGameTrackStored[roomName] = { status: true, game_id: game_id };
  }

  /* multiplayer */
  // Check whether game is already stored by one of the players
  socket.on('checkIsGameTrackStored', (roomName, callback) => {
    let trackStoredStatus = isGameTrackStored[roomName];
    console.log("roomName: ", roomName);
    console.log("trackStoredStatus: ", trackStoredStatus);

    callback({
      status: trackStoredStatus["status"]
    });

    /* send game track stutus to sender */
    // io.to(socket.id).emit('isGameTrackStored', { trackStoredStatus: trackStoredStatus["status"] })
  });

  function handleUpdateAvatarPosition(avatarPosition) {
    console.log("Loc", { x: avatarPosition["x_axis"], z: avatarPosition["y_axis"], r_code: avatarPosition["gameCode"] });
    io.to(avatarPosition["gameCode"]).emit('updateAvatarPosition', { x: avatarPosition["x_axis"], z: avatarPosition["y_axis"] })
  }

  function handleUpdateAvatarDirection(avatarHeading) {
    console.log("Direction", { angleValue: avatarHeading["x_axis"], r_code: avatarHeading["gameCode"] });
    io.to(avatarHeading["gameCode"]).emit('updateAvatarDirection', { angleValue: avatarHeading["x_axis"] })
  }

  function handleCheckRoomExistance(gameCodeRecieved) {
    let roomCode = gameCodeRecieved["gameCode"];
    // Check if room is created
    if (io.sockets.adapter.rooms[roomCode]) {
      console.log("Info: Room exist!!");
      io.emit('checkRoomExistance', { roomCode: roomCode, roomStatus: true, roomVRWorldType: roomVRWorldType[roomCode] })
    } else {
      console.log("Warning: Room doesn't exist!!!??");
      io.emit('checkRoomExistance', { roomCode: roomCode, roomStatus: false })
    }
  }

  // Helping functions
  function printNumRoomMembers(roomName) {
    console.log("Number of Room Members(new): ", io.sockets.adapter.rooms[roomName].length);
  }

  socket.on('disconnect', function () {
    console.log("Disonnection!!");
  });

});