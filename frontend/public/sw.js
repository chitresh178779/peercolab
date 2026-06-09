// Service Worker for PeerColab Push Notifications

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

    // Check if any clients (app windows) are currently open and focused
    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        let isFocused = false;
        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.focused) {
                isFocused = true;
                break;
            }
        }

        // Only show the system notification if the app is NOT in focus
        if (!isFocused) {
            return self.registration.showNotification(title, options);
        }
    });

    event.waitUntil(promiseChain);
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
