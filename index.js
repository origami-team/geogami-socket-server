/*
Notes:-
1. eventhough two objects are initialized 
*/
let app = require('express')();
let io = require('socket.io')(process.env.PORT || 3001);
// Rooms impl.
//const { makeid } = require('./utils');
const clientRooms = {};
const roomVRWorldType = {};


console.log("Server Started");

/*********/
/* connection */
io.on('connection', socket => {
  // Print
  console.log("Connection made!!!");
  
  /* Functions' declaration */
  socket.on('newGame', handleNewGame);
  socket.on('joinGame', handleJoinGame);
  socket.on('updateAvatarPosition', handleUpdateAvatarPosition);
  socket.on('updateAvatarDirection', handleUpdateAvatarDirection);
  socket.on('checkRoomExistance', handleCheckRoomExistance);

  // Functions' definitions
  /****************************************/
  /* step 1: join game using geogmai App  */
  function handleNewGame(gameCodeRecieved) {
    //let roomName = makeid(5);
    let roomName = gameCodeRecieved["gameCode"];
    let isVRWrorld_1 = gameCodeRecieved["isVRWorld_1"];
    clientRooms[socket.id] = roomName;
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
      /* send back room code and V.E. type */
      io.emit('checkRoomExistance', { roomCode: roomCode, roomStatus: true, roomVRWorldType: roomVRWorldType[roomCode] })
    } else {
      console.log("Warning: Room doesn't exist!!!??");
      io.emit('checkRoomExistance', { roomCode: roomCode, roomStatus: false })
    }
  }

  /****************************************/
  /* step 3: to join game using V.E. App  */
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

  /*********/
  /* Avatar position */
  function handleUpdateAvatarPosition(avatarPosition) {
    // console.log("Loc", { x: avatarPosition["x_axis"], z: avatarPosition["y_axis"], r_code: avatarPosition["gameCode"] });
    io.to(avatarPosition["gameCode"]).emit('updateAvatarPosition', { x: avatarPosition["x_axis"], z: avatarPosition["y_axis"] })
  }

  /*********/
  /* Avatar direction */
  function handleUpdateAvatarDirection(avatarHeading) {
    // console.log("Direction", {angleValue: avatarHeading["x_axis"], r_code: avatarHeading["gameCode"] });
    io.to(avatarHeading["gameCode"]).emit('updateAvatarDirection', { angleValue: avatarHeading["x_axis"] })
  }

  /*********************/
  /* Helping functions */
  function printNumRoomMembers(roomName) {
    console.log("Num Room Members(new): ", io.sockets.adapter.rooms[roomName].length);
  }

  /*********************/
  /* disconnect */
  socket.on('disconnect', function () {
    console.log("Disonnection!!");
  });

});