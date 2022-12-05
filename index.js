/*
Notes:-
1. eventhough two objects are initialized 
*/
let app = require('express')();
let io = require('socket.io')(process.env.PORT || 3005);
// Rooms impl.
//const { makeid } = require('./utils');
const clientRooms = {};
const roomVRWorldType = {};

console.log("Server Started");

io.on('connection', async (socket) => {
  // Print
  console.log("Connection made!!!");
  // Functions' declaration
  // socket.on('newGame', handleNewGame);
  socket.on('joinGame', handleJoinGame);
  socket.on('updateAvatarPosition', handleUpdateAvatarPosition);
  socket.on('updateAvatarDirection', handleUpdateAvatarDirection);
  socket.on('checkRoomExistance', handleCheckRoomExistance);

  /* new impl (multiplayer-realworld) */
  // socket.on('assignPlayerNumber', handleAssignPlayerNumber);

  // Functions' definitions
  function handleJoinGame(roomNameObj) {
    console.log("/// gameCodeRecieved: ", gameCodeRecieved);
    // Assign received gamecode to a var.
    let roomName = gameCodeRecieved["gameCode"];

    // let isVRWrorld_1 = gameCodeRecieved["isVRWorld_1"]; // No need for it now, until we use multiplayer in VE

    /* Assign room name to ceated object */
    clientRooms[socket.id] = roomName;
    // roomVRWorldType[roomName] = isVRWrorld_1; // to send the VR world type in `checkRoomExistance`

    /* get user id to specify msg to users */
    // const userId = await fetchUserId(socket);
    console.log("// socket.id: ", socket.id);

    //TODO: send name to frontend
    /* Join player to room */
    socket.join(roomName);

    /* send playerNo to user */
    // playerNo equal the current length of users in the room
    let playerNum = io.sockets.adapter.rooms[roomName].length;
    // send playerNo to the user using socket ID
    io.to(socket.id).emit('assignPlayerNumber', { playerNo: playerNum, playerID: socket.id })

    /* Notify all players of number of enrolled players (to be able to start game) */
    io.to(roomName).emit('userJoined', { joinedPlayersCount: playerNum })


    const room = io.sockets.adapter.rooms[roomName];
    console.log("room: ", room);

    // temp
    printNumRoomMembers(roomName); //Print number of members
  }

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