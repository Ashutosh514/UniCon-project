    const mongoose = require('mongoose');

    const LostItemSchema = new mongoose.Schema({
        title: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
        },
        date: {
            type: String, // Storing as string for simplicity, can be Date type
            required: true,
        },
        reportedBy: {
            type: String,
            required: true,
        },
        userType: {
            type: String,
            required: true,
            enum: ['Student', 'Faculty'],
        },
        image: {
            type: String, // URL for the image
            default: '',
        },
        status: {
            type: String,
            required: true,
            enum: ['lost', 'found'],
        },
        contactEmail: {
            type: String,
            required: true,
        },
        contact: {
            type: String, // Phone number
            default: '',
        },
        userId: { // To track who posted the item for deletion logic
            type: String,
            required: true,
        },
        timestamp: {
            type: Number,
            default: Date.now,
        },
    });

    module.exports = mongoose.model('LostItem', LostItemSchema);
    