/*
Notes:-
1. eventhough two objects are initialized 
*/
let app = require('express')();
let io = require('socket.io')(process.env.PORT || 3001);
// Rooms impl.
//const { makeid } = require('./utils');
const clientRooms = {};


console.log("Server Started");

io.on('connection', socket => {
  // Print
  console.log("Connection made!");
  //console.log("socket.id", socket.id);
  // Functions' declaration
  socket.on('newGame', handleNewGame);
  socket.on('joinGame', handleJoinGame);
  socket.on('updateAvatarPosition', handleUpdateAvatarPosition);
  socket.on('updateAvatarDirection', handleUpdateAvatarDirection);
  socket.on('checkRoomExistance', handleCheckRoomExistance);

  // Functions' definitions
  function handleNewGame(roomNameObj) {
    //let roomName = makeid(5);
    let roomName = roomNameObj["gameCode"];
    //let roomName = 'ss123';
    console.log("roomName : ", roomName, ", type: ", typeof(roomName));

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
    console.log("Direction", {angleValue: avatarHeading["x_axis"], r_code: avatarHeading["gameCode"] });
    io.to(avatarHeading["gameCode"]).emit('updateAvatarDirection', {angleValue: avatarHeading["x_axis"]})  
  }

  function handleCheckRoomExistance(roomNameObj) {
    let roomName = roomNameObj["gameCode"];
    // Check if room is created
    if(io.sockets.adapter.rooms[roomName]){
      //socket.join(roomName);
      //printNumRoomMembers(roomName); //Print number of members
      console.log("Info: Room exist!??");
      io.emit('checkRoomExistance', {RoomStatus: true})
    } else {
      console.log("Warning: Room doesn't exist!!!??");
      io.emit('checkRoomExistance', {RoomStatus: false})
    }
  }


  // Helping functions
  function printNumRoomMembers(roomName){
    console.log("Num Room Members(new): ", io.sockets.adapter.rooms[roomName].length);
  }

  socket.on('disconnect', function () {
    console.log("Disonnection!!");
  });


  // Multi-player impl.
  socket.on('player move', function(data) {
		//console.log('recv: move: '+JSON.stringify(data));
    io.emit('updateAvatarPosition', { x: data["position"][0], z: data["position"][2] })
		currentPlayer.position = data.position;

		//socket.broadcast.emit('player move', currentPlayer);
	});

  socket.on('player turn', function(data) {
		//console.log('recv: turn: '+JSON.stringify(data));
    io.emit('updateAvatarDirection', {angleValue: data["rotation"][1]})  
    currentPlayer.rotation = data.rotation;

		//socket.broadcast.emit('player turn', currentPlayer);
	});

});