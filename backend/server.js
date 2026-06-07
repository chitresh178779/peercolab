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
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));

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

// Save socket instance for use in routes
app.set('socketio', io);
const activeUsers = {};
app.set('activeUsers', activeUsers);

// WebSocket Connection Logic
io.on('connection', (socket) => {
    console.log(`User Connected via WebSocket: ${socket.id}`);

    // Register user to socket ID mapping and update presence
    socket.on('register_user', async (userId) => {
        if (userId) {
            activeUsers[userId] = socket.id;
            console.log(`User registered: ${userId} with socket ${socket.id}`);
            try {
                const User = require('./models/User');
                await User.findByIdAndUpdate(userId, { lastActive: new Date() });
            } catch (err) {
                console.error('Error updating presence lastActive:', err.message);
            }
        }
    });

    // Listen for direct messages
    socket.on('send_direct_message', async (data) => {
        try {
            const Message = require('./models/Message');
            const User = require('./models/User');
            const Notification = require('./models/Notification');
            
            const { senderId, recipientId, content } = data;
            if (!senderId || !recipientId || !content) return;

            const msg = new Message({ sender: senderId, recipient: recipientId, content });
            await msg.save();
            const populatedMsg = await msg.populate([
                { path: 'sender', select: 'username' },
                { path: 'recipient', select: 'username' }
            ]);

            // Emit to sender
            socket.emit('receive_direct_message', populatedMsg);

            // Emit to recipient if online
            const recipientSocketId = activeUsers[recipientId];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('receive_direct_message', populatedMsg);
            }

            // Create persistent notification for recipient
            const senderUser = await User.findById(senderId);
            const notification = new Notification({
                recipient: recipientId,
                sender: senderId,
                type: 'chat',
                content: `${senderUser.username} sent you a message: "${content.substring(0, 35)}${content.length > 35 ? '...' : ''}"`
            });
            await notification.save();

            if (recipientSocketId) {
                const populatedNotif = await notification.populate('sender', 'username');
                io.to(recipientSocketId).emit('new_notification', populatedNotif);
            }
        } catch (err) {
            console.error('Error in send_direct_message:', err);
        }
    });

    // Listen for peer typing activity
    socket.on('typing', (data) => {
        const { senderId, recipientId, isTyping } = data;
        if (!senderId || !recipientId) return;

        const recipientSocketId = activeUsers[recipientId];
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('receive_typing', { senderId, isTyping });
        }
    });

    // Listen for a task completion from one user
    socket.on('task_completed', async (data) => {
        console.log('Task completed event received:', data);
        const { friendId, friendName, subjectName, taskTitle, subjectId } = data;
        
        // Broadcast the update to all other connected clients
        socket.broadcast.emit('friend_activity', data); 

        // Create persistent notification for all friends and collaborators
        try {
            const User = require('./models/User');
            const Notification = require('./models/Notification');
            const Subject = require('./models/Subject');
            
            // Set of user IDs to notify to prevent duplicates
            const recipients = new Set();

            // 1. Notify friends
            const user = await User.findById(friendId);
            if (user && user.friends) {
                user.friends.forEach(fId => {
                    if (fId.toString() !== friendId.toString()) {
                        recipients.add(fId.toString());
                    }
                });
            }

            // 2. Notify collaborators and owner if the subject is shared
            if (subjectId) {
                const subject = await Subject.findById(subjectId);
                if (subject) {
                    if (subject.owner && subject.owner.toString() !== friendId.toString()) {
                        recipients.add(subject.owner.toString());
                    }
                    if (subject.collaborators) {
                        subject.collaborators.forEach(cId => {
                            if (cId.toString() !== friendId.toString()) {
                                recipients.add(cId.toString());
                            }
                        });
                    }
                }
            }

            // Send notifications to all recipients
            for (const recipientId of recipients) {
                const notification = new Notification({
                    recipient: recipientId,
                    sender: friendId,
                    type: 'task_completed',
                    content: `${friendName} completed "${taskTitle}" in "${subjectName}"`
                });
                await notification.save();
                
                const friendSocketId = activeUsers[recipientId];
                if (friendSocketId) {
                    const populatedNotif = await notification.populate('sender', 'username');
                    io.to(friendSocketId).emit('new_notification', populatedNotif);
                }
            }
        } catch (err) {
            console.error('Error in task_completed notification save:', err);
        }
    });

    socket.on('disconnect', () => {
        for (const [userId, socketId] of Object.entries(activeUsers)) {
            if (socketId === socket.id) {
                delete activeUsers[userId];
                break;
            }
        }
        console.log('User Disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Inactivity check background task (Duo-style check)
    const runInactivityCheck = async () => {
        try {
            console.log('Running background user inactivity check...');
            const User = require('./models/User');
            const Notification = require('./models/Notification');
            
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            // Find users whose lastActive is older than 24 hours
            const inactiveUsersList = await User.find({
                lastActive: { $lt: twentyFourHoursAgo }
            });
            
            for (const user of inactiveUsersList) {
                // Check if they already have an inactivity notification in the last 24 hours
                const recentNotif = await Notification.findOne({
                    recipient: user._id,
                    type: 'inactivity',
                    createdAt: { $gte: twentyFourHoursAgo }
                });
                
                if (!recentNotif) {
                    const notification = new Notification({
                        recipient: user._id,
                        sender: user._id, // Self-sent system warning
                        type: 'inactivity',
                        content: '🔥 Keep your study streak alive! You haven\'t checked in for 24 hours. Let\'s finish some tasks today!'
                    });
                    await notification.save();
                    
                    // If active user socket matches, emit alert
                    const recipientSocketId = activeUsers[user._id.toString()];
                    if (recipientSocketId) {
                        const populatedNotif = await notification.populate('sender', 'username');
                        io.to(recipientSocketId).emit('new_notification', populatedNotif);
                    }
                }
            }
        } catch (err) {
            console.error('Error running inactivity background check:', err);
        }
    };

    // Run 5 seconds after startup, then every 1 hour
    setTimeout(runInactivityCheck, 5000);
    setInterval(runInactivityCheck, 60 * 60 * 1000);
});