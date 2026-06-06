const http = require('http');
const https = require('https');

const selfPing = () => {
    const url = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;

    if (!url) {
        console.log('Self-ping disabled: No RENDER_EXTERNAL_URL or BACKEND_URL provided.');
        return;
    }

    const targetUrl = `${url.replace(/\/$/, '')}/api/status`;
    console.log(`Self-ping initialized for: ${targetUrl}`);

    const client = targetUrl.startsWith('https') ? https : http;

    // Ping every 14 minutes (14 * 60 * 1000 ms)
    setInterval(() => {
        client.get(targetUrl, (res) => {
            console.log(`Self-ping success: status ${res.statusCode}`);
        }).on('error', (err) => {
            console.error('Self-ping failed:', err.message);
        });
    }, 14 * 60 * 1000);
};

module.exports = selfPing;
