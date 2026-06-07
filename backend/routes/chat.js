const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// @route   GET /api/chat/history/:userId/:friendId
// @desc    Get private message history between two users
router.get('/history/:userId/:friendId', async (req, res) => {
    try {
        const { userId, friendId } = req.params;
        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: friendId },
                { sender: friendId, recipient: userId }
            ],
            deletedForUsers: { $ne: userId }
        })
        .sort({ createdAt: 1 }) // Chronological order
        .populate('sender', 'username')
        .populate('recipient', 'username');
        
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server Error fetching messages', error: error.message });
    }
});

// @route   PUT /api/chat/message/:messageId/delete-me
// @desc    Delete message for the current user
router.put('/message/:messageId/delete-me', async (req, res) => {
    try {
        const { userId } = req.body;
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (!message.deletedForUsers.includes(userId)) {
            message.deletedForUsers.push(userId);
            await message.save();
        }

        res.json({ success: true, messageId: message._id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error deleting message', error: error.message });
    }
});

// @route   PUT /api/chat/message/:messageId/delete-everyone
// @desc    Delete message for everyone (only by sender)
router.put('/message/:messageId/delete-everyone', async (req, res) => {
    try {
        const { userId } = req.body;
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (message.sender.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized: Only sender can delete for everyone' });
        }

        message.isDeletedForEveryone = true;
        await message.save();

        // Broadcast to both users via socket.io
        const io = req.app.get('socketio');
        const activeUsers = req.app.get('activeUsers');
        if (io && activeUsers) {
            // Send to recipient
            const recipientSocketId = activeUsers[message.recipient.toString()];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('message_deleted', { messageId: message._id });
            }
            // Send to sender
            const senderSocketId = activeUsers[message.sender.toString()];
            if (senderSocketId) {
                io.to(senderSocketId).emit('message_deleted', { messageId: message._id });
            }
        }

        res.json({ success: true, messageId: message._id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error deleting message for everyone', error: error.message });
    }
});

module.exports = router;
