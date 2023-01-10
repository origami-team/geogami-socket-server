/*
Notes:-
1. eventhough two objects are initialized 
*/
let app = require('express')();
let io = require('socket.io')(process.env.PORT || 3005);
// Rooms impl.
//const { makeid } = require('./utils');
const clientRooms = {};         // clientRooms[socket.id] = roomName;
const gameStatus = {}           // { status: bool, track_id: string }
const roomsData = []            // []
const roomVRWorldType = {};     // not used currently -----

console.log("Server Started");

io.on('connection', async (socket) => {
  // Print
  console.log("Connection made!!!");

  /* Functions' declaration */
  // socket.on('newGame', handleNewGame);
  /* socket.on('checkAbilityToJoinGame', (gameDetail, callback) */
  socket.on('joinGame', handleJoinGame);
  socket.on('updateGameTrackStauts', handleUpdateGameTrackStauts);
  /* socket.on('checkgameStatus', handleCheckgameStatus); */
  socket.on('updateAvatarPosition', handleUpdateAvatarPosition);
  socket.on('updateAvatarDirection', handleUpdateAvatarDirection);
  socket.on('checkRoomExistance', handleCheckRoomExistance);

  /* new impl (multiplayer-realworld) */
  // socket.on('assignPlayerNumber', handleAssignPlayerNumber);

  /* multiplayer */
  /*********************/
  socket.on('checkAbilityToJoinGame', (gameDetail, callback) => {
    console.log("gameDetail: ", gameDetail);
    // Assign received gamecode to a var.
    let roomName = gameDetail["gameCode"];
    let numPlayers = gameDetail["gameNumPlayers"];
    let isRoomFull = false;

    /* check whether room exist */
    /* then, check whether game can accept further players */
    if (io.sockets.adapter.rooms[roomName]) {
      /* Get number of players in room */
      /* playerNo equal the current count of players in the room */
      playersCount = roomsData[roomName].length;
      console.log('player length: ', playersCount)
      /* check if room is full */
      if (playersCount >= numPlayers) {
        console.log("don't allow join")
        //return;
        isRoomFull = true;
      }
    }

    callback({
      isRoomFull: isRoomFull
    });
  });
  /***/


  /* multiplayer */
  /*********************/
  async function handleJoinGame(roomName) {
    console.log("roomName: ", roomName);

    /* check whether room existsm, if not initialze game status object */
    if (!io.sockets.adapter.rooms[roomName]) {
      /* Enter only when room is empty */

      /* Initialize track stored status to false */
      gameStatus[roomName] = { status: false, game_id: undefined };
      // console.log("gameStatus: ", gameStatus);

      roomsData[roomName] = []
      console.log("roomsData1: ", roomsData[roomName])
    }

    /* Assign room name to local object */
    clientRooms[socket.id] = roomName;

    /* Join player to room */
    socket.join(roomName);

    /* send playerNo to user using socket ID */
    // playerNo equal the current length of users in the room
    let playersCount = io.sockets.adapter.rooms[roomName].length;

    /* store player data to a public variable */
    roomsData[roomName][playersCount - 1] = { id: playersCount, name: "ali", status: "active" };
    console.log("roomsData2: ", roomsData[roomName])

    /* store room name and player id using socket, to use it in when user diconnect*/
    socket.playerData = { roomName: roomName, playerID: playersCount };

    /* give player a number and send to client */
    io.to(socket.id).emit('assignPlayerNumber', { playerNo: playersCount, playerID: socket.id })

    /* Notify all players of number of joined players except joined member (to be able to start game wen all are in) */
    socket.to(roomName).emit('playerJoined', { joinedPlayersCount: playersCount })

    // temp
    printNumRoomMembers(roomName); //Print number of members
  }


  /* multiplayer */
  /*********************/
  function handleUpdateGameTrackStauts(data) {
    let roomName = data["roomName"]
    let storedTrack_id = data["storedTrack_id"]

    // console.log("// UpdateGameTrackStauts, name: ", roomName, " id: ", storedTrack_id)
    gameStatus[roomName] = { status: true, track_id: storedTrack_id };

    console.log("// UpdateGameTrackStauts, gameStatus: ", gameStatus[roomName])
  }


  /* multiplayer */
  /*********************/
  // Check whether game is already stored by one of the players
  socket.on('checkGameStatus', (roomName, callback) => {
    let trackDataStatus = gameStatus[roomName];

    console.log("// checkgameStatus, trackDataStatus: ", trackDataStatus)

    callback({
      trackDataStatus: trackDataStatus
    });
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
    console.log("\n\n\n\n Disonnection!!");
    console.log("\nDisonnection!! (roomsData):", roomsData);
    
    /* update player status before disconnection */
    if (socket.playerData) {
      let roomName = socket.playerData['roomName']
      let playerID = socket.playerData['playerID']
      console.log("\nDisonnection!! (roomName):", roomName);
      console.log("\nDisonnection!! (playerID):", playerID);
      console.log("\nDisonnection!! (roomsData):", roomsData[roomName]);

      // access player data using roomname and userId-1
      roomsData[roomName][playerID - 1]['status'] = "disconnected"
      console.log("\nDisonnection!!(roomsData):", roomsData);
    }







    // roomsData[socket.playerData[]]

  });

});