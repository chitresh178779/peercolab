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

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        // Only exit process if it's the initial startup failure
        if (mongoose.connection.readyState !== 1) {
            process.exit(1); 
        }
    }
};

module.exports = connectDB;