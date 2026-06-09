const webpush = require('web-push');

// Validate VAPID keys are present
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('WARNING: VAPID keys for push notifications are missing in environment variables.');
} else {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:support@peercolab.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

module.exports = webpush;
