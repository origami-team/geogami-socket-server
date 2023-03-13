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
const roomsData = {}            // {[{ id: playersCount + 1, name: playerName, connectionStatus: "connected" }]}
const roomVRWorldType = {};     // not used currently -----
const instructorID = {};

/* Vir. Env. multiplayer */
var currentPlayer = {};
currentPlayer.name = 'unknown';
var virEnvClients = [];


console.log("Server Started");

io.on('connection', async (socket) => {
  // Print
  console.log("Connection made!!!");

  /* Functions' declaration */
  /* socket.on('checkAbilityToJoinGame', (gameDetail, callback) */
  socket.on('joinGame', handleJoinGame);
  socket.on('changePlayerConnectionStauts', handleChangePlayerConnectionStauts);
  socket.on('updateGameTrackStauts', handleUpdateGameTrackStauts);
  /* socket.on('checkgameStatus', handleCheckgameStatus); */
  socket.on('requestPlayersLocation', handleRequestPlayersLocation);
  socket.on('updatePlayersLocation', handleUpdatePlayersLocation);
  /*  */
  socket.on('newGame', handleNewGame);
  socket.on('joinVEGame', handleJoinVEGame);
  socket.on('updateAvatarPosition', handleUpdateAvatarPosition);
  socket.on('updateAvatarDirection', handleUpdateAvatarDirection);
  socket.on('checkRoomExistance', handleCheckRoomExistance);


  /* new impl (multiplayer-realworld) */
  // socket.on('assignPlayerNumber', handleAssignPlayerNumber);

  /*-----------------------------*/
  /*******************************/
  /* Start multiplayer realworld functions */

  /* check Player Previous Join */
  /*********************/
  socket.on('checkPlayerPreviousJoin', (storedplayerInfo, callback) => {
    console.log("🚀 (checkPlayerPreviousJoin) storedplayerInfo: ", storedplayerInfo);
    let isDisconnected = false;
    let sPlayerName = storedplayerInfo['playerName'];
    let sPlayerNo = storedplayerInfo['playerNo'];
    let sRoomName = storedplayerInfo['roomName'];

    /* check if room exist - then check if player no exists - then theck if player status is disconnected */
    /* To do: reomve name check later */
    if (roomsData[sRoomName] && roomsData[sRoomName][sPlayerNo - 1]
      && roomsData[sRoomName][sPlayerNo - 1]['connectionStatus'] == 'disconnected'
      && roomsData[sRoomName][sPlayerNo - 1]['name'] == sPlayerName) {

      console.log("--🚀---🚀-- (checkPlayerPreviousJoin) player is found diconnected: ", sPlayerName);
      isDisconnected = true;

      /* Join player to room */
      socket.join(sRoomName);
      /* store room name and player id using socket, to use it in when user diconnect*/
      socket.playerData = { roomName: sRoomName, playerName: sPlayerName, playerNo: sPlayerNo };
      /* change connection status to connected */
      handleChangePlayerConnectionStauts('connected');
    }

    callback({
      isDisconnected: isDisconnected,
      joinedPlayersCount: (roomsData[sRoomName] ? roomsData[sRoomName].length : 0)
    });
  });

  /* check Ability To Join Game */
  /*********************/
  socket.on('checkAbilityToJoinGame', (gameDetail, callback) => {
    console.log("🚀 (checkAbilityToJoinGame) gameDetail: ", gameDetail);
    // Assign received gamecode to a var.
    let roomName = gameDetail["gameCode"];
    let gameNumPlayers = gameDetail["gameNumPlayers"];
    let isRoomFull = false;

    /* check whether room exist */
    /* then, check whether game can accept further players */
    if (io.sockets.adapter.rooms[roomName]) {
      /* Get number of players in room */
      /* playerNo should not exceed current count of players in the room */
      playersCount = roomsData[roomName].length;
      console.log('🚀🚀 (checkAbilityToJoinGame) players count: ', playersCount)
      /* check if room is full */
      if (playersCount >= gameNumPlayers) {
        console.log("🚀🚀🚀 (checkAbilityToJoinGame) don't allow join")
        //return;
        isRoomFull = true;
      }
    }

    callback({
      isRoomFull: isRoomFull
    });
  });

  /* Join room */
  /*********************/
  async function handleJoinGame(playerInfo) {
    console.log("🚀 (handleJoinGame) playerInfo: ", playerInfo);
    let roomName = playerInfo['roomName'];
    let playerName = playerInfo['playerName'];

    /* check whether room existsm, if not initialze game status object */
    /* this will allow instructor to rejoin when disconnected for any reason */
    /* true only when room is empty */
    if (!io.sockets.adapter.rooms[roomName]) {
      /* Initialize track stored status to false */
      gameStatus[roomName] = { status: false, game_id: undefined };

      roomsData[roomName] = []
      console.log("🚀🚀 (handleJoinGame) roomName: ", roomName)
      console.log("🚀🚀🚀(handleJoinGame) roomsData1(length): ", roomsData[roomName].length)
    }

    /* Join player to room */
    socket.join(roomName);

    /* when instructor join game room */
    if (!playerName) {
      console.log("🚀🚀🚀🚀 (handleJoinGame) instructor has joined the room!");
      instructorID[roomName] = socket.id;

      /* send players data to instructor, to view current connection status of players */
      io.to(instructorID[roomName]).emit('onPlayerConnectionStatusChange', roomsData[roomName])

      //console.log("instructor1: ", instructorID[roomName]);
      return;
    }

    /* send playerNo to user using socket ID */
    // playerNo equal the current length of users in the room
    // let playersCount = io.sockets.adapter.rooms[roomName].length;

    /* store player data in roomsdata golabal varible */
    let playersCount = roomsData[roomName].length;
    roomsData[roomName][playersCount] = { id: playersCount + 1, name: playerName, connectionStatus: "connected" };

    /* send players data to instructur, if connected */
    if (instructorID[roomName] != undefined) {
      //console.log("🚀🚀🚀🚀 (handleJoinGame) instructorID[roomName]: ", instructorID[roomName])
      io.to(instructorID[roomName]).emit('onPlayerConnectionStatusChange', roomsData[roomName])
    }

    console.log("🚀🚀🚀🚀 (handleJoinGame) roomsData2: ", roomsData[roomName])

    /* store room name and player id using socket, to use it in when user diconnect*/
    socket.playerData = { roomName: roomName, playerName: playerName, playerNo: playersCount + 1 };

    /* give player a number and send to client */
    io.to(socket.id).emit('assignPlayerNumber', { playerNo: playersCount + 1, playerID: socket.id })

    /* Notify all players of number of joined players except joined member (to be able to start game wen all are in) */
    socket.to(roomName).emit('playerJoined', { joinedPlayersCount: playersCount + 1 })

    // temp
    printNumRoomMembers(roomName); //Print number of members
  }

  /* change connection status */
  /*********************/
  function handleChangePlayerConnectionStauts(connStatus) {
    console.log("🚀(handleChangePlayerConnectionStauts) connStatus: ", connStatus);
    if (socket.playerData) {
      let roomName = socket.playerData['roomName']
      let playerNo = socket.playerData['playerNo']
      let playerName = socket.playerData['playerName']

      // access player data using roomname and userId1-1
      /* condition to make sure finished status never change  */
      if (roomsData[roomName][playerNo - 1]['connectionStatus'] != "finished tasks") {
        roomsData[roomName][playerNo - 1]['connectionStatus'] = connStatus;
        console.log("🚀🚀(handleChangePlayerConnectionStauts): player", playerName, "( ", connStatus, " ) successfully");

        /* send players data to instructur, if connected */
        if (instructorID[roomName] != undefined) {
          // console.log("(handleJoinGame) instructorID[roomName]: ", instructorID[roomName])
          io.to(instructorID[roomName]).emit('onPlayerConnectionStatusChange', roomsData[roomName])
        }

        console.log("\n 🚀🚀 (handleChangePlayerConnectionStauts) after status change - (roomData):", roomsData[roomName]);
      }
    } else {
      // console.log("🚀🚀 (handleChangePlayerConnectionStauts): instructor", "( ", connStatus, " ) successfully");
    }
  }

  /* update game track status */
  /*********************/
  function handleUpdateGameTrackStauts(data) {
    let roomName = data["roomName"]
    let storedTrack_id = data["storedTrack_id"]

    // console.log("// UpdateGameTrackStauts, name: ", roomName, " id: ", storedTrack_id)
    gameStatus[roomName] = { status: true, track_id: storedTrack_id };

    console.log("// UpdateGameTrackStauts, gameStatus: ", gameStatus[roomName])
  }

  /* check game track status */
  /*********************/
  // Check whether game is already stored by one of the players
  socket.on('checkGameStatus', (roomName, callback) => {
    let trackDataStatus = gameStatus[roomName];

    //console.log("// checkgameStatus, trackDataStatus: ", trackDataStatus)

    callback({
      trackDataStatus: trackDataStatus
    });
  });

  /* request players location */
  /*********************/
  function handleRequestPlayersLocation(roomName) {
    console.log("/🚀/ handleRequestPlayersLocation, roomName: ", roomName)

    socket.to(roomName).emit('requestPlayerLocation');
  }

  /* update player location */
  /*********************/
  function handleUpdatePlayersLocation(data) {
    let roomName = data.roomName;
    let playerLoc = data.playerLoc;
    let playerNo = data.playerNo;

    console.log("/🚀/ handleUpdatePlayersLocation, data: ", data)
    io.to(instructorID[roomName]).emit('updateInstrunctorMapView', { playerLoc: playerLoc, playerNo: playerNo });

  }

  /* End of multiplayer functions */
  /********************************/
  /*------------------------------*/


  /*-----------------------------*/
  /*******************************/
  /* Start single player V.E. functions */

  /* step 1: join game using geogmai App  */
  function handleNewGame(gameCodeRecieved) {
    //let roomName = makeid(5);
    console.log("gameCodeRecieved: ", gameCodeRecieved);
    let roomName = gameCodeRecieved["gameCode"];
    let isVRWrorld_1 = gameCodeRecieved["isVRWorld_1"];
    // clientRooms[socket.id] = roomName;
    roomVRWorldType[roomName] = isVRWrorld_1; // to send the VR world type in `checkRoomExistance`

    //TODO: send name to frontend
    socket.join(roomName);
    printNumRoomMembers(roomName); //Print number of members
  }

  /*******************************************************************************/
  /* step 2:  V.E. check if room exists (game is opend using geogmai App) or not */
  function handleCheckRoomExistance(gameCodeRecieved) {
    let roomCode = gameCodeRecieved["gameCode"];
    // Check if room is created
    if (io.sockets.adapter.rooms[roomCode]) {
      console.log("Info: Room exist!!");
      console.log("Info: Room exist!! roomVRWorldType[roomCode]: ", roomVRWorldType[roomCode]);
      console.log("Info: Room exist!! roomCode: ", roomCode);
      /* send back room code and V.E. type */
      io.emit('checkRoomExistance', { roomCode: roomCode, roomStatus: true, roomVRWorldType: roomVRWorldType[roomCode] })
    } else {
      console.log("Warning: Room doesn't exist!!!??");
      io.emit('checkRoomExistance', { roomCode: roomCode, roomStatus: false })
    }
  }

  /****************************************/
  /* step 3: to join game using V.E. App  */
  function handleJoinVEGame(roomNameObj) {
    let roomName = roomNameObj["gameCode"];
    console.log("roomName obj: ", roomNameObj);
    const room = io.sockets.adapter.rooms[roomName];
    console.log("room: ", room);

    // clientRooms[socket.id] = roomName;

    // Check if room is created
    //if(! io.sockets.adapter.rooms[roomName]){
    socket.join(roomName);
    printNumRoomMembers(roomName); //Print number of members
    /* } else {
      console.log("Warning: Room doesn't exist!!!");
    } */
    //ToDO: add notificatoin that a new user has been joined
  }

  /*******************/
  /* Avatar position */
  function handleUpdateAvatarPosition(avatarPosition) {
    console.log("Loc", { x: avatarPosition["x_axis"], z: avatarPosition["y_axis"], r_code: avatarPosition["gameCode"] });
    io.to(avatarPosition["gameCode"]).emit('updateAvatarPosition', { x: avatarPosition["x_axis"], z: avatarPosition["y_axis"] })
  }

  /********************/
  /* Avatar direction */
  function handleUpdateAvatarDirection(avatarHeading) {
    console.log("Direction", { angleValue: avatarHeading["x_axis"], r_code: avatarHeading["gameCode"] });
    io.to(avatarHeading["gameCode"]).emit('updateAvatarDirection', { angleValue: avatarHeading["x_axis"] })
  }

  /* End of virtual environment functions */
  /****************************************/
  /*--------------------------------------*/


  /*-----------------------------*/
  /*******************************/
  /* Start multiplayer Vir.Env. functions */

  /*************/
  /* this fun. will update other avatars' positions, 
    in case there's an offset  */
  socket.on('player move', function (data) {
    console.log('🚀(player move) data:', data);
    // console.log('recv: move: '+JSON.stringify(data));
    //io.emit('updateAvatarPosition', { x: data["position"][0], z: data["position"][2] })
    currentPlayer.position = data.position;

    socket.broadcast.emit('player move', currentPlayer);
    // socket.broadcast.emit('player move', currentPlayer);
    console.log('*******(player move), move by: ' + currentPlayer.name);
  });

  /*************/
  /* this function to make walking looks smooth */
  socket.on('update avatar walk', function (val) {
    console.log('🚀(avatar walk) data:', val);
    currentPlayer.walkVal = val;
    socket.broadcast.emit('update avatar walk', currentPlayer);
    console.log('(player move), move by: ' + currentPlayer.name);

    console.log('🚀(player turn) virEnvClients[currentPlayer.playerNo].position', virEnvClients[currentPlayer.playerNo].position);
  });

  /*************/
  /* this function to make turning looks smooth */
  socket.on('update avatar turn', function (data) {
    console.log('🚀(avatar turn) trunVal:', data);
    currentPlayer.rotation = data.rotation;
    socket.broadcast.emit('update avatar turn', currentPlayer);
    console.log('(player turn), turn by: ' + currentPlayer.name);

    console.log('🚀(player turn) virEnvClients[currentPlayer.playerNo].rotation', virEnvClients[currentPlayer.playerNo].rotation);
  });


  socket.on('player turn', function (data) {
    console.log('🚀(player turn) ');
    //console.log('recv: turn: '+JSON.stringify(data));
    io.emit('updateAvatarDirection', { angleValue: data["rotation"][1] })
    currentPlayer.rotation = data.rotation;

    //socket.broadcast.emit('player turn', currentPlayer);
  });


  socket.on('player connect', function () {
    console.log('🚀(player connect) ');
    console.log("(player connect)_1a, virEnvClients.length: " + virEnvClients.length);
    if (virEnvClients.length > 0) {

      console.log("(player connect)_1b, virEnvClients.detail - virEnvClients[0].name: " + virEnvClients[0].name);

      for (var i = 0; i < virEnvClients.length; i++) {
        var playerConnected = {
          name: virEnvClients[i].name,
          position: virEnvClients[i].position,
          rotation: virEnvClients[i].rotation
          //health: virEnvClients[i].health
        };
        // in your current game, we need to tell you about the other players.
        socket.emit('other player connected', playerConnected);
        console.log('(player connect)_2, emit: other player connected: ' + JSON.stringify(playerConnected));
      }
    }
    console.log('(player connect)_3, Done-player connect--//');

  });

  /*********************************/
  socket.on('play', function (data) {
    console.log('🚀(play) ');
    console.log('(play),' + currentPlayer.name + ' recv: play: ' + JSON.stringify(data));

    currentPlayer = {
      name: data.name,
      position: [224, 100, 74], // to do: update
      // position: [224+(5*virEnvClients.length), 100, 74], // to do: update
      rotation: [0, 0, 0],
      walkVal: 0.0,
      playerNo: virEnvClients.length      /* to update player position and direction  */
    };
    virEnvClients.push(currentPlayer);
    // in your current game, tell you that you have joined
    console.log('(play),' + currentPlayer.name + ' emit: play: ' + JSON.stringify(currentPlayer));
    socket.emit('play', currentPlayer);
    // in your current game, we need to tell the other players about you.
    socket.broadcast.emit('other player connected', currentPlayer);
  });
  //#endregion

  /* End of multiplayer Vir. Env. functions */
  /********************************/
  /*------------------------------*/

  // Helping functions
  function printNumRoomMembers(roomName) {
    console.log("Number of Room Members including instructor: ", io.sockets.adapter.rooms[roomName].length);
  }

  /* on disconnection */
  /********/
  socket.on('disconnect', function () {
    console.log("\n\n\n\n Disonnection!!");

    /* update player status before disconnection */
    handleChangePlayerConnectionStauts("disconnected");
  });

});