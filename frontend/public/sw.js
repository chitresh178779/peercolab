// Service Worker for PeerColab Push Notifications

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { body: event.data.text() };
        }
    }

    const title = data.title || 'PeerColab';
    const options = {
        body: data.body || 'You have a new update!',
        icon: '/favicon.svg', // Will resolve to the site's favicon
        badge: '/favicon.svg',
        vibrate: [100, 50, 100],
        data: {
            url: data.data?.url || '/',
            notificationId: data.data?.notificationId
        },
        actions: [
            { action: 'open', title: 'Open App' }
        ]
    };

    // Always display the system notification to prevent the browser (especially Chrome on Android)
    // from force-showing a generic "This site has been updated in the background" alert.
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        // Check if there is already a window open
        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.includes(targetUrl) && 'focus' in client) {
                return client.focus();
            }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
            return clients.openWindow(targetUrl);
        }
    });

    event.waitUntil(promiseChain);
});
