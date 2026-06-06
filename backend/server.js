require('dotenv').config(); // Loads the variables from .env
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const selfPing = require('./config/selfPing');

// Connect to the database
connectDB();

// Start self-pinging to prevent Render service from sleeping
selfPing();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

app.use('/api/users',require('./routes/users'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/quotes', require('./routes/quotes'));
// A simple test route to verify the API is running
app.get('/api/status', (req, res) => {
    res.json({ message: 'Backend is up and running!' });
});

// Create HTTP server to share between Express and Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    }
});

// WebSocket Connection Logic
io.on('connection', (socket) => {
    console.log(`User Connected via WebSocket: ${socket.id}`);

    // Listen for a task completion from one user
    socket.on('task_completed', (data) => {
        console.log('Task completed event received:', data);
        // Broadcast the update to all other connected clients
        socket.broadcast.emit('friend_activity', data); 
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});