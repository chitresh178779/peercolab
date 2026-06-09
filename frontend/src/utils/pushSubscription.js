import axios from 'axios';
import { API_BASE_URL, VAPID_PUBLIC_KEY } from '../config';

// Helper function to convert the VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Registers Service Worker and subscribes the user to Push Notifications.
 * @param {string} userId - The ID of the authenticated user.
 */
export async function subscribeToPushNotifications(userId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications / Service Workers are not supported in this browser.');
        return;
    }

    try {
        // 1. Register the Service Worker (points to the /sw.js in public folder)
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully with scope:', registration.scope);

        // 2. Request notification permission if not already granted/denied
        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
            console.warn('Push notification permission denied by the user.');
            return;
        }

        // 3. Retrieve or create push subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            console.log('No existing push subscription found. Registering a new one...');
            const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey
            });
            console.log('Successfully generated new push subscription.');
        }

        // 4. Send subscription info to backend
        await axios.post(`${API_BASE_URL}/api/notifications/subscribe`, {
            userId,
            subscription
        });
        console.log('Push subscription successfully synchronized with the backend.');
    } catch (err) {
        console.error('Error setting up Web Push Notification client:', err);
    }
}
