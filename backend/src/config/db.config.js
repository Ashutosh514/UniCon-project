const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

/**
 * Connects to the MongoDB database using the URI from environment variables.
 * It handles the connection and logs success or failure.
 */
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully!');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        // Exit the process with failure
        process.exit(1);
    }
};

module.exports = connectDB;
