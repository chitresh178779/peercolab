const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: ['chat', 'task_completed', 'friend_added', 'task_assigned', 'inactivity'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
