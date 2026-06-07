const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// @route   GET /api/notifications/:userId
// @desc    Get all notifications for a user (sorted by most recent)
router.get('/:userId', async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.params.userId })
            .sort({ createdAt: -1 })
            .populate('sender', 'username')
            .limit(30);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server Error fetching notifications', error: error.message });
    }
});

// @route   POST /api/notifications
// @desc    Create a new notification manually (e.g. for non-websocket fallbacks)
router.post('/', async (req, res) => {
    try {
        const { recipient, sender, type, content } = req.body;
        if (!recipient || !type || !content) {
            return res.status(400).json({ message: 'Recipient, type, and content are required' });
        }
        const newNotification = new Notification({
            recipient,
            sender,
            type,
            content
        });
        const savedNotification = await newNotification.save();
        const populated = await savedNotification.populate('sender', 'username');
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Server Error creating notification', error: error.message });
    }
});

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark a specific notification as read
router.put('/:notificationId/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.notificationId,
            { isRead: true },
            { new: true }
        ).populate('sender', 'username');

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Server Error updating notification', error: error.message });
    }
});

// @route   PUT /api/notifications/user/:userId/read-all
// @desc    Mark all notifications for a user as read
router.put('/user/:userId/read-all', async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.params.userId, isRead: false },
            { isRead: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error marking all as read', error: error.message });
    }
});

// @route   DELETE /api/notifications/:notificationId
// @desc    Delete a specific notification
router.delete('/:notificationId', async (req, res) => {
    try {
        const deleted = await Notification.findByIdAndDelete(req.params.notificationId);
        if (!deleted) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error deleting notification', error: error.message });
    }
});

module.exports = router;
