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

// Post-save hook to dispatch Web Push Notifications
NotificationSchema.post('save', async function(doc) {
    try {
        const User = mongoose.model('User');
        const recipientUser = await User.findById(doc.recipient);
        if (!recipientUser || !recipientUser.pushSubscriptions || recipientUser.pushSubscriptions.length === 0) {
            return;
        }

        const webpush = require('../config/webPush');
        
        // Define payload structure
        const payload = JSON.stringify({
            title: 'PeerColab',
            body: doc.content,
            data: {
                url: '/',
                type: doc.type,
                notificationId: doc._id
            }
        });

        // Dispatch to all registered push subscriptions (e.g. mobile, desktop)
        const sendPromises = recipientUser.pushSubscriptions.map(async (subscription) => {
            try {
                await webpush.sendNotification(subscription, payload);
            } catch (err) {
                // If subscription has expired or is invalid (410 Gone / 404), clean it up
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`Removing expired/invalid push subscription for user ${doc.recipient}`);
                    await User.findByIdAndUpdate(doc.recipient, {
                        $pull: { pushSubscriptions: { endpoint: subscription.endpoint } }
                    });
                } else {
                    console.error('Error sending push notification:', err.message);
                }
            }
        });

        await Promise.all(sendPromises);
    } catch (err) {
        console.error('Error in Notification post-save push sender:', err);
    }
});

module.exports = mongoose.model('Notification', NotificationSchema);
