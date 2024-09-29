const express = require("express");
const app = express();
const path = require("path");
const indexRouter = require("./router/index-router");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use("/", indexRouter);

const http = require("http");
const socketIO = require("socket.io");
const server = http.createServer(app);
const io = socketIO(server);

let rooms = {}; // To track users in each room

io.on('connection', (socket) => {
    console.log(`New user connected: ${socket.id}`);

    // When user joins a room
    socket.on('joinroom', () => {
        let room = `room-${Math.floor(Math.random() * 10000)}`; // Assign random room name
        socket.join(room);
        rooms[socket.id] = room;
        socket.emit('joined', room);
    });

    // Handle video call request
    socket.on('startVideoCall', ({ room }) => {
        console.log(`Call request from ${socket.id} in room: ${room}`);
        // Broadcast to all users in the room that a call is incoming
        socket.to(room).emit('incomingCall');
    });

    // Accepting a video call
    socket.on('acceptCall', ({ room }) => {
        console.log(`${socket.id} accepted the call in room: ${room}`);
        // Notify the caller that the call is accepted
        socket.to(room).emit('callAccepted');
    });

    // Denying a video call
    socket.on('denyCall', ({ room }) => {
        console.log(`${socket.id} denied the call in room: ${room}`);
        // Notify the caller that the call was denied
        socket.to(room).emit('callDenied');
    });

    // Handle signaling messages (offer, answer, ICE candidates)
    socket.on('signalingMessage', ({ room, message }) => {
        console.log(`Signaling message from ${socket.id} in room ${room}: ${message}`);
        // Forward the message to the other users in the room
        socket.to(room).emit('signalingMessage', message);
    });

    // Handle message event (chat message)
    socket.on('msg', ({ room, msg }) => {
        console.log(`Message from ${socket.id}: ${msg} in room: ${room}`);
        socket.to(room).emit('message', msg);
    });

    // When a user disconnects
    socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`);
        // Remove user from room
        let room = rooms[socket.id];
        if (room) {
            socket.leave(room);
            delete rooms[socket.id];
        }
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`http://localhost:${port}`);
});
