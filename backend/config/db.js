const mongoose = require('mongoose');

const connectDB = async () => {
    // Check if we already have an active connection
    if (mongoose.connection.readyState === 1) {
        console.log('MongoDB is already connected.');
        return;
    }
    
    // Check if a connection is currently in progress
    if (mongoose.connection.readyState === 2) {
        console.log('MongoDB connection is already in progress...');
        return;
    }

    const uris = [
        process.env.MONGO_URI,
        'mongodb://127.0.0.1:27017/peercolab'
    ];

    for (let i = 0; i < uris.length; i++) {
        const uri = uris[i];
        if (!uri) continue;

        try {
            console.log(`Attempting connection to MongoDB (${i === 0 ? 'Primary' : 'Local Fallback'})...`);
            const conn = await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 4000, // Timeout after 4s
            });
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return; // connection successful
        } catch (error) {
            console.error(`Error connecting to MongoDB: ${error.message}`);
        }
    }

    console.error('All MongoDB connection attempts failed.');
    process.exit(1);
};

module.exports = connectDB;